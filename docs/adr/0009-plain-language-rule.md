# ADR 0009 — Plain language: user-facing prose reads at or below 8th grade

**Status:** accepted

## Context

Early readings were correct but hard to read: long clause-stacked sentences,
abstract vocabulary, and unglossed terms of art ("its Virgo attribution",
"the spread's energies express directly"). The product owner set a rule:
everything presented to the user should read at no more than an 8th-grade
reading level.

## Decision

1. **All authored user-facing prose is written plainly**: card meanings,
   pattern and resonance statements, theme glosses, spread descriptions and
   position purposes, intake tooltips, static pages, and both the in-house
   composer's and the deterministic fallback's template text. Style: short
   sentences (most under 18 words), common words, one idea per sentence, no
   semicolon/dash chains. Terms of art are kept but framed ("linked to Virgo
   in the old card tradition"), never assumed.

2. **A deterministic readability gate** (`domain/safety/readability.ts`)
   scores synthesized readings with the Flesch–Kincaid grade formula and
   `validateSynthesis` raises the repairable problem `READING_LEVEL_TOO_HIGH`
   above `MAX_USER_FACING_GRADE = 8.0`. The repair instruction tells the
   provider exactly how to rewrite. The system prompt
   (`reading-synthesis-1.1`) states the plain-language rule as a hard rule.

3. **Esoteric proper nouns are normalized before scoring.** Card names,
   zodiac signs, planet names, suits, and a short list of unavoidable domain
   terms are replaced with one-syllable stand-ins ("card", "sign", "star",
   "suit", "sky") before the formula runs. "Sagittarius" is four syllables
   no matter how simply the sentence is built; the rule is about sentence
   construction, not about banning the deck's own vocabulary.

4. **Tests pin the corpus.** `tests/unit/readability.test.ts` scores every
   card meaning, spread description, position purpose, and intake tooltip
   and fails on any regression above the ceiling. The eval harness reports
   average/maximum grade across its fixture readings.

## Consequences

- Flesch–Kincaid is a blunt instrument on very short fragments, so the
  corpus tests only score full sentences (labels are exempt), and the
  runtime gate scores the whole reading, where the formula is reliable.
- The reading keeps its reflective register through rhythm and image rather
  than through subordinate clauses; content (evidence grounding, tension
  preservation, non-prediction) is unchanged.
- Provider prompts and repair paths add no new API calls; the gate is pure
  computation inside the existing single-call/one-repair budget.
