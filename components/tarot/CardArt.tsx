import { getCard } from "@/data/tarot/cards";
import { correspondencesFor } from "@/data/correspondences/graph";
import type { TarotCardDefinition } from "@/domain/tarot/types";

/**
 * "Celestial Prototype" deck (spec §27, ADR 0007): deterministic inline SVG
 * generated from the canonical card definition — geometric motifs, Roman
 * numerals, drawn suit emblems, and astrological glyphs where a class A/B
 * attribution exists. No raster assets; presentation is replaceable without
 * touching card identity (DeckTheme abstraction).
 */

export const DECK_THEME_ID = "celestial_prototype";
export const DECK_THEME_VERSION = "1.0";

const ROMAN = [
  "0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI",
];

const ASTRO_GLYPHS: Record<string, string> = {
  "sign:aries": "♈", "sign:taurus": "♉", "sign:gemini": "♊", "sign:cancer": "♋",
  "sign:leo": "♌", "sign:virgo": "♍", "sign:libra": "♎", "sign:scorpio": "♏",
  "sign:sagittarius": "♐", "sign:capricorn": "♑", "sign:aquarius": "♒", "sign:pisces": "♓",
  "planet:sun": "☉", "planet:moon": "☽", "planet:mercury": "☿", "planet:venus": "♀",
  "planet:mars": "♂", "planet:jupiter": "♃", "planet:saturn": "♄",
  "planet:uranus": "♅", "planet:neptune": "♆", "planet:pluto": "♇",
};

