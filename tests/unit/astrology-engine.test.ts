import { describe, expect, it } from "vitest";
import {
  MakeTime,
  Seasons,
  SiderealTime,
  Spherical,
  VectorFromSphere,
  RotateVector,
  Rotation_ECT_EQD,
  EquatorFromVector,
  Horizon,
  Observer,
} from "astronomy-engine";
import {
  computeConservativeDateOnly,
  computeCurrentSky,
  computeNatalChart,
  computeTransits,
  trueNodeLongitude,
} from "@/domain/astrology/engine";
import {
  computeAngles,
  housesWithFallback,
  houseOf,
  meanObliquity,
  placidusHouses,
  ramcOf,
  wholeSignHouses,
  PlacidusUndefinedError,
} from "@/domain/astrology/houses";
import { normalizeDegrees, signOf, separation } from "@/domain/astrology/zodiac";

const angleInputs = (utc: Date, lat: number, lon: number) => ({
  gastHours: SiderealTime(MakeTime(utc)),
  latitude: lat,
  longitude: lon,
  epsilon: meanObliquity(utc),
});

/** Independent numeric check: altitude/azimuth of an ecliptic point. */
function altAzOfEclipticPoint(utc: Date, lat: number, lon: number, eclLon: number) {
  const t = MakeTime(utc);
  const vecEct = VectorFromSphere(new Spherical(0, eclLon, 1), t);
  const eq = EquatorFromVector(RotateVector(Rotation_ECT_EQD(t), vecEct));
  const hor = Horizon(t, new Observer(lat, lon, 0), eq.ra, eq.dec);
  return { alt: hor.altitude, az: hor.azimuth, raDeg: eq.ra * 15 };
}

describe("solar longitude against independent season search", () => {
  it("is 0/90/180/270 at the 2026 equinoxes and solstices", () => {
    const seasons = Seasons(2026);
    const cases: Array<[Date, number]> = [
      [seasons.mar_equinox.date, 0],
      [seasons.jun_solstice.date, 90],
      [seasons.sep_equinox.date, 180],
      [seasons.dec_solstice.date, 270],
    ];
    for (const [instant, expected] of cases) {
      const sky = computeCurrentSky(instant);
      const sun = sky.bodies.find((b) => b.body === "sun")!;
      expect(separation(sun.longitude, expected)).toBeLessThan(0.01);
    }
  });
});

describe("current sky fixture — 2026-08-27T00:00Z (verified against the real sky)", () => {
  const sky = computeCurrentSky(new Date("2026-08-27T00:00:00Z"));
  const body = (id: string) => sky.bodies.find((b) => b.body === id)!;

  it("pins planetary longitudes", () => {
    expect(body("sun").longitude).toBeCloseTo(153.763, 2); // 3°46′ Virgo
    expect(body("moon").longitude).toBeCloseTo(320.006, 2); // 20° Aquarius
    expect(body("uranus").longitude).toBeCloseTo(65.6, 1); // early Gemini
    expect(body("neptune").longitude).toBeCloseTo(3.79, 1); // early Aries
    expect(body("pluto").longitude).toBeCloseTo(303.61, 1); // early Aquarius
    expect(body("north_node").longitude).toBeCloseTo(329.84, 1); // 29°50′ Aquarius
  });

  it("derives signs, decans, and season", () => {
    expect(body("sun").sign).toBe("virgo");
    expect(body("sun").decan).toBe(1);
    expect(sky.sunSeason).toEqual({ sign: "virgo", decan: 1 });
    expect(body("moon").sign).toBe("aquarius");
  });

  it("computes lunar state near the Aug 28 full moon", () => {
    expect(sky.lunar.phaseAngle).toBeGreaterThan(160);
    expect(sky.lunar.phaseAngle).toBeLessThan(180);
    expect(sky.lunar.waxing).toBe(true);
    expect(sky.lunar.illuminationFraction).toBeGreaterThan(0.95);
  });

  it("finds the exact Sun–Neptune quincunx of that day", () => {
    const hit = sky.aspects.find(
      (a) =>
        a.type === "quincunx" &&
        [a.a, a.b].includes("sun") &&
        [a.a, a.b].includes("neptune"),
    );
    expect(hit).toBeDefined();
    expect(hit!.orb).toBeLessThan(0.1);
  });

  it("mercury moves direct at ~2°/day at this instant", () => {
    expect(body("mercury").speed).toBeGreaterThan(1.5);
    expect(body("mercury").retrograde).toBe(false);
  });

  it("the true node moves slowly (its wobble can be briefly direct)", () => {
    // The true node oscillates around a mean retrograde drift of ~0.053°/day;
    // instantaneous speed may be slightly positive. Net drift is asserted in
    // the ingress test below.
    expect(Math.abs(body("north_node").speed)).toBeLessThan(0.5);
  });

  it("element/modality balances count the ten planets", () => {
    const elementTotal = Object.values(sky.elementBalance).reduce((a, b) => a + b, 0);
    const modalityTotal = Object.values(sky.modalityBalance).reduce((a, b) => a + b, 0);
    expect(elementTotal).toBe(10);
    expect(modalityTotal).toBe(10);
  });
});

