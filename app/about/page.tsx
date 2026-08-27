export const metadata = { title: "About — Arcanum" };

export default function AboutPage() {
  return (
    <main>
      <span className="star-mark" aria-hidden>
        ✧
      </span>
      <h1>About</h1>
      <p>
        Arcanum is a small, private tarot reading tool, built for an invited
        circle rather than the public. The card draw is truly random and
        stands on its own. The card meanings come from documented sources.
        Each reading ends in one careful written interpretation.
      </p>
      <p>
        It is not a chatbot, a social app, or a journal. It asks for very
        little and remembers even less. It treats the tarot tradition and
        your privacy with the same care. The Methodology page explains how a
        reading is put together. The Privacy page explains exactly what is
        kept and what is not.
      </p>
      <p>
        The card images are the “Celestial Prototype” deck: simple geometric
        designs drawn by the app itself. Each card&apos;s traditional
        attributions come from documented historical sources.
      </p>
    </main>
  );
}
