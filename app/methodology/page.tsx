export const metadata = { title: "Methodology — Arcanum" };

/** Methodology disclosures (spec §48.1). */
export default function MethodologyPage() {
  return (
    <main>
      <span className="star-mark" aria-hidden>
        ✧
      </span>
      <h1>Methodology</h1>

      <h2>How the cards are drawn</h2>
      <p>
        Cards are selected using a cryptographically secure randomized draw.
        Your profile, selected topic, and the interpretation model do not
        choose the cards. The draw is committed, with its exact timestamp,
        before any interpretation begins. We do not claim the process is
        metaphysically random — it is a well-audited randomized shuffle, kept
        deliberately independent of everything else the application knows.
      </p>

      <h2>What the reading combines</h2>
      <p>
        A reading integrates documented tarot tradition (Rider–Waite–Smith
        structural meanings and Golden Dawn/Hermetic correspondences),
        deterministic astrology calculated for the moment of the draw and —
        when you choose to provide birth facts — for your birth data, and
        Western/Pythagorean numerology. A final prose interpretation is
        AI-assisted: the interpretive text is generated from, and checked
        against, the deterministic material above. The interpretation cannot
        add correspondences, calculate positions, or invent personal facts.
      </p>

      <h2>Traditions can disagree</h2>
      <p>
        Different esoteric schools genuinely disagree about many
        correspondences. This application names its default systems — tropical
        Western astrology, Golden Dawn attributions, Hermetic Qabalah labels
        (which are distinct from Jewish Kabbalah), and a documented modern
        numerology convention — and preserves provenance rather than asserting
        universal occult consensus. The Detailed Basis view of any active
        reading shows which tradition each factor came from.
      </p>

      <h2>Missing information narrows the calculation</h2>
      <p>
        Astrological factors are included only when they can be calculated
        reliably. Without a birth time, houses and angles are never shown, and
        any planet whose sign changes during the possible hours of your birth
        date is left out rather than guessed. Missing birth information is
        never treated as a deficiency, and noon is never silently assumed.
      </p>

      <h2>What a reading is</h2>
      <p>
        Tarot, astrology, and numerology are interpretive symbolic systems.
        They do not establish objective facts and they do not guarantee future
        events. A reading here offers a considered symbolic pattern; how it
        applies to your circumstances remains yours to judge.
      </p>
    </main>
  );
}
