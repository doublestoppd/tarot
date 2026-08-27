# ADR 0002 — Structured intake; no free-text reading input

**Status:** accepted (binding, from the v1 specification)

## Decision

The reading flow accepts only enumerated selections (domain, focus, insight
lens, time perspective, depth, reversals) plus optional factual birth fields.
There is no question box, journaling, custom prompt, or file upload anywhere.
API schemas are strict: unknown properties are rejected and no arbitrary text
field exists in the reading contract.

The single exception is the birthplace search query, which is used only to
select a canonical internal place record from the app-controlled gazetteer;
the query string itself never enters the reading context, the AI prompt, the
database, or logs.

## Rationale

Free text is the highest-risk personal disclosure channel and would push the
product toward chatbot framing, both prohibited. The insight-lens taxonomy is
the structured replacement for "ask a question": it communicates intent
without collecting a story.
