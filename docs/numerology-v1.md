# Numerology algorithm — version `pythagorean-1.0`

The application implements one documented Western/Pythagorean convention.
These are modern conventions, versioned so results are reproducible; they are
not presented as ancient universal doctrine. All calculations are
deterministic code (`domain/numerology/`) — never performed by the language
model. Name-based numbers are deliberately excluded from v1 (spec §11.2).

## Reduction rule

`reduce(n)`: repeatedly sum decimal digits until the value is a single digit,
**stopping** at the master numbers 11, 22, or 33 when
master-preservation is enabled for that calculation step.

## Calculations

| Calculation | Rule (version pythagorean-1.0) |
| --- | --- |
| Life Path | Reduce month, day, and year independently (masters 11/22/33 preserved at the component stage); sum the three results; reduce the sum preserving masters. |
| Birthday Number | Reduce the day of month, preserving 11 and 22 (day 11, 22, or 29 → 11). |
| Attitude (Sun) Number | Reduce(month + day), preserving masters. |
| Personal Year | reduce(reduce(birth month) + reduce(birth day) + reduce(universal year)), masters preserved at the final stage; universal year = reduce(digits of the calendar year in effect). The personal year changes at January 1 (calendar-year convention). |
| Personal Month | reduce(Personal Year + calendar month), masters preserved. |
| Personal Day | reduce(Personal Month + calendar day), masters preserved. |
| Pinnacles | P1 = reduce(month + day); P2 = reduce(day + year); P3 = reduce(P1 + P2); P4 = reduce(month + year); components are the *reduced* month/day/year. Masters preserved. First pinnacle spans birth to age `36 − lifePathDigit` (lifePathDigit = Life Path reduced fully to a single digit, master → its digit sum); each later pinnacle lasts 9 years; the fourth is open-ended. |
| Challenges | C1 = \|reduce(month) − reduce(day)\|; C2 = \|reduce(day) − reduce(year)\|; C3 = \|C1 − C2\|; C4 = \|reduce(month) − reduce(year)\|; all reduced fully to a single digit, 0 permitted, no masters. |

## Tarot birth cards — modern convention `birth-cards-1.0`

A late-20th-century convention (documented as modern, acceptance class C/D):

1. Write the birth date as month, day, and the year split into two two-digit
   pairs (e.g. 17 May 1992 → 5 + 17 + 19 + 92 = 133).
2. If the sum exceeds 22, sum its decimal digits (133 → 7); repeat while the
   value still exceeds 22.
3. The result names the primary birth card by trump number (22 → 0, The
   Fool). The companion card is the digit-sum of the primary number (e.g. 16
   → 7). When the primary is already a single digit, the pair collapses to a
   single card; 19 yields the traditional triple 19 → 10 → 1.

## Personal cycle semantics

Personal Year/Month/Day are computed for the reading's draw moment (UTC
calendar date) from the supplied birth date, and are labeled as cycles, not
predictions.