describe("angles cross-validated against numeric horizon search", () => {
  const cases: Array<[string, number, number]> = [
    ["2000-01-01T12:00:00Z", 51.48, 0],
    ["2026-08-27T03:14:00Z", 40.71, -74.01],
    ["1992-05-17T12:30:00Z", 48.86, 2.35],
    ["1985-11-03T22:10:00Z", -33.87, 151.21], // southern hemisphere
  ];

  it("ascendant sits on the eastern horizon; MC's RA equals the RAMC", () => {
    for (const [iso, lat, lon] of cases) {
      const utc = new Date(iso);
      const inputs = angleInputs(utc, lat, lon);
      const angles = computeAngles(inputs);
      const asc = altAzOfEclipticPoint(utc, lat, lon, angles.asc);
      expect(Math.abs(asc.alt), `${iso} asc altitude`).toBeLessThan(0.05);
      expect(asc.az, `${iso} asc azimuth east`).toBeGreaterThan(0);
      expect(asc.az, `${iso} asc azimuth east`).toBeLessThan(180);
      const mc = altAzOfEclipticPoint(utc, lat, lon, angles.mc);
      expect(separation(mc.raDeg, ramcOf(inputs)), `${iso} mc ra`).toBeLessThan(0.01);
    }
  });
});

describe("Placidus houses", () => {
  const utc = new Date("1992-05-17T12:30:00Z");
  const inputs = angleInputs(utc, 48.86, 2.35);
  const houses = placidusHouses(inputs);
  const angles = computeAngles(inputs);

  it("anchors the angular cusps to ASC/IC/DSC/MC", () => {
    expect(houses.cusps[0]).toBeCloseTo(angles.asc, 6);
    expect(houses.cusps[3]).toBeCloseTo(angles.ic, 6);
    expect(houses.cusps[6]).toBeCloseTo(angles.dsc, 6);
    expect(houses.cusps[9]).toBeCloseTo(angles.mc, 6);
  });

  it("orders cusps zodiacally with arcs summing to 360", () => {
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const arc = normalizeDegrees(houses.cusps[(i + 1) % 12]! - houses.cusps[i]!);
      expect(arc).toBeGreaterThan(0);
      expect(arc).toBeLessThan(180);
      total += arc;
    }
    expect(total).toBeCloseTo(360, 6);
  });

  it("keeps opposite cusps exactly opposed", () => {
    for (let i = 0; i < 6; i++) {
      expect(
        separation(houses.cusps[i]!, normalizeDegrees(houses.cusps[i + 6]! + 180)),
      ).toBeLessThan(1e-6);
    }
  });

  it("satisfies the Placidus semi-arc property for cusp 11", () => {
    // The 11th cusp's meridian distance east equals one third of its own
    // semi-diurnal arc: RA − RAMC = (90 + AD)/3.
    const DEG = Math.PI / 180;
    const lambda = houses.cusps[10]!;
    const delta =
      Math.asin(Math.sin(inputs.epsilon * DEG) * Math.sin(lambda * DEG)) / DEG;
    const ad =
      Math.asin(Math.tan(inputs.latitude * DEG) * Math.tan(delta * DEG)) / DEG;
    const ra =
      Math.atan2(
        Math.sin(lambda * DEG) * Math.cos(inputs.epsilon * DEG),
        Math.cos(lambda * DEG),
      ) / DEG;
    const md = normalizeDegrees(ra - ramcOf(inputs));
    expect(md).toBeCloseTo((90 + ad) / 3, 4);
  });

  it("matches the verified 1992 Paris fixture", () => {
    expect(angles.asc).toBeCloseTo(162.04, 1); // 12° Virgo rising
    expect(angles.mc).toBeCloseTo(67.13, 1); // 7° Gemini midheaven
  });
});

