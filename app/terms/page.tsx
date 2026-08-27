export const metadata = { title: "Terms — Arcanum" };

export default function TermsPage() {
  return (
    <main>
      <span className="star-mark" aria-hidden>
        ✧
      </span>
      <h1>Terms of use</h1>
      <p>
        This is a private, invitation-only application offered as-is for
        personal, reflective use by people who were given its access code.
      </p>
      <h2>Readings are interpretive</h2>
      <p>
        Readings are symbolic interpretation, not fact, prediction, or
        professional advice. They must not be relied on for medical, mental
        health, legal, financial, or other high-stakes decisions, and the
        application deliberately declines to produce such directives. You
        remain responsible for your decisions.
      </p>
      <h2>Access</h2>
      <p>
        Please do not share the access code beyond the people it was given to.
        Access may be rotated or withdrawn at any time. Automated or abusive
        use may be throttled without notice.
      </p>
      <h2>Share links</h2>
      <p>
        Private share links carry the decryption key in the link itself: treat
        a link as the content it unlocks, share it only with people you would
        show the reading to, and expect it to expire.
      </p>
      <h2>No warranty</h2>
      <p>
        The service is provided without warranty of any kind. It may be
        modified, interrupted, or discontinued at any time.
      </p>
    </main>
  );
}
