export const metadata = { title: "Methodology — Arcanum" };

/** Methodology disclosures (spec §48.1), in plain language (ADR 0009). */
export default function MethodologyPage() {
  return (
    <main>
      <span className="star-mark" aria-hidden>
        ✧
      </span>
      <h1>Methodology</h1>

      <h2>How the cards are drawn</h2>
      <p>
        The cards are chosen by a secure random draw, like a fair shuffle.
        Your profile, your topic, and the writing model have no say in which
        cards come up. The draw is locked in, with its exact time, before any
        writing starts. We do not claim the shuffle is magic. It is a
        well-tested random draw, kept fully separate from everything else the
        app knows.
      </p>

      <h2>What the reading combines</h2>
      <p>
        A reading brings together three kinds of material. First, documented
        tarot tradition: the Rider–Waite–Smith card meanings and the Golden
        Dawn web of links between cards, signs, and planets. Second,
        astrology computed for the exact moment of your draw and, if you
        share birth facts, for your birth. Third, Western numerology, counted
        from your birth date. The final written piece is AI-assisted. The
        writing works only from the material above and is checked against it.
        It cannot add correspondences, compute sky positions, or invent facts
        about you.
      </p>

      <h2>Traditions can disagree</h2>
      <p>
        Different schools of tarot and astrology honestly disagree about many
        details. This app names the systems it uses: tropical Western
        astrology, Golden Dawn card attributions, Hermetic Qabalah labels
        (not the same thing as Jewish Kabbalah), and one documented modern
        numerology method. It keeps track of where each claim came from
        instead of pretending all schools agree. The Detailed Basis view of
        any reading shows the tradition behind each factor.
      </p>

      <h2>Missing information narrows the calculation</h2>
      <p>
        Sky factors are used only when they can be computed with confidence.
        Without a birth time, houses and angles are never shown. If a planet
        changes sign during the hours you might have been born, it is left
        out, not guessed. Missing birth facts are never treated as a flaw,
        and noon is never quietly assumed.
      </p>

      <h2>What a reading is</h2>
      <p>
        Tarot, astrology, and numerology are symbolic systems. They do not
        prove facts, and they do not promise future events. A reading here
        offers a careful symbolic picture. How it fits your life is yours to
        judge.
      </p>
    </main>
  );
}