describe("high-latitude fallback", () => {
  it("Placidus fails at Longyearbyen and falls back to Whole Sign", () => {
    const utc = new Date("2026-06-01T12:00:00Z");
    const inputs = angleInputs(utc, 78.22, 15.64);
    expect(() => placidusHouses(inputs)).toThrow(PlacidusUndefinedError);
    const { houses } = housesWithFallback(inputs);
    expect(houses.system).toBe("whole_sign");
    expect(houses.fallbackReason).toContain("Placidus");
  });

  it("whole sign cusps are the twelve sign boundaries from the rising sign", () => {
    const houses = wholeSignHouses(162.04); // Virgo rising
    expect(houses.cusps[0]).toBe(150);
    expect(houses.cusps[11]).toBe(120);
    expect(houses.cusps.every((c) => c % 30 === 0)).toBe(true);
  });
});

describe("houseOf", () => {
  it("assigns longitudes to the correct house across the 0° boundary", () => {
    const houses = wholeSignHouses(350); // Pisces rising: cusp1 = 330
    expect(houseOf(335, houses)).toBe(1);
    expect(houseOf(5, houses)).toBe(2); // Aries = 2nd house
    expect(houseOf(329, houses)).toBe(12);
  });
});

describe("natal chart — 1992-05-17T12:30Z Paris", () => {
  const chart = computeNatalChart(new Date("1992-05-17T12:30:00Z"), {
    lat: 48.86,
    lon: 2.35,
  });

  it("computes the verified positions and derived structure", () => {
    const sun = chart.bodies.find((b) => b.body === "sun")!;
    const moon = chart.bodies.find((b) => b.body === "moon")!;
    expect(sun.longitude).toBeCloseTo(56.84, 1); // 26°50′ Taurus
    expect(sun.sign).toBe("taurus");
    expect(moon.sign).toBe("sagittarius");
    expect(chart.chartRulerSign).toBe("virgo");
    expect(chart.houses.system).toBe("placidus");
    expect(
      chart.housePlacements.find((p) => p.body === "sun")!.house,
    ).toBe(9);
  });

  it("includes angle aspects with widened orbs", () => {
    for (const aspect of chart.aspects) {
      // Max natal allowance: 8 base + 1.5 luminary + 1 angle = 10.5.
      expect(aspect.orb).toBeLessThanOrEqual(10.5);
    }
    expect(chart.aspects.some((a) => a.a === "asc" || a.b === "asc" || a.a === "mc" || a.b === "mc")).toBe(true);
  });
});

describe("conservative date-only profiles (§10.4)", () => {
  it("keeps stable sign placements and omits the Moon for 1992-05-17", () => {
    const profile = computeConservativeDateOnly(1992, 5, 17);
    expect(profile.kind).toBe("date_only");
    const stable = Object.fromEntries(
      profile.stablePlacements.map((s) => [s.body, s.sign]),
    );
    expect(stable["sun"]).toBe("taurus");
    expect(stable["mars"]).toBe("aries");
    expect(stable["saturn"]).toBe("aquarius");
    expect(stable["pluto"]).toBe("scorpio");
    expect(profile.omittedBodies).toContain("moon");
  });

  it("omits the Sun on a sign-cusp birthday", () => {
    const profile = computeConservativeDateOnly(1990, 8, 23);
    expect(profile.omittedBodies).toContain("sun");
    expect(profile.stablePlacements.some((s) => s.body === "sun")).toBe(false);
  });

  it("narrows the envelope with a known birthplace timezone", () => {
    const profile = computeConservativeDateOnly(1992, 5, 17, "Europe/Paris");
    expect(profile.kind).toBe("date_and_place");
    expect(profile.envelope.startUtc).toBe("1992-05-16T22:00:00.000Z");
    expect(profile.envelope.endUtc).toBe("1992-05-17T22:00:00.000Z");
    expect(profile.omittedBodies).toContain("moon");
  });
});

describe("transits", () => {
  it("finds only in-orb transit hits against legitimate natal factors", () => {
    const natal = computeNatalChart(new Date("1992-05-17T12:30:00Z"), {
      lat: 48.86,
      lon: 2.35,
    });
    const sky = computeCurrentSky(new Date("2026-08-27T00:00:00Z"));
    const hits = computeTransits(sky, natal);
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      const cap = hit.transitingBody === "moon" ? 1.5 : 3;
      expect(hit.orb).toBeLessThanOrEqual(cap);
    }
  });
});

describe("true node sanity", () => {
  it("moves retrograde and matches the Pisces→Aquarius ingress window", () => {
    // The true node oscillates ±1.75° around the mean node, so compare well
    // clear of the late-August 2026 ingress.
    const before = trueNodeLongitude(new Date("2026-03-01T00:00:00Z"));
    const after = trueNodeLongitude(new Date("2026-10-15T00:00:00Z"));
    expect(signOf(before)).toBe("pisces");
    expect(signOf(after)).toBe("aquarius");
    expect(before).toBeGreaterThan(after); // retrograde drift over the year
  });
});
