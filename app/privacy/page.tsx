export const metadata = { title: "Privacy — Arcanum" };

/** Privacy disclosures (spec §48.2). */
export default function PrivacyPage() {
  return (
    <main>
      <span className="star-mark" aria-hidden>
        ✧
      </span>
      <h1>Privacy</h1>

      <h2>No account, no profile</h2>
      <p>
        This is a private, invitation-only space. There are no accounts, no
        usernames, and no personal profiles. Entering the shared access code
        places an anonymous authorization credential in your browser; it
        contains no name, email, birth information, or reading history.
      </p>

      <h2>Readings are ephemeral</h2>
      <p>
        Birth information you optionally enter, and the full calculation
        context derived from it, are used only to prepare the active reading.
        They live inside an encrypted, short-lived reading ticket held by your
        browser and are not stored as reading history by the application.
        Closing or refreshing the page ends the reading. The application keeps
        no record of which cards you drew or what your reading said.
      </p>

      <h2>What the application does retain</h2>
      <p>
        Operating a shared private service requires minimal operational data:
        the anonymous authorization credential, short-lived anonymized
        rate-limit counters, and aggregate cost/health counters (counts,
        token totals, error rates). None of it contains reading content or
        birth information.
      </p>

      <h2>The interpretation provider</h2>
      <p>
        Generating the full written interpretation requires transmitting a
        minimized, derived symbolic context — never your raw birth date, time,
        or birthplace — to our AI provider (OpenAI's API). Per OpenAI's
        current API data controls, API data is not used to train models unless
        the customer opts in (we do not), and standard abuse-monitoring
        retention of up to about 30 days may apply on the provider's side. We
        do not claim zero provider retention unless that configuration is
        actually approved and in place. Provider terms can change; this page
        is reviewed against the provider's current documentation at each
        deployment.
      </p>

      <h2>Private share links</h2>
      <p>
        A reading is saved only if you explicitly create a private share link.
        Your browser then encrypts a minimized copy of the finished reading
        (title, text, cards, general topic, date — never birth details or the
        underlying calculation basis) and the server stores only that
        encrypted data. The decryption key lives in the link itself, after the
        “#”, and is never sent to the server. Links expire automatically,
        after 90 days by default. Encrypted share data deleted from the live
        database may persist in infrastructure backups until those backups age
        out.
      </p>

      <h2>No tracking</h2>
      <p>
        There is no advertising, no behavioral analytics, no session replay,
        and no third-party trackers. Server logs never contain reading
        content, birth information, access codes, or request bodies.
      </p>
    </main>
  );
}
