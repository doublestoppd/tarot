# ADR 0010 — Creative license inside hard lines

**Status:** accepted

## Context

The synthesis contract had accreted into a compliance document: dozens of
voice micro-rules, prescribed significance phrasing, strict length floors,
and a prediction regex that flagged any "you will …". The output obeyed
every rule and read like it: defensive, evenly weighted, insight-free. The
product owner's direction: the reading should feel like a real reader —
relatable, easy to follow, willing to interpret — and should leave the
person understanding something new about their situation. A real reader
does not conform to a strict rulebook; the constraints must protect safety
and grounding, not style.

## Decision

1. **The system prompt (reading-synthesis-2.0) is a license, not a
   rulebook.** It states the job (one relatable story from the whole
   spread; the success test is a new understanding), grants explicit
   creative freedoms (interpret and take a point of view; describe how
   patterns show up in ordinary life as possibility; weight cards freely;
   speak plainly about hard cards), and reserves six hard lines: stay
   inside the supplied context, cite evidence, invent no personal facts
   and promise no certain outcomes, no prohibited-topic pronouncements,
   plain language, and no chat framing. Prescribed significance phrasing
   and per-paragraph micro-rules are gone; length is guidance.

2. **Validators police safety and grounding, not style.** The
   direct-prediction gate now allows hedged or perceptual futures ("you
   will probably…", "you will notice…") and continues to bar promissory
   ones. The depth word floor only fires below 85% of target. Everything
   fatal (invented evidence, unsupported esoterica, invented biography,
   unavailable factors, correspondence corridor) is unchanged.

3. **The deterministic composer gets the same relatable moves** so the
   in-house engine demonstrates the intended register without an external
   call: a lived-texture layer (`data/tarot/textures.ts`, one concrete
   everyday image per card per orientation, always framed as "often looks
   like…"), and a closing takeaway that crystallizes the reading's reframe
   from the spread's own structure (root feeds surface → contest → arc).

4. **Default OpenAI reasoning effort rises from "low" to "medium"** so the
   provider has room to actually compose; still env-configurable.

## Consequences

- The external model has latitude to write differently across runs; the
  eval harness and deterministic gates remain the regression net, and
  `RUN_REAL_EVALS=1` grades the real provider before enabling it.
- Textures are authored content and go through the same content-integrity
  checks as meanings and essences.
- Hedged future phrasing now passes validation; promissory phrasing still
  triggers repair.