function hashSeed(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

function seededPoints(seed: number, count: number, w: number, h: number) {
  const points: Array<{ x: number; y: number; r: number }> = [];
  let state = seed || 1;
  const next = () => {
    state = (state * 1103515245 + 12345) >>> 0;
    return state / 0xffffffff;
  };
  for (let i = 0; i < count; i++) {
    points.push({
      x: 10 + next() * (w - 20),
      y: 12 + next() * (h - 44),
      r: 0.5 + next() * 1.1,
    });
  }
  return points;
}

function astroGlyphFor(card: TarotCardDefinition): string | null {
  for (const rec of correspondencesFor(`card:${card.id}`)) {
    if (rec.relationshipType === "attributed_to" && ASTRO_GLYPHS[rec.targetConceptId]) {
      return ASTRO_GLYPHS[rec.targetConceptId]!;
    }
    if (rec.relationshipType === "court_sign" && ASTRO_GLYPHS[rec.targetConceptId]) {
      return ASTRO_GLYPHS[rec.targetConceptId]!;
    }
  }
  return null;
}

const GOLD = "#c9b37e";
const LAVENDER = "#a78fd4";
const INK = "#141021";
const LINE = "#3a3150";

function ElementMark({ element, x, y, size }: { element: string; x: number; y: number; size: number }) {
  const half = size / 2;
  const up = element === "fire" || element === "air";
  const points = up
    ? `${x},${y - half} ${x - half},${y + half} ${x + half},${y + half}`
    : `${x},${y + half} ${x - half},${y - half} ${x + half},${y - half}`;
  const barred = element === "air" || element === "earth";
  return (
    <g stroke={GOLD} strokeWidth="1" fill="none">
      <polygon points={points} />
      {barred && <line x1={x - half * 0.8} y1={y + (up ? half * 0.35 : -half * 0.35)} x2={x + half * 0.8} y2={y + (up ? half * 0.35 : -half * 0.35)} />}
    </g>
  );
}

function SuitEmblem({ suit, x, y, s }: { suit: string; x: number; y: number; s: number }) {
  const stroke = LAVENDER;
  switch (suit) {
    case "wands":
      return (
        <g stroke={stroke} strokeWidth="1.4" fill="none" strokeLinecap="round">
          <line x1={x} y1={y - s} x2={x} y2={y + s} />
          <path d={`M ${x} ${y - s} L ${x - s * 0.28} ${y - s * 0.55} M ${x} ${y - s} L ${x + s * 0.28} ${y - s * 0.55}`} />
        </g>
      );
    case "cups":
      return (
        <g stroke={stroke} strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d={`M ${x - s * 0.7} ${y - s * 0.5} A ${s * 0.7} ${s * 0.75} 0 0 0 ${x + s * 0.7} ${y - s * 0.5}`} />
          <line x1={x} y1={y + s * 0.25} x2={x} y2={y + s * 0.7} />
          <line x1={x - s * 0.45} y1={y + s * 0.75} x2={x + s * 0.45} y2={y + s * 0.75} />
        </g>
      );
    case "swords":
      return (
        <g stroke={stroke} strokeWidth="1.4" fill="none" strokeLinecap="round">
          <line x1={x} y1={y - s} x2={x} y2={y + s * 0.8} />
          <line x1={x - s * 0.5} y1={y + s * 0.35} x2={x + s * 0.5} y2={y + s * 0.35} />
          <path d={`M ${x - s * 0.14} ${y - s * 0.7} L ${x} ${y - s} L ${x + s * 0.14} ${y - s * 0.7}`} />
        </g>
      );
    default: // pentacles
      return (
        <g stroke={stroke} strokeWidth="1.2" fill="none">
          <circle cx={x} cy={y} r={s * 0.85} />
          <path
            d={pentagramPath(x, y, s * 0.62)}
            strokeLinejoin="round"
          />
        </g>
      );
  }
}

function pentagramPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

const RANK_LABEL: Record<string, string> = {
  ace: "ACE", two: "II", three: "III", four: "IV", five: "V", six: "VI",
  seven: "VII", eight: "VIII", nine: "IX", ten: "X",
  page: "PAGE", knight: "KNIGHT", queen: "QUEEN", king: "KING",
};

export function CardArt({ cardId }: { cardId: string }) {
  const card = getCard(cardId);
  const W = 120;
  const H = 200;
  const seed = hashSeed(card.id);
  const stars = seededPoints(seed, 14, W, H);
  const glyph = astroGlyphFor(card);

  const header =
    card.arcana === "major" ? ROMAN[card.number] : RANK_LABEL[card.rank ?? "ace"];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={`bg_${card.id}`} cx="50%" cy="30%" r="90%">
          <stop offset="0%" stopColor="#221c33" />
          <stop offset="100%" stopColor={INK} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#bg_${card.id})`} />
      <rect x="4" y="4" width={W - 8} height={H - 8} fill="none" stroke={LINE} strokeWidth="1" rx="6" />
      <rect x="8" y="8" width={W - 16} height={H - 16} fill="none" stroke={GOLD} strokeWidth="0.5" opacity="0.65" rx="4" />

      {stars.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#efe8d8" opacity={0.25 + (i % 4) * 0.12} />
      ))}

      <text
        x={W / 2}
        y={26}
        textAnchor="middle"
        fill={GOLD}
        fontSize="12"
        letterSpacing="2"
        fontFamily="Iowan Old Style, Palatino, Georgia, serif"
      >
        {header}
      </text>

      {/* Central emblem */}
      {card.arcana === "major" ? (
        <>
          <circle cx={W / 2} cy={H / 2 - 6} r={30} fill="none" stroke={LINE} strokeWidth="1" />
          <circle cx={W / 2} cy={H / 2 - 6} r={23} fill="none" stroke={GOLD} strokeWidth="0.5" opacity="0.7" />
          {glyph ? (
            <text
              x={W / 2}
              y={H / 2 + 5}
              textAnchor="middle"
              fill={LAVENDER}
              fontSize="30"
              fontFamily="Iowan Old Style, Palatino, Georgia, serif"
            >
              {glyph + "\uFE0E"}
            </text>
          ) : (
            card.element && (
              <ElementMark element={card.element} x={W / 2} y={H / 2 - 6} size={26} />
            )
          )}
        </>
      ) : (
        <>
          <SuitEmblem suit={card.suit ?? "wands"} x={W / 2} y={H / 2 - 8} s={26} />
          {glyph && (
            <text
              x={W / 2}
              y={H / 2 + 44}
              textAnchor="middle"
              fill={GOLD}
              fontSize="14"
              fontFamily="Iowan Old Style, Palatino, Georgia, serif"
            >
              {glyph + "\uFE0E"}
            </text>
          )}
          {card.numerologyNumber !== null && card.numerologyNumber >= 2 && card.numerologyNumber <= 10 && (
            <g fill={GOLD} opacity="0.8">
              {Array.from({ length: card.numerologyNumber }, (_, i) => {
                const perRow = 5;
                const row = Math.floor(i / perRow);
                const inRow = Math.min(card.numerologyNumber! - row * perRow, perRow);
                const col = i % perRow;
                const rowY = H / 2 + 34 + row * 10;
                const startX = W / 2 - ((inRow - 1) * 10) / 2;
                return <circle key={i} cx={startX + col * 10} cy={rowY} r={2} />;
              })}
            </g>
          )}
        </>
      )}

      <text
        x={W / 2}
        y={H - 18}
        textAnchor="middle"
        fill="#ece7dc"
        fontSize={card.canonicalName.length > 18 ? 8 : 9.5}
        letterSpacing="1"
        fontFamily="Iowan Old Style, Palatino, Georgia, serif"
      >
        {card.canonicalName.toUpperCase()}
      </text>
    </svg>
  );
}

export function CardBack() {
  const W = 120;
  const H = 200;
  const stars = seededPoints(20260827, 22, W, H);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={INK} />
      <rect x="4" y="4" width={W - 8} height={H - 8} fill="none" stroke={LINE} strokeWidth="1" rx="6" />
      <rect x="9" y="9" width={W - 18} height={H - 18} fill="none" stroke={GOLD} strokeWidth="0.5" opacity="0.5" rx="4" />
      {stars.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#efe8d8" opacity={0.3} />
      ))}
      <circle cx={W / 2} cy={H / 2} r={34} fill="none" stroke={LINE} strokeWidth="1" />
      <circle cx={W / 2} cy={H / 2} r={26} fill="none" stroke={GOLD} strokeWidth="0.5" opacity="0.6" />
      <path d={pentagramPath(W / 2, H / 2, 18)} fill="none" stroke={LAVENDER} strokeWidth="0.8" opacity="0.8" />
      <circle cx={W / 2} cy={H / 2} r={3} fill={GOLD} />
    </svg>
  );
}
