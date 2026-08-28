export const metadata = { title: "Privacy — Arcanum" };

/** Privacy disclosures (spec §48.2), in plain language (ADR 0009). */
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
        usernames, and no profiles. When you enter the shared access code,
        your browser receives an anonymous pass. That pass holds no name, no
        email, no birth facts, and no reading history.
      </p>

      <h2>Readings are not stored</h2>
      <p>
        Birth facts you choose to enter, and any optional note you write
        about your situation, are used only to prepare the current reading.
        They travel inside an encrypted, short-lived reading ticket that
        your browser holds. The app does not store them as history. Closing
        or refreshing the page ends the reading. The app keeps no record of
        which cards you drew, what you wrote, or what your reading said.
      </p>

      <h2>What the app does keep</h2>
      <p>
        Running a shared private service takes a small amount of operating
        data: the anonymous pass, short-lived anonymous rate-limit counters,
        and overall cost and health totals (counts, token totals, error
        rates). None of it contains reading content or birth facts.
      </p>

      <h2>The interpretation provider</h2>
      <p>
        Writing the full interpretation means sending a trimmed, derived
        summary of the symbols — never your raw birth date, time, or
        birthplace — to our AI provider (OpenAI&apos;s API). If you choose
        to write an optional note about your situation, that note is
        included in this one request so the reading can speak to it, and is
        never stored by the app. Under
        OpenAI&apos;s current API terms, API data is not used to train models
        unless the customer opts in, and we do not. The provider may keep
        data for up to about 30 days to watch for abuse. We do not claim zero
        provider retention unless that setup is truly approved and in place.
        Provider terms can change. This page is checked against the
        provider&apos;s current documents at each deployment.
      </p>

      <h2>Private share links</h2>
      <p>
        A reading is saved only if you choose to create a private share link.
        Your browser then encrypts a trimmed copy of the finished reading:
        title, text, cards, general topic, and date. Birth details and the
        calculation basis are never included, and your optional note is not
        attached as data. The reading&apos;s own text is shared as written,
        though, so if the reading quotes or answers your note, those lines
        travel with it. The server stores only the
        encrypted data. The unlock key lives in the link itself, after the
        “#”, and is never sent to the server. Links expire on their own,
        after 90 days by default. Encrypted share data deleted from the live
        database may live on in backups until those backups age out.
      </p>

      <h2>No tracking</h2>
      <p>
        There is no advertising, no behavior tracking, no session replay, and
        no third-party trackers. Server logs never contain reading content,
        birth facts, access codes, or request bodies.
      </p>
    </main>
  );
}
