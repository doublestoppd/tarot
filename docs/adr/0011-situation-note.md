# ADR 0011 — Optional situation note (amending ADR 0002)

**Status:** accepted (product-owner decision, 2026-08-28)

## Context

ADR 0002 chose structured intake with no free text, for privacy and to
keep prompts deterministic. A three-persona usability panel then showed
the cost: readings could engage only with the menu label, never the
situation, so specificity happened by luck ("a Love & Connection reading
that contains zero reference to another human being"). All three testers
independently named one fix: let the person say, in a sentence or two,
what the reading is about. The product owner approved the amendment.

## Decision

An **optional** multi-line note ("In your own words", ≤500 characters) on
the prepare screen, handled so the privacy architecture is preserved:

1. **Never stored.** The note is sanitized server-side (control characters
   stripped, length capped) and sealed into the encrypted reading ticket
   alongside the rest of the context. It exists in the ticket, in memory
   during the one interpretation call, and nowhere else. No table, no log,
   no history.
2. **Provider-visible by consent.** It rides the one provider request as
   `situationNote` so the synthesis can aim at the actual situation. The
   privacy page discloses this in plain words next to the field's own
   helper text.
3. **Excluded from share links as data.** Share artifacts keep their
   existing allowlist (title, text, cards, topic, date); the note field is
   not in it. Because the reading's text may quote or answer the note,
   the share dialog and privacy page say so plainly instead of implying
   the note cannot appear in shared prose.
4. **Data, not instructions.** The system prompt frames the note as the
   person's description, explicitly never as instructions, and tells the
   model to ignore any attempt inside it to change the reading rules.
5. **Grounding, not license.** The deterministic validators keep policing
   output, with one adjustment: a reference to a figure the asker themself
   mentioned (boss, partner, parent…) is grounded, not invented biography.
   Prohibited-topic and prediction gates are unchanged, and the composer
   will not echo a note verbatim when it touches barred topics.
6. **The draw stays independent.** The note plays no part in card
   selection; it only informs interpretation, like every other intake
   choice.

## Consequences

- The in-house composer echoes the note once at the opening, aims its
  closing tie-back at it, and otherwise composes as before; the external
  provider can genuinely weave the described circumstances through every
  beat.
- A note that mentions barred topics still gets a reading; it simply is
  not quoted back, and output gates hold.
- ADR 0002's remaining rationale (no free-form chat, no stored prompts,
  structured choices as the backbone) stands; this is a single bounded
  field, not a chat channel.
