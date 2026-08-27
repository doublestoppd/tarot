PRIVATE ESOTERICTAROT WEB APPLICATION
Complete Product, UX, Technical, Esoteric, AI, Privacy, Security,Deployment, and Operations Specification

| Purpose: This document is the authoritative v1 build specification to hand directly to Claude AI. Claude should implement the system described here, preserve the constraints, and avoid adding unrequested product features or alternate architectural patterns. |

Document version: 1.0
Specification date: 26 August 2026
Target: responsive browser application on a dedicated private domain
Primary deployment: DigitalOcean Droplet + Docker Compose + Caddy + PostgreSQL
Primary synthesis provider: OpenAI API, isolated behind a provider abstraction

# 0. How Claude Must Use This Document
Treat this document as a binding implementation contract. Where ordinary software convention conflicts with an explicit requirement here, the explicit requirement wins. Do not add accounts, social profiles, chat, free-text prompts, persistent reading history, advertising, public discovery, or third-party analytics unless a later specification explicitly authorizes them.

| Core idea: The application knows as little as possible about the user’s real life while deriving as much legitimate symbolic context as possible from optional factual data, a cryptographically independent tarot draw, and the actual celestial state at the draw moment. AI writes the final reading; AI does not decide the cards, calculate astrology, invent correspondences, or infer an unstated biography. |

- Implement deterministic engines first; wire the LLM only after the deterministic ReadingContext and evidence graph pass tests.
- Every major AI statement must be traceable to supplied evidence IDs, while normal users see graceful prose rather than scores or internal mechanics.
- Privacy is structural: personal inputs and full calculation context are ephemeral. Only deliberately created, client-encrypted share artifacts may persist.
- End-user language must feel like a refined esoteric reading experience. Infrastructure terms belong in logs/admin documentation, not the main experience.
- All current external service instructions in this document must be rechecked immediately before production deployment because vendor interfaces and prices change.

## Document map

| Part | Subject |
| I | Product mandate, scope, principles, and UX language |
| II | End-user journey, screens, structured intake, spreads |
| III | Tarot, astrology, numerology, Hermetic data, provenance, resonance |
| IV | AI synthesis contract, evidence model, evaluation, safety |
| V | Privacy, authorization, sharing, security, database, APIs |
| VI | Technology stack, repository, administration, observability, testing |
| VII | DigitalOcean deployment and OpenAI API setup |
| VIII | Operations, launch checklist, and phased implementation |
| Appendices | Schemas, prompt template, environment variables, error copy, source manifest |


# PART I — Product Definition and Non-Negotiable Principles

# 1. Product Mandate
Build a private, invitation-only, browser-based esoteric tarot reading application. A user enters one shared global access code, prepares a reading through structured choices, optionally provides birth facts, triggers a cryptographically secure tarot draw, and receives a long-form integrated interpretation. The reading must feel unusually perceptive and cohesive while remaining traceable to real deterministic inputs.

## 1.1 Product identity
- This is not a chatbot, AI assistant, journaling service, social network, or generic tarot-card encyclopedia with AI bolted on.
- This is a stateless esoteric synthesis instrument: structured intent + optional factual birth data + current celestial state + independently random tarot draw + curated correspondences + deterministic resonance analysis + one final AI prose synthesis.
- The user should feel that a talented, careful esoteric reader has considered the whole symbolic pattern. The product must not falsely represent a human psychic or claim objective supernatural certainty.
- The result should invite the user to apply the symbolism to their own circumstances rather than making up circumstances for them.

## 1.2 Primary design objectives

| Objective | Implementation interpretation |
| Minimal disclosure | Require only a reading domain. All birth information is optional. Never request narrative free text. |
| Maximum context yield | Derive many deterministic factors from a small number of factual inputs. |
| Independent draw | The card-selection service has no access to profile, domain, AI context, or astrological context. |
| Esoteric depth | Support a coherent, provenance-backed Western/Hermetic correspondence system, then expand modularly. |
| Meaningful synthesis | Use a scoring/compiler layer to select genuinely relevant convergences before the model sees them. |
| Privacy by construction | Do not persist raw birth data, full readings, prompts, natal charts, or AI outputs unless the user intentionally creates an encrypted share artifact. |
| Elegant transparency | Normal prose is immersive; optional panels show what shaped the reading and deeper provenance. |
| Cost boundedness | One normal model call, strict token limits, app budget reservations, provider spend controls, and a kill switch. |
| Replaceable presentation | All initial art is generic/placeholder and swappable through a deck-theme abstraction. |


# 2. Non-Negotiable V1 Constraints
- Browser application on one dedicated domain, responsive for phone, tablet, and desktop.
- One shared, long, randomly generated global access code gates the entire application.
- No usernames, accounts, profiles, email collection, phone numbers, OAuth, waitlist, public signup, or account recovery.
- No free-text user input anywhere in the reading flow.
- No chat, conversational follow-up, AI memory, or persistent user preference history.
- No public reading directory, social feed, comments, reactions, followers, or user-generated content.
- No news/current-events awareness. “Current world state” means celestial/astrological state only.
- No third-party advertising, marketing trackers, session replay, behavioral analytics, or external runtime geocoding.
- No AI-selected cards, AI-calculated natal positions, AI-invented occult correspondences, or AI-generated random numbers.
- No unbounded retry loops or agentic model chains.
- No runtime dependence on proprietary tarot artwork. The initial deck must be a deliberately minimal generic presentation.
- No claims that a technical outage is caused by spirits, Mercury retrograde, fate, or any other invented mystical explanation.

# 3. Scope and Explicit Exclusions

## 3.1 Included in v1
- Access-code gate and anonymous browser authorization.
- Structured reading preparation: domain, focus, insight lens, time perspective, reading depth, reversals.
- Optional birth date; optional birth time and birthplace revealed progressively.
- Private local/server-controlled birthplace lookup from a curated geographic dataset.
- 78-card tarot deck data model, secure draw, positions, reversals, deterministic pattern analysis.
- Western tropical/geocentric astrology, current sky, conservative natal calculations, major transits, houses only when valid.
- Western/Pythagorean numerology and tarot birth-card calculations.
- Rider–Waite–Smith structural meanings, Golden Dawn/Hermetic correspondences, Hermetic Qabalah labels, elements, decans, planetary mappings.
- Provenance metadata, acceptance classification, independent-source lineage, resonance scoring, theme compiler.
- One integrated AI-generated reading, evidence-linked structured output, validation, graceful deterministic fallback.
- Optional “What shaped this reading?” and detailed provenance views while the reading session is active.
- Client-encrypted, access-gated, temporary share links containing a minimized finished reading artifact.
- Minimal administrator console for access, budgets, AI availability, aggregate usage, share cleanup, and health.
- DigitalOcean single-Droplet production deployment with Docker Compose, Caddy, PostgreSQL, backups, cloud firewall, monitoring.

## 3.2 Explicitly out of scope
- Accounts and saved profiles; reading history; favorites; streaks; notifications; subscriptions; payments.
- Open-ended questions; journaling; user-authored interpretations; custom prompts; file uploads.
- Name-based numerology in the primary intake; synastry between two people; relationship partner data.
- Runes, I Ching, oracle decks, crystals, chakras, herbal correspondences, fixed stars, lunar mansions, asteroids beyond specifically listed points. The schema must allow future modules, but v1 does not need them.
- Native iOS/Android applications.
- Automated claims about health diagnoses, pregnancy, death, legal verdicts, gambling outcomes, investment outcomes, or criminal behavior.

# 4. Experience Language and Illusion Boundary
The product surface should feel like receiving a reading from a gifted and unusually rigorous esoteric reader. The software implementation must not feel exposed during normal use. This is a presentation rule, not permission to deceive.

## 4.1 Required language behavior

| Internal concept | Preferred user-facing language |
| AI generation | Interpretation |
| LLM/provider | Normally not named in reading flow |
| Prompt/context object | What shaped this reading |
| API/model outage | The full interpretation is not available at this moment |
| Rate limit/budget limit | Full interpretation is temporarily unavailable |
| Randomization | Card draw |
| Retry model call | Continue this reading |
| Input form | Prepare a reading |
| Submit | Draw the cards |
| Response | Your reading |
| Ephemeris calculation issue | Part of the celestial context could not be resolved |


## 4.2 Forbidden experience language
- Do not show “API error,” “quota,” “token,” “model,” “OpenAI,” “HTTP 429,” “database,” “JSON,” or infrastructure vocabulary in normal end-user errors.
- Do not say “the spirits are quiet,” “the cards refuse to speak,” “Mercury interfered,” or any false supernatural explanation for a technical problem.
- Do not present a human avatar/name in a way that implies a real human psychic is responding live.
- Do not use chatbot framing such as “Ask me anything,” “I think,” “How can I help?” or follow-up questions after the reading.
- Do not use generic mystical filler as a substitute for evidence: “the universe wants,” “a portal is opening,” “trust the journey,” or similar stock phrases should be rare and only contextually justified.

## 4.3 Target reading voice
Specific, interpretive, literary but intelligible, calm, non-conversational, confident about documented symbolism, cautious about real-world conclusions, and willing to preserve ambiguity. Major observations should sound grounded because the prose naturally names the cards or traditional correspondences that make them relevant, without enumerating scores.

| Good target: “The spread repeatedly pairs movement with restraint. The Chariot introduces momentum, while the material emphasis elsewhere suggests that progress may depend on what can be made stable enough to carry that momentum.” Bad target: “The universe is calling you to take a leap of faith.” |


# PART II — End-User Experience and Reading Preparation

# 5. End-to-End Browser Flow

| GET /  unauthorized -> Access screen  authorized   -> Prepare a ReadingPrepare a Reading  -> structured intent  -> optional factual birth inputs  -> reading preferences  -> transparency summary  -> DRAW THE CARDSPOST /api/readings/prepare  -> validate authorization and budgets  -> authoritative server UTC timestamp  -> secure tarot draw  -> deterministic calculations  -> evidence/resonance compiler  -> encrypted short-lived reading ticket returned to browserPOST /api/readings/interpret  -> validate ticket  -> reserve worst-case AI budget  -> one model call  -> schema/evidence validation  -> return finished readingResult  -> prose + cards  -> optional What shaped this reading  -> optional detailed basis  -> optional Create private share link |


## 5.1 Navigation philosophy
- There is no conventional logged-in dashboard. Authorized users land directly on “Prepare a Reading.”
- Use one calm vertical flow rather than a wizard with many Next screens. Progressive sections appear after relevant selections.
- The primary action remains visible only when the minimum valid configuration exists.
- Do not show profile-completion percentages. Missing optional information is not a deficiency.
- A small footer can link to Methodology, Privacy, Terms, and About, plus an unobtrusive “Lock this browser” action that clears the authorization cookie.

# 6. Screen Specification

## 6.1 Screen A — Private Access
Route: `/`. Rendered whenever the authorization cookie is missing, invalid, expired, or invalidated by session epoch.

| ✧                   PRIVATE ACCESS           Enter the access code to continue.        [ Access code                     ]                         ENTER |

- Password-style masked input with a reveal toggle and password-manager-safe semantics.
- One primary Enter button. Pressing Enter in the field submits.
- Generic failure: “That access code doesn’t open this space. Check it and try again.” Never reveal whether a prefix/length was close.
- After success, issue the anonymous authorization cookie and redirect to the original requested path, including a shared-reading route.
- Use subtle generic celestial ornamentation only; do not expose the application content behind the gate.

## 6.2 Screen B — Prepare a Reading
Route: `/`. Authorized state. The page should feel like arranging a reading, not completing a medical intake form.

### Introductory copy

| PREPARE A READINGChoose what you would like the reading to explore.Personal details are optional; share only what you want. |


### Step 1: Reading domain — required
Display 12 large responsive choice cards. Selection immediately reveals the focus choices for that domain.

### Step 2: Focus — optional with domain-specific default
Display domain-specific focus cards. The first entry is always a broad “General …” option and should be preselected unless the user chooses another.

### Step 3: Insight lens — optional, default “The broader picture”
This is the structured replacement for a free-text question. Its job is to communicate the user’s intent without collecting their story.

### Step 4: Time perspective — optional
Use a compact segmented/radio control. Default: “Present and developing pattern.”

### Step 5: Personalization — entirely optional

| PERSONALIZE YOUR READING                         OptionalYou can leave this entire section blank. Birth informationallows additional astrological, numerical, and tarot correspondences.Birth date[ MM / DD / YYYY ]Adds birth astrology, numerology, personal cycles and tarot birth cards. |

Only after a birth date is entered should a second optional block appear for birth time and birthplace. Do not render all fields initially.

| ADD MORE ASTROLOGICAL DETAIL                    OptionalBirth time                         Birthplace[ -- : -- -- ]                    [ City / region / country ]Adding both allows houses, angles and a more complete natal chart.[ I don’t know my birth time ] |


### Step 6: Reading settings — collapsed by default
- Reversals: On by default; Off available.
- Reading depth: Deep by default; Focused; Comprehensive.
- Do not expose house system, zodiac system, aspect orbs, node choice, or correspondence-school switches in v1 normal UX.

### Step 7: “This reading will draw from”
Immediately above the final action, show a concise live capability summary. It must reflect only legitimately available layers.

| THIS READING WILL DRAW FROM✓ Tarot and spread symbolism✓ Current celestial conditions✓ Career & Purpose — A new direction✓ What may not be obvious✓ Birth-date astrology✓ Numerology and personal cyclesNot included— Natal houses and Ascendant  Birth time and birthplace were not provided. |

When no birth information is provided, end with “No personal birth information will be used.” Do not encourage the user to add more.

### Primary action

| DRAW THE CARDS |

Clicking this button commits the canonical draw moment. Disable immediately on activation; use an idempotency key to prevent duplicate draws/API charges.

## 6.3 Screen C — Reading generation transition
The animation is presentation only. The cards have already been selected securely on the server. Keep animation subtle, bounded, skippable under reduced-motion settings, and never imply that cursor motion/tapping physically changes the random outcome.

| Drawing the cards…Setting the moment…Reading the pattern…Bringing the threads together… |

- Cards can appear face-down, then reveal after the server returns the committed draw.
- The current-celestial snapshot should be visually suggested through subtle glyph/orbit motion but not shown as a technical calculation log.
- If deterministic preparation succeeds but interpretation is delayed, show the drawn cards and keep the same reading ticket rather than redrawing.

## 6.4 Screen D — Your Reading
Route remains session-local, e.g. `/reading`. Do not place raw reading context in the URL. The result is not persistently recoverable unless the user explicitly creates a share link.

| CAREER & PURPOSEA New Direction • What may not be obvious • Developing over time[ CARD ] [ CARD ] [ CARD ] [ CARD ] [ CARD ]BETWEEN STRUCTURE AND MOVEMENT<6–8 integrated paragraphs of reading prose>Based onTarot • Current Sky • Birth Astrology • Numerology • Hermetic Correspondences[ What shaped this reading ][ Create private share link ]       [ Begin another reading ] |

- No chat box and no “ask a follow-up.”
- Cards should show name, orientation, spread position, and placeholder art. A compact tap/click detail can show canonical card meaning, but it must not dominate the result.
- The prose is the primary visual object. Avoid dashboard-like fragmentation.
- “What shaped this reading” opens the transient transparency layers defined later.
- “Begin another reading” clears active reading memory and returns to a blank/default preparation flow. Do not prefill previous personal birth information.

## 6.5 Screen E — Shared Reading
Route: `/r/{shareId}#{decryptionKey}`. Authorization through the global access gate remains mandatory. After authorization, the browser fetches encrypted ciphertext, reads the fragment key locally, decrypts the artifact, and renders a deliberately minimized version.

| A SHARED READINGCareer & Purpose26 August 2026[ cards with names, positions and orientations ]<finished reading prose>Shared privately. Personal information used to create this readingis not included in the saved reading artifact. |

Do not provide “What shaped this reading” on a reopened share because the underlying provenance graph is intentionally not stored. If expired/deleted, show “This shared reading is no longer available. Private reading links are temporary.”

# 7. Structured Intake Taxonomy
This taxonomy is part of the semantic engine, not merely UI copy. Store stable internal IDs separate from display text so wording can change without changing historical logic or tests.

| ID | Domain label | Focus choices |
| general | General | General overview; Current atmosphere; What deserves attention; Direction and development; Balance and integration |
| love | Love & Connection | General relationship energy; A new connection; An existing connection; Communication; Trust & uncertainty; Compatibility & reciprocity; Boundaries; Change & direction; Letting go; Personal relationship patterns |
| career | Career & Purpose | General direction; Current path; A new direction; Opportunity & growth; Stability; Recognition & advancement; Leadership; Collaboration; Conflict & obstacles; Purpose & fulfillment; Work-life balance |
| money | Money & Resources | General financial pattern; Stability & security; Opportunity; Growth; Spending & restraint; Saving & preparation; Risk & uncertainty; Resources & support; Material priorities |
| home | Home & Family | General home/family pattern; Belonging; Communication; Boundaries; Responsibility; Change in the home; Family dynamics; Stability; Roots & legacy |
| growth | Personal Growth | General self-development; Identity; Confidence; Boundaries; Habits & patterns; Healing & integration; Shadow work; Self-expression; Motivation; Fear & resistance; Letting go; Transformation |
| spiritual | Spiritual Path | General guidance; Intuition; Purpose; Inner development; Synchronicity; Spiritual practice; Shadow & integration; Transformation; Discernment |
| change | Change & Transition | General transition; Beginning; Ending & release; Uncertainty; Preparation; Adaptation; What to carry forward; What to leave behind; Emerging direction |
| creativity | Creativity & Expression | General creative energy; Inspiration; Creative block; Starting a project; Developing a project; Visibility & sharing; Collaboration; Discipline & practice; Authentic expression |
| decision | Decisions & Direction | General direction; A crossroads; Competing priorities; What is not obvious; What supports movement; What calls for caution; Shorter-term direction; Longer pattern |
| conflict | Conflict & Boundaries | General dynamics; Communication; Boundaries; Power & control; Misunderstanding; Competing needs; De-escalation; What needs clarity; Resolution & integration |
| timing | Timing & Cycles | Current cycle; Near-term movement; What is ripening; What needs time; A recurring pattern; Transition between cycles; Longer-term development |


## 7.1 Shared insight lenses

| ID | Display text | Interpretive effect |
| broader_picture | The broader picture | Synthesize primary pattern; do not over-prioritize hidden/obstacle factors. |
| not_obvious | What may not be obvious | Increase relevance of hidden, reversed, contradictory, unconscious, and background-position evidence without inventing secrets. |
| influence | What is influencing this most | Prioritize strongest causal/symbolic pressures and repeated factors. |
| support | What supports movement or growth | Prioritize constructive/supportive positions, dignities, strengths, and stabilizers. |
| resistance | What may be creating resistance | Prioritize restrictive/conflicting/reversed/blocked patterns without diagnosing pathology. |
| change | What is changing | Prioritize transition, movement, endings/beginnings, applying transits and temporal shifts. |
| caution | What deserves caution or care | Prioritize tension/risk symbolism but avoid deterministic warnings. |
| potential | What potential is developing | Prioritize emerging/opening/supportive symbols; avoid guaranteed outcomes. |
| integration | How to integrate what is present | Prioritize reconciliation of contradictory themes and practical synthesis. |
| direction | Where the current pattern may be leading | Discuss trajectory conditionally; never present future as fixed fact. |


## 7.2 Time perspectives

| ID | Display text | Weighting rule |
| present_developing | Present and developing pattern | Default. Balance current symbolism and applying near-term factors. |
| near_term | Near term | Favor current lunar/fast-planet factors and immediate spread positions; avoid exact dated predictions. |
| developing | Developing over time | Favor medium-cycle transits, repeated themes and movement across spread positions. |
| longer | Longer pattern | Favor slower planets, persistent natal themes, Major Arcana and durable cycles. |
| none | No particular timeframe | Reduce temporal weighting; emphasize symbolic structure. |


# 8. Spread Catalog and Automatic Selection
Users should not need tarot expertise to choose a spread. The engine recommends a spread from domain + focus + insight + depth. A subtle “Choose another spread” control may allow an override from compatible spreads. Spread definitions are data, not hard-coded UI.

| ID | Name | Cards | Depth | Positions | Use |
| threefold_clarity | Threefold Clarity | 3 | Focused | Present pattern | Key influence | Developing direction | Default for Focused depth. |
| fivefold_insight | Fivefold Insight | 5 | Deep | Present pattern | Hidden factor | Support | Resistance | Developing direction | Default general Deep spread. |
| crossroads | Crossroads | 5 | Deep | Current orientation | Pull toward change | Pull toward continuity | Unseen factor | Integrating direction | Decisions, uncertainty, change. |
| career_path | Career Path | 6 | Deep | Current professional pattern | Strength/resource | Constraint | Opportunity | What to develop | Direction | Career & Purpose. |
| connection_dynamics | Connection Dynamics | 6 | Deep | Current relational atmosphere | What is expressed | What is less visible | Support | Tension | Developing dynamic | Love/connection without asserting another person’s private motives. |
| threshold | Threshold | 7 | Deep | What is ending | What remains | What is emerging | Resource | Resistance | Adjustment | Threshold direction | Change & Transition. |
| deep_pattern | Deep Pattern | 7 | Deep | Surface pattern | Root pattern | Repetition | Blind spot | Resource | Integration | Direction | Personal Growth / Shadow / recurring cycles. |
| elemental_balance | Elemental Balance | 5 | Deep | Fire/action | Water/feeling | Air/thought | Earth/material | Integration | Balance-focused General/Personal Growth. |
| cycle_lens | Cycle Lens | 7 | Deep | Cycle now | Recent movement | What is ripening | What is waning | Support | Caution | Next phase | Timing & Cycles. |
| celtic_cross | Celtic Cross | 10 | Comprehensive | Present | Crossing influence | Foundation | Recent past | Conscious aim | Near development | Self | Environment | Hopes/fears | Outcome/trajectory | Comprehensive only; outcome phrased conditionally. |


## 8.1 Selection rules
- Focused depth -> Threefold Clarity unless a future specialized three-card spread is explicitly configured.
- Deep + Decisions & Direction -> Crossroads.
- Deep + Career & Purpose -> Career Path unless focus is balance/conflict and a more appropriate general spread scores higher.
- Deep + Love & Connection -> Connection Dynamics.
- Deep + Change & Transition -> Threshold.
- Deep + Personal Growth + shadow/pattern focus -> Deep Pattern.
- Deep + Timing & Cycles -> Cycle Lens.
- Deep + explicit balance/integration focus -> Elemental Balance.
- Otherwise Deep -> Fivefold Insight.
- Comprehensive -> Celtic Cross by default. Specialized comprehensive spreads are future scope.

# PART III — Deterministic Esoteric Engine

# 9. Tarot Domain Model and Randomization

## 9.1 Canonical card identity
Separate a canonical card identity from presentation/deck artwork. Interpretation code must reference card IDs, never image paths.

| TarotCardDefinition {  id: "major_09_hermit",  arcana: "major",  number: 9,  canonicalName: "The Hermit",  suit: null,  rank: null,  element: "earth" | null,  coreKeywords: [...],  uprightMeaningIds: [...],  reversedMeaningIds: [...],  correspondenceIds: [...],  sourceRefs: [...]}DeckPresentation {  deckId, cardId, faceAsset, thumbnailAsset, altText,  attribution, licenseStatus, version} |


## 9.2 Draw algorithm

| INPUT: spread card count N, reversalsEnabled1. Construct the 78 unique canonical card IDs.2. Use the server runtime/OS cryptographically secure random generator.3. Perform an unbiased Fisher–Yates shuffle using rejection sampling where needed   so index selection is not modulo-biased.4. Select the first N unique cards; no replacement.5. For each selected card, if reversals are enabled, draw one independent secure   random bit: 0 = upright, 1 = reversed.6. Bind cards to ordered spread positions.7. Freeze the draw and authoritative draw timestamp before any AI call.8. Return a deterministic draw identifier only inside the short-lived reading ticket.THE DRAW FUNCTION MUST NOT ACCEPT: birth data, domain, focus, astrology,numerology, resonance results, AI model output, or prior readings. |


## 9.3 Randomness claims and tests
- User-facing claim: “Cards are selected using a cryptographically secure randomized draw. Your profile, selected topic, and the interpretation model do not choose the cards.”
- Do not call software PRNG output “true randomness” or imply metaphysical randomness.
- Tests: no duplicate cards; approximately uniform card frequency over very large simulations; approximately 50/50 orientation with reversals; deterministic tests for unbiased integer helper boundaries; prove draw service signature contains no context arguments.

## 9.4 Pattern extraction
After the draw is frozen, a separate tarot analyzer calculates candidate evidence: Major/Minor ratio, suit counts, element counts, court-card patterns, numeric repetition, sequences, repeated planetary/sign attributions, orientation patterns, elemental relationships, central-position emphasis, and card-pair relationships that exist in the curated knowledge graph.

# 10. Astrology Engine

## 10.1 Provider abstraction
Do not allow the application to depend directly on one astrology library. Implement an `AstrologyProvider` interface and normalize all results into application-owned types. This protects licensing, precision, and future migration.

| interface AstrologyProvider {  currentSky(utcInstant): CurrentSky;  natalFromExactBirth(localDateTime, coordinates, timeZone): NatalChart;  conservativeDateOnly(date, optionalBirthplace): PartialNatalProfile;  aspects(bodyPositions, rules): Aspect[];  transits(currentSky, natalProfile, rules): Transit[];  houses(utcInstant, coordinates, houseSystem): HouseSet | Unavailable;}// Candidate v1 adapter: an actively maintained MIT-licensed JS/TS astrology// package such as Celestine, after verification against known fixtures.// Maintain a second independent astronomy implementation (e.g. Astronomy Engine,// MIT) for fixture comparison where practical.// Swiss Ephemeris may be added later only under a compatible commercial license// for a closed-source product, or under AGPL if the distribution model changes. |


## 10.2 V1 astrological defaults

| Setting | V1 default |
| Zodiac | Tropical |
| Reference frame | Geocentric |
| House system | Placidus; Whole Sign fallback only if Placidus cannot be validly computed at extreme latitude |
| Lunar node | True Node |
| Planets | Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto |
| Additional point | Chiron as secondary/low-priority; ASC, DSC, MC, IC only when exact birth time/place exist |
| Rulership | Traditional seven-planet rulership primary; modern outer-planet co-rulership stored separately/secondary |
| Primary aspects | Conjunction, opposition, trine, square, sextile |
| Secondary aspect | Quincunx, lower weight |
| Current context | Exact server UTC draw moment |


## 10.3 Aspect orbs

| Context | Conj. | Opp. | Trine | Square | Sextile | Quincunx |
| Natal | 8° | 8° | 6° | 6° | 4° | 3° |
| Current sky | 4° | 4° | 4° | 4° | 3° | 2° |
| Transit → natal | 3° | 3° | 3° | 3° | 2° | 2° |

Modifiers: add 1.5° to natal aspects involving Sun/Moon; add 1° for natal aspects involving a valid angle. For fast Moon transits, cap transit-to-natal relevance at 1.5° unless a curated rule explicitly says otherwise. Applying aspects may receive a modest relevance bonus; separating aspects remain valid but slightly lower weight.

## 10.4 Unknown birth time and uncertainty rules

| Never silently assume noon and never manufacture houses/angles. Missing information narrows the calculation; it does not become guessed information. |


### Birth date only, no birthplace/time
- Numerology is exact from the supplied calendar date.
- For astrology, evaluate a conservative UTC envelope sufficient to cover all possible civil instants for that calendar date worldwide (UTC−14 through UTC+14).
- A sign-level placement may be marked stable only if the body remains in the same sign throughout that envelope. Degrees are not presented as natal facts.
- The Moon will frequently be time-dependent and should be omitted when unstable. Any other body crossing a sign boundary is also omitted as a sign-level personal factor.
- No houses, angles, local planetary hour, or exact aspect claims requiring a specific birth instant.

### Birth date + birthplace, no time
- Resolve birthplace coordinates and IANA time zone from the app-controlled geographic dataset.
- Use the entire local civil day in the historical time zone as the uncertainty interval.
- Only factors stable throughout the interval are available. Do not show exact degrees as though exact.
- No houses or angles.

### Exact birth date + time + birthplace
- Convert local civil time using the historical IANA time-zone rules for the birthplace.
- Calculate full natal planetary positions, valid houses/angles, aspects, element/modality balance, chart ruler, and relevant derived factors.
- For nonexistent DST local times, request correction or allow the user to leave the time unknown. For repeated/ambiguous DST times, offer “first occurrence,” “second occurrence,” or “not sure”; if not sure, calculate both and suppress factors that differ.

### High-latitude Placidus failure
If the selected house calculation cannot produce valid Placidus cusps, use Whole Sign houses for that reading and note this only in Detailed Basis: “Whole Sign houses were used because Placidus houses are not defined reliably at this latitude.” Do not silently fabricate Placidus values.

## 10.5 Current celestial context
At the exact committed draw timestamp, calculate a global current-sky snapshot independent of user location:
- Planetary tropical longitudes/signs/degrees and direct/retrograde state.
- Moon sign/degree, lunar phase, illumination and waxing/waning state.
- Major current aspects and whether applying/separating.
- Current solar zodiac season and decan.
- Element/modality balance among configured planets.
- Nodes/Chiron where enabled and relevant.
- Ingress/station proximity only when within explicit configured windows and only as secondary evidence.
Do not ask for current location in the normal v1 intake. Local moment houses, angles, and planetary hours are deferred unless later explicitly enabled.

## 10.6 Transits to natal information
Calculate only against natal factors that are legitimately known. Exact transits to an unknown birth-time Moon/angle are forbidden. Candidate transit evidence receives relevance based on aspect type, orb, applying/separating status, natal body, transiting body, selected domain, and time perspective.

# 11. Numerology Engine

## 11.1 System
Use a versioned Western/Pythagorean numerology module. Numerology calculations are deterministic and should never be performed by the language model.

## 11.2 V1 calculations

| Calculation | Rule |
| Life Path | Reduce month, day, and year components, preserving master numbers 11/22/33 at the designated component/final stage; sum and reduce according to one documented algorithm version. |
| Birthday Number | Reduce day of month; preserve 11/22 where applicable by the chosen version. |
| Attitude / Sun Number | Reduce month + day; preserve master number rule consistently. |
| Personal Year | Birth month + birth day + universal calendar year; reduce with documented master-number rule. |
| Personal Month | Personal Year + calendar month; reduce. |
| Personal Day | Personal Month + calendar day; reduce. |
| Pinnacles | Traditional date-derived four-pinnacle calculation, versioned. |
| Challenges | Traditional date-derived challenge calculation, versioned. |
| Tarot birth cards | Use one explicit modern tarot-numerology method; document it as a modern convention rather than ancient universal doctrine. |

Name-based Expression/Destiny, Soul Urge, and Personality numbers are deliberately excluded from normal v1 because a name is more identifying and has low context yield relative to birth date.

# 12. Esoteric Knowledge Base and Provenance
The application may be extremely esoteric, but it must never imply that all traditions agree. “Commonly accepted” means accepted within a named tradition or broadly shared across specified related traditions. Every correspondence is a versioned record with provenance and scope.

## 12.1 V1 canonical stack

| Layer | Default tradition / scope | Role |
| Tarot | Rider–Waite–Smith structural/divinatory tradition, expressed in original normalized wording | Core card identity, symbolism, upright/reversed interpretive vocabulary. |
| Hermetic tarot | Golden Dawn/Hermetic attributions | Astrology, decans, elements, Hebrew letters, Tree-of-Life path mappings, dignities. |
| Astrology | Modern Western tropical astrology using explicitly defined calculation rules | Natal/current/transit context. |
| Qabalah | Hermetic Qabalah; never presented as identical to Jewish Kabbalah | Tree-of-Life/path correspondence metadata and interpretive themes. |
| Numerology | Western/Pythagorean convention, explicitly modernized/versioned | Date-derived numerical context. |
| Planetary symbolism | Traditional Western/Hermetic planetary correspondences | Secondary symbolic reinforcement. |
| Classical elements | Fire, Water, Air, Earth within Western esoteric/tarot usage | Suit/element balance and dignities. |


## 12.2 Acceptance classes

| Class | Meaning | Default interpretive weight |
| A | Canonical/documented within the named tradition | Highest |
| B | Broadly established across relevant practitioners/sources | High |
| C | Legitimate but school-specific or narrower established practice | Moderate |
| D | Modern/eclectic convention; useful but weakly standardized | Low |
| X | Multiple established systems disagree; preserve alternatives | Context-dependent; never collapse disagreement |


## 12.3 Correspondence record

| CorrespondenceRecord {  id: string;  sourceConceptId: string;  targetConceptId: string;  relationshipType: string;  traditionId: string;  acceptanceClass: "A" | "B" | "C" | "D" | "X";  sourceRefs: string[];  historicalPeriod?: string;  notes?: string;  conflictsWith?: string[];  baseWeight: number;  version: string;  active: boolean;}SourceReference {  id, title, authorOrEditor, year, edition, sectionOrPage,  sourceType: "primary" | "secondary" | "reference",  tradition, copyrightOrLicenseStatus, jurisdictionNotes, url,  verificationDate, reviewerNotes} |


## 12.4 Content authoring rule
Historical/public-domain works and factual mappings may establish source facts, but user-facing descriptions must be original normalized language. Do not reproduce modern guidebook prose or scrape contemporary tarot websites. Source facts and the application’s expressive wording are separate records.

## 12.5 AI restriction

| The language model may interpret only correspondences explicitly included in the compiled ReadingContext. It may not add a crystal, herb, deity, chakra, planet, zodiac, Qabalistic, numerological, or tarot association from its training memory merely because it sounds plausible. |


# 13. Resonance, Relevance, and Theme Compiler
This is the central intelligence of the product. The application should calculate broadly, then interpret selectively. The model should never receive hundreds of unranked occult facts.

## 13.1 Candidate evidence scoring defaults

| Candidate | Base score |
| Exact tarot birth card appears in the random draw | +12 |
| Known natal sign/planet exactly matches a Class A/B tarot attribution | +10 |
| Strong exact numerological repetition linked to a drawn card | +8 |
| Second independent drawn card reinforces the same sign/planet/element theme | +7 |
| Relevant major current-to-natal transit within configured orb | +7 |
| Current sky independently reinforces a tarot attribution | +5 |
| Repeated suit/element pattern in spread | +5 |
| Repeated number family in spread | +4 |
| Spread position directly aligns with selected insight lens | +4 |
| Class C school-specific correspondence | +2 |
| Class D modern/eclectic correspondence, if later enabled | +1 |


## 13.2 Multipliers / reductions

| Condition | Multiplier |
| Directly relevant to selected domain | ×1.30 to ×1.45 |
| Directly relevant to selected insight lens | ×1.20 |
| Central/primary spread position | ×1.20 |
| Theme has 3+ independent root sources | ×1.20 |
| Weak end of allowed astrological orb | ×0.55 to ×0.85 depending on proximity |
| Tangential to selected domain | ×0.60 |
| Dependent derivative of evidence already counted | Do not independently count; lineage collapse |


## 13.3 Significance bands

| Score | Band | Normal output behavior |
| 0–4.9 | Ignore | Do not send to AI. |
| 5–8.9 | Background | Usually omit; may support a stronger parent theme. |
| 9–13.9 | Supporting | May appear as a secondary thread. |
| 14–19.9 | Strong | Usually eligible for prose. |
| 20+ | Dominant | One of the reading’s primary themes; still preserve contradictions. |


## 13.4 Independence and lineage
Prevent false synchronicity by tracking root evidence. `The Hermit → Virgo → Mercury → communication` is one lineage, not four independent confirmations. Independent convergence means distinct roots such as a drawn Hermit, a known natal Virgo placement, a second Virgo-decan card, and the current Moon independently in Virgo.

| EvidenceNode {  id, statement, category, rootSourceIds[], lineageParentIds[],  provenanceIds[], baseScore, adjustedScore, significanceBand,  domainTags[], insightTags[], timeTags[], active}Rule: when two candidate nodes resolve to the same root lineage, combine/annotaterather than summing them as independent evidence. |


## 13.5 Contradiction preservation
The compiler must actively search for materially supported opposing themes and represent them as tensions instead of forcing one narrative. Example: Jupiter/Three of Wands/Ace of Wands expansion signals versus Saturn/Four of Pentacles/Emperor restriction signals.

| CompiledTension {  id, themeA, evidenceAIds[], themeB, evidenceBIds[],  strength, instruction: "Preserve both sides; do not collapse to yes/no."} |


## 13.6 Maximum model context from esoteric engine

| Evidence class | Maximum sent |
| Primary tarot observations | 8 |
| Cross-card patterns | 5 |
| Personal natal/numerology resonances | 5 |
| Current sky/transit factors | 4 |
| Deep Hermetic/Qabalistic factors | 4 |
| Explicit tensions | 3 |

Target 15–25 meaningful evidence items; hard cap 30. The database can calculate hundreds of candidates. The model should not see the discarded background.

## 13.7 Theme compiler
Before the AI call, construct 2–4 theme candidates plus 0–2 explicit tensions. A dominant theme normally needs at least two meaningful supporting signals and preferably two independent root systems. A theme with one weak modern/eclectic association cannot be dominant.

| CompiledTheme {  id, label, shortThesis, significance: "dominant"|"strong"|"supporting",  evidenceIds[], independentRootCount, domainRelevance,  cautions[], contradictions[]} |


# PART IV — AI Synthesis, Output Contract, and Evaluation

# 14. AI Architecture

## 14.1 Provider abstraction

| interface ReadingSynthesizer {  synthesize(context: ReadingContext): Promise<ReadingSynthesis>;}OpenAIReadingSynthesizer implements ReadingSynthesizerFutureAnthropicReadingSynthesizer implements ReadingSynthesizerFutureLocalReadingSynthesizer implements ReadingSynthesizer |

The rest of the application must not know model-specific response formats. Provider adapters are responsible for transforming the application-owned ReadingContext into the provider request and validating the provider response.

## 14.2 OpenAI v1 policy
- Use the server-side OpenAI API, not a ChatGPT consumer subscription. Create a dedicated OpenAI API project for this product.
- Use the Responses API through the current official Node.js SDK.
- Explicitly set `store: false` where applicable. Do not use Conversations, Assistants/Threads, vector stores, file search, background mode, web search, tools, or persistent provider state in v1.
- Use strict structured output / JSON Schema so the response can be evidence-validated before display.
- Start with the least expensive current model that passes the fixed quality suite. As of the specification date, GPT-5.6 Luna is the preferred starting candidate; reverify availability/pricing at deployment.
- Do not automatically escalate a request to a more expensive model. Model changes are admin configuration changes backed by evaluation data.

## 14.3 One-call rule
Normal reading generation uses exactly one synthesis model call. A second call is allowed only when the first result is unusable after deterministic repair attempts, and there may be only one such repair call. Never create recursive refinement loops.

## 14.4 Prompt/context budget
- Hard cap serialized dynamic ReadingContext before provider formatting. Prefer compact IDs/objects over verbose prose.
- Do not send the full tarot or correspondence database; only selected evidence and card meanings required for this reading.
- Do not send raw birth date/time/place when derived factors are sufficient for interpretation. Data minimization occurs before the provider call.
- Keep the stable system/developer prompt prefix stable to benefit from provider prompt caching where compatible with privacy requirements; do not enable extended caching features that conflict with the chosen retention posture.
- Configure a hard model output-token ceiling sized for the selected depth.

## 14.5 Reading depth

| Depth | Target prose | Spread behavior | AI evidence breadth |
| Focused | ~400–650 words, usually 4–6 paragraphs | 3-card default | Primary tarot + strongest 6–12 evidence items |
| Deep (default) | ~700–1,000 words, usually 6–8 paragraphs | 5–7 cards | Primary + 15–25 evidence items |
| Comprehensive | ~1,000–1,400 words, usually 8–10 paragraphs | 10-card Celtic Cross | Up to 30 evidence items; still selective |


# 15. Reading Output Contract

## 15.1 Structured response

| ReadingSynthesis {  title: string;                         // short, evocative, non-sensational  paragraphs: Array<{    text: string;    evidenceIds: string[];               // must exist in ReadingContext  }>;  usedEvidenceIds: string[];  qualityFlags: {    containsDirectPrediction: boolean;    containsUnsupportedBiography: boolean;    containsUnsupportedCorrespondence?: boolean;  };} |


## 15.2 Evidence requirements
- Every paragraph must contain at least one evidence ID; major interpretive paragraphs should normally contain two or more.
- For Deep/Comprehensive readings, at least four paragraphs must cite evidence rooted in actual drawn cards.
- No evidence ID may be invented. The server validates all IDs against the ticket context.
- Personal/natal/current-sky evidence may reinforce or complicate tarot themes; it should not replace the tarot as the primary reading.
- If no strong personal resonance exists, the model should simply omit one rather than announce that nothing matched.

## 15.3 Prose architecture for Deep
- Opening atmosphere: dominant pattern and central tension; usually name one or two important cards.
- Core tarot dynamics: card-position relationships, suit/element/number patterns, contradictions.
- Domain-specific interpretation: translate those themes through the user’s selected domain/focus without inventing biography.
- Personal resonance: only if relevant and available; integrate natal/numerological factors naturally.
- Current celestial moment: only if it reinforces/challenges the spread materially; avoid an astrology report.
- Deeper Hermetic/esoteric layer: only where it adds interpretive value rather than decorative density.
- Integration: bring the tensions together and leave the user with a clear symbolic frame to apply themselves; no command or deterministic prediction.
The actual model may use 6–8 paragraphs and can merge/omit stages when evidence does not justify a layer. Avoid headings for each esoteric subsystem.

## 15.4 Style rules
- Use concrete symbolic language: identify actual cards, positions, recurring elements, or named traditional correspondences when important.
- Do not expose numeric resonance scores or say “the algorithm detected.” Translate significance into natural phrases such as “one of the strongest patterns,” “a notable secondary thread,” or “a quieter resonance.”
- Do not say “based on the data you entered.” Prefer “your natal pattern,” “the current celestial moment,” or direct symbolic description.
- Do not repeatedly say “may,” “might,” or disclaimer language in every sentence; calibrate claims through conditional interpretation instead.
- Do not end with a question, an invitation to chat, or “Would you like me to…”.
- Do not use generic motivational filler, therapy language, or diagnostic labels.
- Do not reveal another person’s supposed secret thoughts or actions. Relationship readings describe dynamics/symbolism, not facts about third parties.
- Do not recommend concrete financial, legal, medical, or high-stakes actions on divinatory grounds.

## 15.5 Example of desired justification density

| Desired: “The Hermit’s Virgo correspondence becomes especially relevant because the same Virgo emphasis appears elsewhere in the spread and in the personal factors available to this reading. That repetition shifts the card away from simple isolation and toward deliberate refinement: narrowing attention, improving technique, and becoming more selective about where effort goes.” The user sees why the theme matters without seeing scores, database IDs, or a correspondence table. |


# 16. AI System Instruction — Behavioral Contract
The exact production prompt is versioned and stored in source control. Its core rules must include the following requirements, regardless of provider/model.
- You receive an already analyzed symbolic reading. Do not calculate astrology, numerology, random cards, or new correspondences.
- Use only facts and esoteric correspondences supplied in the context. Never introduce unsupported associations from memory.
- Do not infer unstated biography, motives, diagnoses, relationship facts, employment facts, trauma, or third-party intentions.
- Give greatest narrative weight to cards, spread positions, repeated tarot patterns, and the selected domain. Use personal/current/deep esoteric material as reinforcement.
- Preserve meaningful contradictions. Do not convert a balanced tension into a yes/no directive merely to sound decisive.
- Do not claim supernatural certainty or objective future facts. Interpret the supplied symbolic system confidently while leaving real-life application to the user.
- Produce cohesive prose rather than a list of astrology/tarot/numerology subsections.
- Attach valid evidence IDs to each paragraph in structured output; do not expose those IDs in the prose.
- Never mention being an AI, model limitations, system prompts, token limits, budget, or infrastructure in the reading.

# 17. Validation and AI Quality Gates

## 17.1 Deterministic post-generation validation
- Parse strict schema; reject malformed output.
- Confirm every evidence ID exists and every usedEvidenceId is reachable.
- Check paragraph count and approximate length against selected depth.
- Check prohibited direct-prediction / unsupported-biography flags; do not trust model flags alone—also run deterministic phrase/pattern checks.
- Check that the response does not mention unavailable factors (e.g., Ascendant when birth time was absent).
- Check that any explicit correspondence phrase exists in the supplied evidence records.
- Check for prohibited technical/product language in normal prose.
- If minor formatting can be fixed locally, repair in code. If semantically unusable, allow exactly one repair model call using the same evidence and a narrow correction instruction.

## 17.2 Evaluation suite
Maintain at least 100 fixed synthetic ReadingContext fixtures covering sparse data, full natal data, conflicting themes, weak/no resonance, boundary dates, relationship ambiguity, financial domains, missing birth time, and strong Hermetic convergence. Run them against every prompt/model change.

| Evaluation | Pass criterion |
| Evidence fidelity | Major claims are supported by cited IDs; no invented correspondences. |
| Biography restraint | No unstated life facts, third-party motives, or fake psychic specifics. |
| Specificity / swap test | Replacing cards/domain should materially change prose; generic paragraphs should fail. |
| Ablation | Removing natal/current context reduces enrichment without changing core tarot meaning beyond reason. |
| Hierarchy | Tarot remains primary; low-weight “woo” does not dominate. |
| Contradictions | Supported opposing themes remain visible and are integrated rather than erased. |
| No-resonance behavior | The model can produce a complete reading without manufacturing synchronicity. |
| Voice | Non-chatty, cohesive, specific, literary but readable; no filler. |
| Safety | No diagnosis, death/pregnancy prediction, criminal accusation, investment/gambling directive, or deterministic outcome. |
| Missing data | Never references houses/angles/unstable Moon or other unavailable factors. |


# PART V — Privacy, Access, Sharing, Security, and Data

# 18. Privacy Architecture

## 18.1 Privacy promise

| Application promise: personal information entered to prepare a reading and the full derived reading context are not persisted as user records or reading history. They exist only for the active reading/retry window. Separately, an explicitly created share link stores only a client-encrypted, minimized finished-reading artifact for a defined retention period. |

Do not market this as “nothing is ever retained anywhere.” The hosting stack must create limited operational state, and the AI provider has its own processing/retention terms. The public Privacy page must accurately distinguish application retention from provider processing.

## 18.2 Data classification

| Class | Examples | Persistence |
| Personal input | Birth date, birth time, birthplace, structured reading selections | Ephemeral only; never relational DB/log/analytics. |
| Derived private context | Natal factors, numerology, transit matches, resonance graph, selected evidence | Ephemeral only; inside encrypted short-lived reading ticket and process memory. |
| Tarot draw | Cards, orientations, positions, canonical draw timestamp | Ephemeral unless user deliberately creates share artifact, where card display data may be included. |
| AI request/response | Minimized ReadingContext sent to provider; generated prose | Not persisted by app as reading history. Provider processing governed by configured API/data-control terms. |
| Anonymous authorization | Authorization/session credential and session epoch | Persistent cookie/verification state as required; contains no reading information. |
| Rate-limit state | HMAC-derived anonymous installation bucket, counts, expiry | Short-lived operational persistence only. |
| Aggregate cost/health | Request counts, token/cost totals, failures, latency aggregates | Persistent aggregate operations data; no reading content. |
| Share artifact | Client-encrypted ciphertext, IV/algorithm metadata, random share ID, expiry | Persistent up to configured TTL (default 90 days), then deleted. |


## 18.3 Logging rules
- Never log request bodies for reading preparation, interpretation, birthplace search, or share creation.
- Never log raw authorization cookie, global access code, admin secret, OpenAI API key, birth fields, cards, prompts, or AI prose.
- Web server access logs should omit query strings and sensitive headers; share fragment keys are not transmitted by browsers but still never parse/store them server-side.
- Error logs may include opaque request IDs, route, semantic error class, response time, container/version, and stack trace after scrubbing local variable payloads.
- Disable framework/request debug logging in production if it can serialize bodies.
- No Sentry/session replay/Hotjar/Google Analytics or similar in v1. If future observability vendors are added, conduct a data-flow review first.

# 19. Stateless Reading Ticket and Retry Design
A purely memory-only reading disappears on any server restart and makes safe retries difficult. The preferred compromise is a short-lived encrypted/signed reading ticket that the browser holds. The backend persists no reading row.

## 19.1 Ticket behavior

| POST /api/readings/prepare  server creates canonical draw + context  serialize minimal retry-capable compiled context  encrypt + authenticate using server READING_TICKET_SECRET (AES-GCM/JWE-equivalent)  include issuedAt + expiresAt (~15 min) + one reading nonce  return opaque ticket to browserPOST /api/readings/interpret { ticket }  decrypt/authenticate  reject expired/tampered ticket  use exact same cards + celestial timestamp + compiled evidence  call AI if budget permitsNo readings table is created. |


## 19.2 Ticket constraints
- Keep in browser memory, not localStorage/IndexedDB. Normal refresh may end the reading; do not promise recovery across reload.
- Ticket TTL default 15 minutes, configurable between 5 and 30 minutes.
- Ticket contains only information required to reproduce the interpretation retry. Do not include the global access code or OpenAI key.
- Use authenticated encryption and key rotation support. Include schema version and key ID.
- If expired: “This reading has closed. Begin a new reading when you’re ready.” Do not redraw behind the user’s back.

# 20. Private Share Links

## 20.1 User intent and UX
A reading is not saved automatically. After the reading, the user may choose “Create private share link.” Before creation, show a plain explanation of what will and will not be saved.

| SHARE THIS READINGA private copy of the finished reading will be created.Included✓ Reading title and text✓ Cards, positions and orientations✓ General reading topic/focus✓ Reading dateNot included— Birth date, birth time or birthplace— Full natal/numerology calculations— Detailed evidence/resonance graph— AI request or promptThe reading itself may mention derived astrological or numerologicaldetails when they were relevant.Private links expire after 90 days.[ Create private link ] |


## 20.2 Client-side encryption protocol

| 1. Browser constructs SanitizedShareArtifact JSON.2. Browser generates random 256-bit AES key using Web Crypto.3. Browser generates random 96-bit nonce/IV.4. Browser encrypts UTF-8 JSON with AES-256-GCM.5. Browser POSTs only ciphertext + IV + algorithm/schema metadata.6. Server generates/accepts a cryptographically random >=128-bit share ID.7. Server stores ciphertext and expiry; it never receives the AES key.8. Browser builds URL:   https://example.com/r/{shareId}#{base64url-key}9. On view, authenticated browser fetches ciphertext by shareId.10. Client reads URL fragment, decrypts locally, validates share schema, renders.Important: URL fragments are normally not included in HTTP requests. Never copythe fragment into analytics/logging/server calls. |


## 20.3 Sanitized share schema

| SanitizedShareArtifact {  schemaVersion: 1;  createdAt: ISO8601;  broadDomainLabel: string;  focusLabel?: string;  title: string;  cards: Array<{    cardId, displayName, orientation, positionLabel  }>;  paragraphs: string[];  presentationVersion: string;}EXCLUDE: date of birth, time/place, natal chart, numerology object, current-skyobject, resonance scores, evidence IDs, prompt, model metadata, access credential. |


## 20.4 Retention
Default share TTL: 90 days from creation. A scheduled maintenance task deletes expired rows daily. Because there are no user accounts, do not promise that the creator can manage/delete individual old links after losing the URL. If a user retains the URL, a future v1.1 could include a separate deletion secret; not required for v1.
If DigitalOcean whole-Droplet backups are enabled, the public Privacy page must explain that encrypted share ciphertext deleted from the live database may remain in infrastructure backups until those backups age out. Raw personal reading inputs should never enter the database and therefore should not be present in database backups.

# 21. Global Access-Code and Anonymous Authorization

## 21.1 Shared access code
- One global admission code, generated from cryptographically random bytes with at least 128 bits of entropy. A human-readable grouped base32/base64url representation is acceptable.
- Do not use tarot words, dates, names, or memorable phrases.
- Never embed the plaintext code in frontend source, environment variables exposed to Next.js client bundles, or version control.
- Persist only an Argon2id password hash of the code (or bootstrap from a server secret, then migrate to settings).
- Admin can rotate the admission code. Rotation normally affects new browser authorizations only; a separate session-epoch action can invalidate all existing authorized browsers.

## 21.2 Anonymous browser authorization
After valid code entry, issue a random anonymous installation/session credential in an `HttpOnly; Secure; SameSite=Strict` cookie. Do not use localStorage for the authorization token.

| Cookie conceptual claims/payload:  installationId: random 256-bit value or opaque session identifier  sessionEpoch: integer  issuedAt  expiresAt (recommended 180 days, sliding refresh optional)Cookie is authenticated/signed or references a hashed token server-side.It contains no name, email, birth information, reading choice, or history. |


## 21.3 Abuse/rate-limit key
Derive `rateKey = HMAC_SHA256(installationId, RATE_LIMIT_PEPPER)` and store only the derived key in short-lived rate-limit buckets. Do not fingerprint browser hardware, canvas, fonts, IP/device identifiers, or advertising IDs.

## 21.4 Access-code brute-force protection
- Per-IP and global failed-attempt throttling on `/api/access/unlock`; fixed/generic failure copy.
- Exponential or bucketed backoff after repeated failures; cap request rate well below meaningful brute-force throughput.
- Optional short proof-of-work/CAPTCHA only if real abuse appears; avoid third-party CAPTCHA in v1 due to privacy/external telemetry.
- Admin emergency control to disable all new unlocks without affecting already-authorized sessions if needed.

# 22. Web Security Baseline

## 22.1 Required security headers

| Strict-Transport-Security: max-age=31536000; includeSubDomainsContent-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';  img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none';  base-uri 'self'; form-action 'self'; frame-ancestors 'none'X-Content-Type-Options: nosniffReferrer-Policy: no-referrerPermissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()X-Frame-Options: DENYX-Robots-Tag: noindex, nofollow, noarchive |

Tighten CSP further after production build inspection; if framework style injection allows eliminating `unsafe-inline`, do so. No remote fonts, analytics scripts, or CDN JavaScript in v1.

## 22.2 HTTP/cache behavior
- `/api/access/*`, `/api/readings/*`, `/api/shares/*`, and reading pages: `Cache-Control: no-store`.
- Static versioned assets may use long immutable caching.
- Never include birth data or reading tickets in URLs/query parameters.
- Use CSRF defenses appropriate to same-site cookie authentication for mutating routes (SameSite=Strict plus Origin/Host validation and CSRF token where warranted).
- Validate maximum body sizes at reverse proxy and app route. Reject unexpectedly large payloads before parsing.
- Database, Next.js internal port, and admin-only infrastructure ports are never publicly exposed.

## 22.3 Search-engine exclusion

| robots.txtUser-agent: *Disallow: /HTML meta:<meta name="robots" content="noindex,nofollow,noarchive"> |

Robots directives are privacy hints, not access control. Every content route, including share routes, still requires valid application authorization.

# 23. Persistent Data Model
Use PostgreSQL for operational/configuration data only. There is deliberately no users table, profiles table, readings table, natal chart table, prompts table, or AI output archive.

## 23.1 Recommended tables

| app_settings (singleton / versioned config)  id  access_code_hash  admin_secret_hash  session_epoch  ai_enabled  unlock_enabled  ai_provider  ai_model  daily_budget_microusd  monthly_budget_microusd  max_reading_cost_microusd  per_install_hourly_limit  per_install_daily_limit  global_ai_concurrency  share_ttl_days  updated_atusage_daily  usage_date_utc PK  ai_requests  repair_requests  input_tokens  output_tokens  estimated_cost_microusd  provider_errors  validation_failuresrate_limit_buckets  rate_key_hash  bucket_type  bucket_start  count  expires_at  PK(rate_key_hash, bucket_type, bucket_start)budget_state  period_type              // daily/monthly  period_start_utc  committed_microusd  reserved_microusd  updated_at  PK(period_type, period_start_utc)budget_reservations  reservation_id UUID PK  created_at  expires_at  reserved_microusd  finalized_microusd nullable  status                   // reserved/finalized/released/expired  // NO reading content or user identifiers beyond optional short-lived rate key hashshare_artifacts  share_id                  // >=128-bit random, base64url  ciphertext BYTEA  iv BYTEA  algorithm  schema_version  byte_size  created_at  expires_at  PK(share_id)schema_migrations  version, applied_at |


## 23.2 Database constraints
- Use integer micro-USD units for budgets to avoid floating-point money errors.
- Budget reservation and finalization occur inside database transactions with row-level locking or atomic conditional updates.
- Create TTL indexes/jobs for `rate_limit_buckets`, expired reservations, and `share_artifacts`.
- Enforce maximum ciphertext byte size and 90-day default share expiry at the server, not only the client.
- Never add a “temporary readings” table as a shortcut. The encrypted reading ticket exists specifically to avoid that persistence.

# 24. HTTP/API Contract
All response bodies use stable semantic error codes while frontend copy remains reading-oriented. Internal status codes/logs may be technical.

| Method | Route | Auth | Input | Output | Notes |
| POST | /api/access/unlock | Public | { accessCode } | Set auth cookie; { ok:true } | Rate limited; no-store. |
| POST | /api/access/lock | Authorized | none | Clear auth cookie | No persistence. |
| GET | /api/config/public | Authorized | none | Sanitized UI/config defaults | No secrets/budgets in public response. |
| GET | /api/places/search?q= | Authorized | Query text | City/region/country candidates | Queries own local DB/index only; no external geocoder. |
| POST | /api/readings/prepare | Authorized | Structured reading inputs + idempotency key | Draw, deterministic preview, encrypted reading ticket | No AI call yet or optionally chain internally; preserve same draw. |
| POST | /api/readings/interpret | Authorized | Encrypted reading ticket | Validated ReadingSynthesis + display context | Budget reserve before provider call. |
| POST | /api/readings/repair | Authorized/Internal | Ticket + failed output digest | At most one repaired synthesis | Can be internal-only orchestration. |
| POST | /api/shares | Authorized | Ciphertext + IV + metadata | shareId + expiresAt | Server never receives encryption key. |
| GET | /api/shares/{shareId} | Authorized | none | Ciphertext + IV + metadata | No-store; 404/410 semantic unavailable. |
| GET | /api/admin/status | Admin | none | Budgets, usage, health, share aggregate | Never reading content. |
| PATCH | /api/admin/settings | Admin | Validated config subset | Updated sanitized config | Audit config change without secret plaintext. |
| POST | /api/admin/access-code/rotate | Admin | new/generated code | One-time plaintext result + hash stored | Never log plaintext. |
| POST | /api/admin/sessions/invalidate | Admin | confirmation | Increment session_epoch | Invalidates all auth cookies. |
| POST | /api/admin/shares/purge-expired | Admin | none | Count removed | No content return. |


## 24.1 Reading prepare request

| {  "idempotencyKey": "uuid",  "domainId": "career",  "focusId": "new_direction",  "insightId": "not_obvious",  "timePerspectiveId": "developing",  "depth": "deep",  "reversalsEnabled": true,  "birth": {    "date": "1992-05-17",               // optional    "time": null,                       // optional local civil time    "placeId": null,                    // selected internal place ID    "dstAmbiguityChoice": null  }}No arbitrary text fields are accepted. Unknown properties are rejected. |


## 24.2 Prepare response

| {  "readingTicket": "opaque-encrypted-token",  "expiresAt": "...",  "display": {    "readingMoment": "...",    "spread": {...},    "cards": [...],    "basisSummary": {...},    "deterministicFallback": {...}  }} |


## 24.3 Error semantics

| Internal semantic code | HTTP | Frontend behavior |
| ACCESS_DENIED | 401/403 | Show access-code failure copy. |
| RATE_TEMPORARILY_UNAVAILABLE | 429 | Show reading-oriented temporary availability copy; never mention rate limits. |
| AI_CAPACITY_UNAVAILABLE | 503 | Offer deterministic reading / return later. |
| AI_PROVIDER_INTERRUPTED | 502/504 | Preserve ticket and offer “Continue this reading.” |
| READING_TICKET_EXPIRED | 410 | “This reading has closed.” |
| CELESTIAL_CONTEXT_PARTIAL | 200 warning | Continue reading; note optional layer unavailable. |
| PLACE_AMBIGUOUS | 422 | Ask user to choose one of returned candidates. |
| SHARE_UNAVAILABLE | 404/410 | Shared reading no longer available. |
| INVALID_INPUT | 422 | Friendly field-specific structured validation. |


# PART VI — Implementation Stack, Design System, Administration, and Testing

# 25. Recommended Technology Stack

| Layer | Choice | Reason |
| Language | TypeScript (strict mode) | Single language across web/server; strong schema/evidence safety. |
| Framework | Next.js current Active LTS (verify patched release at build time) | Claude-friendly, server routes, SSR, strong deployment ecosystem. |
| Runtime | Node.js 24 LTS at specification date; verify current LTS | Stable production baseline. |
| UI | React via Next.js + CSS Modules/Tailwind only if kept disciplined | Responsive accessible browser UI. |
| Validation | Zod + JSON Schema generation where practical | Reject arbitrary/unknown user fields and validate provider output. |
| Database | PostgreSQL 17 | Transactional budget enforcement and TTL operational storage. |
| DB access | Prisma or Drizzle; prefer Drizzle for transparent SQL/transactions | Typed schema without obscuring atomic budget logic. |
| Reverse proxy/TLS | Caddy | Simple automatic HTTPS and reverse proxy. |
| Containers | Docker Engine + Docker Compose plugin | Repeatable single-Droplet deployment. |
| AI SDK | Official `openai` Node SDK | Supported Responses API integration. |
| Crypto | Node `crypto` + Web Crypto | CSPRNG, HMAC, AES-GCM client shares, ticket encryption. |
| Password hashing | Argon2id library | Shared access/admin secret hashes. |
| Testing | Vitest/Jest + Playwright + deterministic fixtures | Unit, integration, browser E2E, AI eval runner. |
| Birthplace data | GeoNames-derived dataset or equivalent permissively licensed gazetteer, imported at build/admin time | No runtime external geocoder; city/region/country + coordinates + timezone. |

If Claude chooses an equivalent library, it must document the reason and preserve every architectural/privacy property. Do not silently substitute managed auth, Firebase, Supabase user profiles, third-party analytics, or externally hosted geocoding because they conflict with the design.

# 26. Repository and Module Layout

| /app  /(public-gate)  /reading  /r/[shareId]  /methodology  /privacy  /terms  /admin  /api/.../components  /access  /reading-setup  /tarot  /reading-result  /transparency  /share/domain  /tarot  /astrology  /numerology  /correspondences  /resonance  /reading-compiler  /safety/lib  /auth  /crypto  /budget  /rate-limit  /openai  /db  /logging  /config/data  /tarot  /correspondences  /sources  /spreads  /intake  /places (generated/indexed, not necessarily committed whole)/styles/tests  /unit  /fixtures  /integration  /e2e  /ai-evals/scripts  import-places  validate-content  run-ai-evals  generate-access-code  rotate-secrets/db  migrations |


## 26.1 Layering rule

| UI -> application services -> deterministic domain engines -> provider adapters                                  \-> persistence adaptersDomain engines must not import Next.js, OpenAI SDK, database clients, or UI code. |


# 27. Visual Design System and Placeholder Art

## 27.1 Visual direction
Aim for ethereal, restrained, sophisticated, and legible rather than “witch-shop kitsch.” The interface should feel quiet and atmospheric. Placeholder art should look intentional, not unfinished.

| Token | Direction |
| Background | Near-midnight neutral / charcoal with optional very subtle radial celestial texture. |
| Text | Warm ivory/high-contrast neutral. |
| Accent | Muted lavender/violet for controls and selected states. |
| Secondary accent | Pale antique gold for esoteric labels/dividers, used sparingly. |
| Typography | Elegant display serif for titles + highly readable sans serif for UI/body. Self-host/build-bundle fonts; no runtime Google Fonts request. |
| Motion | Slow short fades/reveals/orbit line movement; reduced-motion removes nonessential movement. |
| Cards | Fine borders, Roman numerals, card name, suit/element glyphs, astrological glyph when canonical, deterministic SVG star/orbit/geometric motif. |
| Surfaces | Low-glare cards/panels with clear boundaries; no excessive glassmorphism or glow. |


## 27.2 DeckTheme abstraction

| interface DeckTheme {  id: string;  version: string;  cardFace(card: TarotCardDefinition): CardPresentation;  cardBack: AssetRef;  typographyTokens: ...;  borderTokens: ...;  symbolSet: ...;  attribution: ...;  license: ...;}Initial: "Celestial Prototype"Future: commissioned/licensed decks can replace presentation without changing card identity. |


## 27.3 Accessibility
- Target WCAG 2.2 AA for contrast, keyboard operation, focus visibility, labels, and semantics.
- Minimum comfortable touch target ~44 CSS px; form input font >=16px on mobile to avoid zoom behavior.
- Card imagery has concise alt text that names card, orientation, and position; decorative celestial motifs are hidden from assistive technology.
- All animations obey `prefers-reduced-motion`; card reveal remains understandable without motion.
- Do not encode orientation, element, or availability only by color.
- Screen-reader reading order: title/domain -> cards with positions -> reading prose -> basis/share controls.

# 28. Administrator Console
The admin console exists for operating the service, not inspecting users. Protect it with a separate high-entropy admin secret or equivalent isolated admin mechanism. Do not reuse the shared user access code.
- Show AI enabled/disabled state and one-click emergency kill switch.
- Show UTC daily/monthly aggregate AI requests, input/output tokens, estimated/actual cost, validation failures, provider errors, and latency percentiles.
- Configure model, daily budget, monthly budget, per-reading maximum, hourly/daily anonymous browser ceilings, and global concurrency.
- Generate/rotate the shared global access code. Display generated plaintext once; store only Argon2id hash.
- Increment session epoch to invalidate all authorized browsers, with explicit confirmation.
- Show active encrypted share count, total ciphertext bytes, upcoming expirations, and purge-expired action. Never decrypt/show share content.
- Show database/app version, current build SHA, migrations, OpenAI connectivity health (without sending a reading), and astronomy-provider fixture health.
- Never offer a “view recent readings/prompts” screen because no such records should exist.

# 29. AI Budget and Abuse Controls

## 29.1 Initial recommended configuration

| Control | Initial value | Rationale |
| Daily application AI budget | $2.00 | Small private beta; intentionally conservative and easily changed. |
| Monthly application AI budget | $30.00 | Hard application-side ceiling independent of provider controls. |
| Max normal reading reservation | $0.05 | Comfortable envelope for a compact deep request at current low-cost model pricing; verify with telemetry. |
| Max repair reserve | Additional $0.05 only for one unusable-response repair | Worst-case bounded. |
| Per authorized browser/hour | 6 AI interpretations | Prevents simple loops while remaining generous for normal use. |
| Per authorized browser/day | 20 AI interpretations | Protects shared pool; configurable. |
| Per-browser concurrency | 1 | Double clicks/tabs cannot fan out model calls. |
| Global AI concurrency | 3 | Protects small Droplet/provider/budget; configurable. |
| Normal calls per reading | 1 | Core architecture. |
| Repair calls | 0 normally; max 1 exceptional | No runaway loops. |

The UI must never expose dollar balances or “AI tokens remaining.” When the full interpretation is unavailable because the shared allowance is temporarily closed, present the deterministic reading gracefully and use reading-oriented copy.

## 29.2 Atomic budget reservation

| BEGIN TRANSACTION  lock current daily + monthly budget rows  expire stale reservations if applicable  proposed = worstCaseRequestCostMicrousd  IF committed + reserved + proposed > configured hard limit:      rollback; do not call provider  ELSE:      create reservation; increment reservedCOMMITCall OpenAI exactly once.BEGIN TRANSACTION  finalize reservation with actual calculated usage cost  move reserved -> committed  increment aggregate usage countersCOMMITOn provider failure: release reservation (or finalize any billable usage if known). |


## 29.3 Provider controls as second barrier
Create a dedicated OpenAI project for the app. Configure allowed model(s), project rate limits, spend alerts, and a hard spend limit if the current OpenAI project controls support/enforce it. Do not rely on a provider “budget” alone because vendor behavior can change; the application-side transaction is authoritative.

# 30. Observability Without Reading Surveillance
- Health metrics: request rate by route, error class, p50/p95 latency, CPU/RAM/disk, DB connections, container restarts.
- AI metrics: aggregate calls, repair count, input/output tokens, cost, provider error classes, validation failure rate; no prompt/prose storage.
- Domain metrics such as “career readings today” are deliberately not collected in v1 because they create behavioral reading history with little operational value.
- Use opaque correlation IDs generated per request; never derive them from access credentials or reading content.
- Retain operational logs for a short defined period (e.g., 14–30 days), rotate them, and document the policy.

# 31. Test Strategy

## 31.1 Deterministic unit/integration tests
- Tarot: deck completeness, unique draw, Fisher–Yates integer helper, reversal distribution, spread binding, no context argument leakage.
- Numerology: known fixtures for each calculation, master-number boundaries, leap dates, personal-year/month/day rollover.
- Astrology: known chart fixtures across time zones/DST, date-only uncertainty envelopes, Moon sign transitions, retrogrades, houses, high-latitude fallback, aspect orbs, applying/separating state.
- Knowledge base: unique IDs, valid source references, no orphan edges, class values, conflicts, active version rules.
- Resonance: lineage collapse, independent root counting, score thresholds, contradictory themes, no-result outcome.
- Privacy: request logger tests prove no bodies/sensitive headers; DB schema scan proves prohibited reading/user tables absent.
- Sharing: Web Crypto round-trip, wrong fragment key failure, ciphertext-only server payload, expiry, max size, inaccessible without auth.
- Authorization: code hash verification, rate limits, cookie flags, epoch invalidation, access rotation.
- Budget: race/concurrency test with many simultaneous requests cannot exceed configured application budget.
- Idempotency: repeated prepare/interpret calls with same idempotency key cannot create duplicate charge/draw within validity window.

## 31.2 Browser/E2E cases
- Unauthorized root -> code -> authorized reading setup.
- Wrong code and throttled attempts.
- No birth data -> complete reading.
- Date only -> conservative factors and no fabricated houses.
- Exact time/place -> full natal layer.
- Interpretation provider failure -> same cards preserved -> retry succeeds.
- Budget closed -> deterministic result remains usable, technical budget terms never shown.
- Create encrypted share -> open in fresh unauthorized browser -> code gate -> successful local decrypt.
- Expired share -> graceful unavailable screen.
- Reduced motion, keyboard-only, narrow 320px viewport, desktop layout, screen-reader semantics.

# PART VII — Production Launch Runbook: DigitalOcean + Domain + OpenAI API

# 32. Production Topology
Initial production uses one DigitalOcean Droplet for simplicity and cost control. The architecture must still keep services isolated so they can later move to managed PostgreSQL, a load balancer, or multiple app servers without domain-engine rewrites.

| Internet   |DigitalOcean Cloud Firewall   |  80/443 public; 22 restricted to administrator IP   vDroplet: Ubuntu 24.04 LTS   |   +-- Docker Compose network (private)       +-- caddy      :80/:443 published to host       +-- web        :3000 internal only       +-- postgres   :5432 internal onlyWeb container outbound HTTPS -> api.openai.comWeb container -> local packaged/imported place databaseCaddy -> automatic TLS for the configured domain |


## 32.1 Initial Droplet sizing
Recommended initial size: approximately 2 vCPU / 4 GB RAM / at least 50–80 GB SSD in the nearest suitable DigitalOcean region. The app is not compute-heavy; this margin primarily supports Next.js, PostgreSQL, Docker, OS caching, deployment builds, and operational headroom. If a lower-cost 2 GB plan is used, build images in CI/local rather than on the production Droplet and monitor memory closely.

## 32.2 Operating-system choice
Use Ubuntu 24.04 LTS for the initial production runbook. DigitalOcean also offered Ubuntu 26.04 LTS as of August 2026, but 24.04 is intentionally selected as a mature LTS baseline with broad Docker/package compatibility. Re-evaluate at a future major deployment.

# 33. DigitalOcean Account and Droplet Provisioning

## 33.1 Pre-provisioning
- Create/secure a DigitalOcean account with MFA.
- Generate a dedicated SSH key pair on the administrator workstation. Do not use password SSH.
- Upload the public key to DigitalOcean.
- Choose a domain and ensure you can edit its DNS at the registrar or DigitalOcean DNS.
- Choose the production hostname, e.g. `tarot.example.com` or the apex domain. Use a non-secret hostname; security comes from the access gate.

## 33.2 Create the Droplet
- In DigitalOcean Control Panel choose Create → Droplets.
- Image: Ubuntu 24.04 LTS x64.
- Region: geographically appropriate for expected invited users and OpenAI connectivity; do not optimize for a single person’s exact location unless justified.
- Plan: start near 2 vCPU / 4 GB; resize vertically later if metrics justify it.
- Authentication: SSH key only. Do not enable root password access.
- Enable DigitalOcean Monitoring/metrics from creation.
- Enable IPv6 and VPC networking if consistent with your account setup.
- Enable automated backups if you accept the documented encrypted-share-backup retention tradeoff.
- Tag the Droplet, e.g. `private-tarot-prod`, so the Cloud Firewall can target the tag.
- Create a non-root sudo administrator during first configuration (or via cloud-init) and disable password-based SSH/root login.

## 33.3 Suggested cloud-init skeleton

| #cloud-configusers:  - name: deploy    groups: [sudo]    shell: /bin/bash    sudo: ["ALL=(ALL) NOPASSWD:ALL"]    ssh_authorized_keys:      - ssh-ed25519 REPLACE_WITH_ADMIN_PUBLIC_KEYssh_pwauth: falsedisable_root: truepackage_update: truepackages:  - ca-certificates  - curl  - git  - gnupg  - fail2ban  - unattended-upgrades# Review DigitalOcean's current production-ready Droplet guidance before use.# Prefer DigitalOcean's current recommended cloud-init template where it differs. |

Do not paste a private SSH key into cloud-init. The public key is safe to include; secrets are not.

# 34. DigitalOcean Cloud Firewall
Use the DigitalOcean Cloud Firewall as the primary network perimeter. It is stateful and separate from UFW. The Docker documentation warns that published container ports can interact unexpectedly with host firewall tooling; therefore expose only Caddy’s 80/443 at Docker level and use the DigitalOcean firewall to restrict the Droplet externally.

## 34.1 Inbound rules

| Protocol/port | Source | Purpose |
| TCP 22 | Administrator’s fixed IP/CIDR only | SSH administration. If IP changes, update firewall before connecting. |
| TCP 80 | 0.0.0.0/0 and ::/0 | ACME HTTP challenge/HTTP→HTTPS redirect. |
| TCP 443 | 0.0.0.0/0 and ::/0 | HTTPS application traffic. |


## 34.2 Outbound rules
Simplest v1: allow all outbound IPv4/IPv6 traffic. If later restricting egress, ensure HTTPS/443 for OpenAI/DigitalOcean/package registries, DNS 53 to resolvers, NTP 123 as required, and package/update endpoints remain reachable. Incorrect egress restriction can break certificate issuance and API calls.

## 34.3 Explicitly not public
- TCP 3000 (Next.js)
- TCP 5432 (PostgreSQL)
- Docker daemon socket
- Any metrics/admin container port other than through authenticated web routes

# 35. Domain and DNS

## 35.1 DigitalOcean DNS option
- Add the apex domain to DigitalOcean Networking → Domains.
- If moving authoritative DNS to DigitalOcean, recreate existing records first, then update registrar name servers per DigitalOcean instructions.
- Create an A record for the chosen host pointing to the Droplet IPv4.
- If IPv6 is enabled and stable, create an AAAA record pointing to the Droplet IPv6.
- Optionally add `www` CNAME to the canonical hostname and configure Caddy to redirect it; avoid duplicate application origins.
- Wait for DNS propagation and verify with `dig A host.example.com` and `dig AAAA host.example.com` where relevant.

## 35.2 TLS prerequisite
Caddy can obtain a public certificate only after the domain resolves to the Droplet and ports 80/443 are reachable. Do not start diagnosing Caddy until DNS and Cloud Firewall are verified.

# 36. Harden the Ubuntu Host

## 36.1 First login

| ssh deploy@DROPLET_IPsudo apt updatesudo apt full-upgrade -ysudo reboot |


## 36.2 SSH checks

| sudo sshd -T | grep -E "permitrootlogin|passwordauthentication|pubkeyauthentication"# Desired:# permitrootlogin no/prohibit-password according to final policy# passwordauthentication no# pubkeyauthentication yes |

Before closing the original SSH session after any SSH configuration change, open a second terminal and confirm key-based login works.

## 36.3 Automatic security updates

| sudo apt install -y unattended-upgradessudo dpkg-reconfigure -plow unattended-upgrades |

Plan monthly manual maintenance/reboot windows even with unattended security patches.

# 37. Install Docker Engine and Compose
Use Docker’s official Ubuntu apt repository rather than the distribution’s older convenience package. Recheck the current Docker Engine installation page at deployment.

| sudo apt updatesudo apt install -y ca-certificates curlsudo install -m 0755 -d /etc/apt/keyringssudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \  -o /etc/apt/keyrings/docker.ascsudo chmod a+r /etc/apt/keyrings/docker.ascecho \  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \  https://download.docker.com/linux/ubuntu \  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \  sudo tee /etc/apt/sources.list.d/docker.list > /dev/nullsudo apt updatesudo apt install -y docker-ce docker-ce-cli containerd.io \  docker-buildx-plugin docker-compose-pluginsudo systemctl enable --now dockersudo docker run --rm hello-worldsudo docker compose version |

Optional: add `deploy` to the `docker` group for convenience, understanding that Docker group membership is effectively root-equivalent. A stricter posture is to continue using `sudo docker` for production operations.

# 38. Production Directory and Secrets

| sudo mkdir -p /opt/private-tarotsudo chown deploy:deploy /opt/private-tarotcd /opt/private-tarot# Clone private repository or copy a signed release bundle.git clone REPLACE_WITH_PRIVATE_REPOSITORY_URL appcd appcp .env.example .env.productionchmod 600 .env.production |


## 38.1 Production secret rules
- `.env.production` is never committed to git and never sent to the browser bundle.
- Only variables prefixed with `NEXT_PUBLIC_` may reach browser JavaScript; do not prefix secrets.
- Generate independent random secrets for authorization signing/encryption, reading-ticket encryption, rate-limit HMAC pepper, database password, and admin credential.
- Use at least 32 random bytes for cryptographic secrets. Example: `openssl rand -base64 48`.
- Rotate secrets through an explicit key-ID/key-ring process for reading tickets if active tickets need a transition window. Access session epoch provides mass session invalidation.

# 39. Docker Production Files

## 39.1 Next.js Dockerfile

| # syntax=docker/dockerfile:1FROM node:24-bookworm-slim AS depsWORKDIR /appCOPY package.json package-lock.json ./RUN npm ciFROM node:24-bookworm-slim AS buildWORKDIR /appENV NEXT_TELEMETRY_DISABLED=1COPY --from=deps /app/node_modules ./node_modulesCOPY . .RUN npm run buildFROM node:24-bookworm-slim AS runnerWORKDIR /appENV NODE_ENV=productionENV NEXT_TELEMETRY_DISABLED=1RUN useradd --system --uid 1001 nextjsCOPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/staticCOPY --from=build --chown=nextjs:nextjs /app/public ./publicUSER nextjsEXPOSE 3000ENV PORT=3000ENV HOSTNAME=0.0.0.0CMD ["node", "server.js"] |

Configure `output: "standalone"` in Next.js. Pin image digests/releases in a hardened production pipeline when practical.

## 39.2 docker-compose.yml

| services:  caddy:    image: caddy:2-alpine    restart: unless-stopped    ports:      - "80:80"      - "443:443"      - "443:443/udp"    volumes:      - ./Caddyfile:/etc/caddy/Caddyfile:ro      - caddy_data:/data      - caddy_config:/config    depends_on:      - web    networks: [frontend]  web:    build:      context: .      dockerfile: Dockerfile    restart: unless-stopped    env_file:      - .env.production    expose:      - "3000"    depends_on:      postgres:        condition: service_healthy    networks: [frontend, backend]    healthcheck:      test: ["CMD", "node", "scripts/container-healthcheck.mjs"]      interval: 30s      timeout: 5s      retries: 3  postgres:    image: postgres:17-alpine    restart: unless-stopped    environment:      POSTGRES_DB: tarot      POSTGRES_USER: tarot      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}    volumes:      - postgres_data:/var/lib/postgresql/data    expose:      - "5432"    networks: [backend]    healthcheck:      test: ["CMD-SHELL", "pg_isready -U tarot -d tarot"]      interval: 10s      timeout: 5s      retries: 5networks:  frontend:  backend:    internal: truevolumes:  postgres_data:  caddy_data:  caddy_config: |

Do not bind PostgreSQL or Next.js directly to host ports. Only Caddy publishes internet-facing ports.

## 39.3 Caddyfile

| {$APP_DOMAIN} {  encode zstd gzip  reverse_proxy web:3000  header {    Strict-Transport-Security "max-age=31536000; includeSubDomains"    X-Content-Type-Options "nosniff"    Referrer-Policy "no-referrer"    X-Frame-Options "DENY"    X-Robots-Tag "noindex, nofollow, noarchive"    -Server  }  log {    output stdout    format json  }}# Prefer application-layer CSP because Next.js nonce/hash requirements may vary.# Ensure Caddy logs do not include sensitive headers or application request bodies. |


# 40. Production Environment Variables

| # Public configuration (server reads; expose deliberately if needed)APP_DOMAIN=tarot.example.comAPP_ORIGIN=https://tarot.example.comNODE_ENV=production# DatabasePOSTGRES_PASSWORD=<random-long-secret>DATABASE_URL=postgresql://tarot:<urlencoded-password>@postgres:5432/tarot# Access / adminAUTH_SIGNING_SECRET=<random-48+-byte-secret>READING_TICKET_KEY_CURRENT=<random-32-byte-key-base64>READING_TICKET_KEY_ID=v1RATE_LIMIT_PEPPER=<random-48+-byte-secret># Store access/admin hashes in DB after bootstrap; bootstrap variables optional:BOOTSTRAP_ACCESS_CODE_HASH=<argon2id-hash-if-needed>BOOTSTRAP_ADMIN_SECRET_HASH=<argon2id-hash-if-needed># OpenAIOPENAI_API_KEY=<project-scoped-secret>OPENAI_MODEL=gpt-5.6-lunaOPENAI_REASONING_EFFORT=lowOPENAI_MAX_OUTPUT_TOKENS_DEEP=2200OPENAI_STORE=false# Pricing used for application estimates — verify at deployment/model change:OPENAI_INPUT_USD_PER_MILLION=0.20OPENAI_CACHED_INPUT_USD_PER_MILLION=0.02OPENAI_OUTPUT_USD_PER_MILLION=1.20# Budget defaultsAI_ENABLED=trueAI_DAILY_BUDGET_USD=2.00AI_MONTHLY_BUDGET_USD=30.00AI_MAX_NORMAL_READING_USD=0.05AI_MAX_REPAIR_USD=0.05AI_PER_INSTALL_HOURLY=6AI_PER_INSTALL_DAILY=20AI_GLOBAL_CONCURRENCY=3# SharingSHARE_TTL_DAYS=90SHARE_MAX_CIPHERTEXT_BYTES=65536# Privacy/loggingLOG_LEVEL=infoREQUEST_BODY_LOGGING=falseNEXT_TELEMETRY_DISABLED=1 |

The GPT-5.6 Luna prices above were current in official OpenAI model documentation on 26 August 2026: $0.20 per million input tokens, $0.02 cached input, and $1.20 output. They are configuration values, not eternal constants. Reverify before launch and whenever the model changes.

# 41. OpenAI API Account / Project Setup — Detailed Runbook
Terminology: the production application connects to the OpenAI API, which is billed/configured separately from a consumer ChatGPT plan. Use a dedicated API project and a project-scoped key/service account for this application.

## 41.1 Create and isolate the production project
- Sign in to the OpenAI API platform and ensure billing is configured for the intended organization.
- Create a dedicated project named something explicit such as `private-tarot-production`. Do not use the default project for unrelated work.
- Add only the operator(s) who need production access. Keep ownership limited.
- Under project Model Usage / Limits, allow only the selected production model family where current controls permit it. Start with `gpt-5.6-luna`; do not enable every expensive model by default.
- Configure project rate limits conservatively relative to expected private traffic. The application has stricter internal limits, so provider limits are a second barrier.
- Configure project spend alerts and, if the current OpenAI Spend Limits controls provide a hard-enforcement option, enable a hard project spend ceiling. Recheck the current OpenAI documentation because older “monthly budget” UI behavior was historically alert-only while current spend-limit features may support enforcement.
- Create a project service account if available to the project owner, or create a dedicated project-scoped secret key. Name it `private-tarot-prod-server`.
- Restrict API-key permissions to the minimum endpoints required for inference if the current key-permission UI supports per-endpoint write controls. This app needs Responses inference; it does not need Files, Assistants, fine-tuning, vector stores, or admin APIs.
- Copy the secret immediately into the production secret store/environment. OpenAI service-account/API secrets are only displayed at creation time. Never paste the key into frontend code or commit it.

## 41.2 Data-control configuration
- OpenAI’s current API data-control documentation states that API data is not used to train or improve models unless the customer explicitly opts in.
- Standard API abuse-monitoring retention may apply (currently described as up to 30 days for Responses). Therefore the app must not claim that OpenAI retains nothing unless the project is actually approved/configured for Zero Data Retention.
- If eligible, apply for Zero Data Retention / Modified Abuse Monitoring as appropriate. Verify project-level configuration after approval.
- For Responses calls, explicitly use `store: false` in application code. Avoid background mode and persistent provider resources.
- Do not enable optional provider features that introduce additional storage merely for convenience. Re-read the endpoint-specific retention table before production launch and after major OpenAI platform changes.

## 41.3 Production connectivity smoke test
Run from the Droplet/web container only after the API key is present. Do not use a real reading or personal data for the smoke test.

| docker compose exec web node - <<'NODE'const OpenAI = require('openai').default || require('openai');const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });(async () => {  const r = await client.responses.create({    model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',    store: false,    reasoning: { effort: 'low' },    input: 'Return only the word READY.'  });  console.log(r.output_text);})();NODE |

Expected output is approximately `READY`. Remove any temporary debugging that prints full provider responses before real readings are enabled.

# 42. OpenAI Application Integration

## 42.1 Provider adapter pseudocode

| import OpenAI from "openai";const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });export async function synthesizeReading(ctx: ReadingContext) {  const request = {    model: configuredModel(),    store: false,    reasoning: { effort: configuredReasoningEffort() },    instructions: SYSTEM_PROMPT_V1,    input: JSON.stringify(minimizeForProvider(ctx)),    text: {      format: {        type: "json_schema",        name: "reading_synthesis",        strict: true,        schema: ReadingSynthesisJsonSchema      }    },    max_output_tokens: outputLimitFor(ctx.depth)  };  // Do not log `request` or raw `response`.  const response = await client.responses.create(request);  const parsed = parseStrictSynthesis(response.output_text);  validateEvidence(parsed, ctx);  return {    synthesis: parsed,    usage: {      inputTokens: response.usage?.input_tokens ?? 0,      outputTokens: response.usage?.output_tokens ?? 0,      cachedTokens: response.usage?.input_tokens_details?.cached_tokens ?? 0    }  };} |

Confirm the current SDK’s exact structured-output parameter shape during implementation because SDK interfaces evolve. Preserve the architectural requirements even if the property names change.

## 42.2 Cost estimation formula

| estimatedCostUSD =  (uncachedInputTokens / 1_000_000) * inputPricePerMillion +  (cachedInputTokens   / 1_000_000) * cachedInputPricePerMillion +  (outputTokens        / 1_000_000) * outputPricePerMillionBefore the call, reserve a conservative worst-case based on:  maxPromptTokensEstimate + maxOutputTokens + provider-specific reasoning behavior.After the call, finalize from response usage and configured pricing.The provider invoice remains the source of truth; app estimates exist for hard local control. |


## 42.3 Current cost illustration — not a guarantee
At the 26 August 2026 GPT-5.6 Luna text prices ($0.20/M input and $1.20/M output), an illustrative request with 8,000 uncached input tokens and 1,500 output tokens is roughly $0.0016 + $0.0018 = $0.0034 before any provider-specific additional billing behavior. The proposed $0.05 normal-reading reservation therefore contains substantial safety margin. The implementation must measure actual token usage and update price configuration when OpenAI pricing/model policy changes.

## 42.4 Model selection policy
- Build/evaluate first against `gpt-5.6-luna` with low or no/low reasoning as quality permits.
- Run the fixed 100+ reading evaluation suite blind against Luna and a stronger candidate such as Terra only if Luna fails meaningful quality thresholds.
- Only upgrade if quality improvement is material enough to justify the measured cost increase. Do not select a more expensive model because it sounds more premium.
- Pin a model snapshot when OpenAI exposes a stable snapshot suitable for production and when evaluation confirms it, rather than silently accepting behavior changes from an alias. Maintain an admin-configurable model ID.
- Re-run evaluations before every model/prompt change.

# 43. Initialize and Launch the Containers

## 43.1 First build

| cd /opt/private-tarot/app# Validate configuration before building.npm cinpm run typechecknpm test# Production container build/start.sudo docker compose --env-file .env.production build --pullsudo docker compose --env-file .env.production up -dsudo docker compose ps |


## 43.2 Database migrations

| # Run through a dedicated migration command/container. Example:sudo docker compose --env-file .env.production exec web npm run db:migrate# Seed only non-personal reference/config data:sudo docker compose --env-file .env.production exec web npm run db:seed-reference |

Migrations must not introduce a users/readings/profile table without an explicit later design decision. Seed scripts populate app configuration, spread/intake/reference data as needed, not personal data.

## 43.3 Bootstrap access/admin credentials

| # Example application scripts (Claude must implement):sudo docker compose exec web npm run admin:generate-access-code# prints plaintext ONCE and stores Argon2id hashsudo docker compose exec web npm run admin:generate-admin-secret# prints plaintext ONCE and stores hash |

Save the plaintext global access code in your own secure password manager and distribute it out-of-band to invited users. Save the separate admin secret privately; never distribute it as the app access code.

## 43.4 Caddy/TLS checks

| sudo docker compose logs --tail=200 caddycurl -I https://$APP_DOMAIN/# Confirm certificate and headers:curl -sS -D - -o /dev/null https://$APP_DOMAIN/ | sed -n '1,40p'# Confirm unauthorized root shows the access gate, not application data. |


## 43.5 Service health checks

| sudo docker compose pssudo docker compose logs --tail=200 websudo docker compose logs --tail=200 postgres# DB readiness from web networksudo docker compose exec postgres pg_isready -U tarot -d tarot# App-specific health route should be minimal and non-sensitive:curl -fsS https://$APP_DOMAIN/api/health |

The public health endpoint should return only coarse status (e.g., `{status:"ok"}`) and must not reveal environment variables, software internals, database version, model/budget state, or stack traces. Rich health belongs in admin.

# 44. Pre-Launch Production Verification
- Confirm DNS points only to intended Droplet; remove stale A/AAAA records.
- Confirm HTTPS is valid and HTTP redirects to HTTPS.
- Confirm Cloud Firewall exposes only 22 from admin CIDR and 80/443 publicly.
- Run `docker ps` and confirm only Caddy ports are host-published.
- Confirm PostgreSQL cannot be reached from the public internet.
- Confirm root and shared-reading routes send `noindex` headers and robots.txt blocks all crawling.
- Confirm authorization cookie is Secure, HttpOnly, SameSite=Strict, and does not contain reading data.
- Confirm access code is absent from git, Docker image history, frontend JavaScript, HTML source, and logs.
- Confirm OpenAI API key is absent from client bundles, browser network responses, logs, and Docker build ARG/history.
- Confirm request bodies are not logged.
- Run one synthetic no-birth reading and verify no DB row contains the reading/cards/prose.
- Run one synthetic exact-birth reading and verify birth data appears nowhere in DB/logs after ticket expiry.
- Create a share link; inspect DB and confirm only ciphertext/IV/metadata exist. Confirm server cannot decrypt without URL fragment key.
- Open the share URL in a fresh/incognito browser: access-code gate first, then successful local decrypt after code entry.
- Force AI off via admin: deterministic reading still works and end-user copy contains no API/budget language.
- Force provider timeout: same cards remain available during ticket TTL; retry does not redraw.
- Run concurrent budget test against staging limits and prove atomic reservation blocks overspend.
- Run accessibility/Playwright smoke suite at mobile and desktop widths.
- Review Privacy/Methodology pages against actual implementation, especially OpenAI retention and backup behavior.

# 45. Backups, Restore, and Privacy Tradeoffs

## 45.1 DigitalOcean backups
DigitalOcean supports automated Droplet backups at configurable intervals. For a single-Droplet v1, enable daily backups if availability/recovery is more important than the fact that encrypted share ciphertext can remain in an old disk image until backup expiry. Since personal inputs/readings are not stored in the database, backups should not contain raw birth data or full reading history.

## 45.2 Additional logical PostgreSQL backup
Optionally create an encrypted off-host logical backup for configuration/aggregate/share ciphertext. This is not required for the first private beta if DigitalOcean backups are enabled, but it improves recovery granularity.

| # Example manual logical dump (ciphertext/config only by architecture):sudo docker compose exec -T postgres pg_dump -U tarot -d tarot -Fc > tarot-$(date +%F).dump# Encrypt before moving off host; define separate retention policy.# Never upload unencrypted database dumps to public object storage. |


## 45.3 Restore drill
- Provision a temporary isolated Droplet or staging environment.
- Restore the backup/image or PostgreSQL dump.
- Rotate all secrets/API keys if the restore originates from a suspected compromise.
- Run migrations only after confirming backup schema version.
- Run health checks and a synthetic reading. Do not reconnect public DNS until verified.
- Destroy the temporary restore environment when testing is complete.

# 46. Routine Deployment / Upgrade Procedure

| cd /opt/private-tarot/appgit fetch --all --prunegit checkout <approved-release-tag-or-commit>npm cinpm run typechecknpm testnpm run test:ai-evals   # against approved fixture subset, not real user datasudo docker compose --env-file .env.production build --pull# Database backup/snapshot before migrations if schema changes.sudo docker compose --env-file .env.production run --rm web npm run db:migratesudo docker compose --env-file .env.production up -d --remove-orphanssudo docker compose pssudo docker compose logs --tail=100 web# Execute post-deploy synthetic smoke tests. |


## 46.1 Rollback
- Keep previous image/tag available. If application-only regression, redeploy prior image/commit.
- Database migrations must be backward-compatible when possible. Destructive migrations require explicit restore/rollback plan before deployment.
- If model/prompt regression occurs, switch model/prompt version back through admin/config without needing a full app rollback.
- If spending anomaly occurs, set `AI_ENABLED=false` first, investigate second. Deterministic reading remains available.

# PART VIII — Content/IP, Operations, Implementation Phases, and Acceptance

# 47. Content and Intellectual-Property Strategy

## 47.1 Initial content rule
Use generic/original placeholder art and a source-controlled public-domain/factual research corpus. The application must be fully functional without reproducing a commercially published modern deck image or guidebook passage.

## 47.2 Information sources
- Public-domain historical tarot texts may establish historical wording/themes, but write fresh modern normalized user-facing descriptions.
- Factual systems/calculations (card numbering, mathematical numerology formulas, astronomical positions, geometric aspects, factual historical attributions) may be encoded as data, while expressive modern descriptions remain original.
- Golden Dawn/Hermetic mappings must be sourced and attributed internally; avoid copying a modern author’s explanatory prose.
- Use a source manifest with title/author/year/source type/license/public-domain status/jurisdiction notes/verification date.
- Before wider international commercialization, perform a source/asset audit because public-domain status can vary by jurisdiction.

## 47.3 Seed source categories

| Category | Seed direction | Usage |
| RWS tarot | A. E. Waite, The Pictorial Key to the Tarot / The Illustrated Key to the Tarot, public-domain editions where verified | Historical RWS symbolism/divinatory foundation; normalize into original app prose. |
| Golden Dawn tarot | Historical Golden Dawn Book T / related public-domain material where verified | Factual card-astrology-decan-element attributions. |
| Hermetic Qabalah | Public-domain historical Hermetic sources and scholarly/reference verification | Tree-of-Life/path labels and tradition metadata; clearly label as Hermetic Qabalah. |
| Astrology | Calculation library documentation + established mathematical definitions | No creative text dependency; use explicit app rules. |
| Numerology | Documented Western/Pythagorean conventions; version the chosen formulas | Implement formulas in code; user-facing language original. |
| Geography | GeoNames or equivalent permissively licensed gazetteer | Birthplace city/region/country, coordinates, timezone IDs; comply with attribution/license. |


## 47.4 Asset manifest

| AssetRecord {  id, path, assetType, creator, source, creationMethod,  copyrightStatus, license, commercialUseAllowed,  derivativeUseAllowed, attributionRequired, attributionText,  verificationDate, replacementStatus} |

Never allow an asset without known provenance into production. Placeholder art should be generated in-house through deterministic SVG/code or original licensed/generic assets, with metadata.

# 48. Methodology and Privacy Pages

## 48.1 Methodology page should disclose
- Cards are selected by a cryptographically secure randomized process independent of the user’s topic/profile and independent of the AI synthesis model.
- The application combines documented tarot/esoteric traditions, deterministic astrology/numerology calculations, and an AI-assisted final prose synthesis.
- Different esoteric traditions can disagree; the app labels its default systems and preserves provenance rather than asserting universal occult consensus.
- Astrology calculations are omitted when insufficient birth information makes them unreliable; missing birth time is not guessed.
- Tarot/astrology/numerology are interpretive systems and do not establish objective facts or guarantee future events.

## 48.2 Privacy page should disclose
- No account or persistent personal profile is created.
- Birth information and full calculation context are used ephemerally to prepare the active reading and are not stored as reading history by the app.
- An anonymous browser authorization credential and minimal operational rate-limit/cost data are retained as required to operate the private service.
- AI synthesis requires transmitting a minimized derived context to the configured AI provider; describe the provider and current retention/data-control posture accurately.
- OpenAI API data is currently not used for model training by default unless the customer opts in, but standard abuse-monitoring retention may apply; Zero Data Retention must not be claimed unless actually approved/configured.
- Private share links are opt-in, store only client-encrypted sanitized reading ciphertext, and expire after the configured TTL; encrypted data may persist in infrastructure backups until those backups expire.
- No advertising/behavioral tracking or third-party session replay in v1.

# 49. Operations and Incident Response

## 49.1 AI spend anomaly
- Immediately disable AI synthesis through admin/config (`AI_ENABLED=false`).
- Confirm deterministic readings remain operational.
- Check aggregate request rate, per-browser rate buckets, provider usage dashboard, and recent deployment changes. Do not inspect reading content because none should be logged.
- If the global access code appears leaked, rotate it for new admissions. If abuse is from already-authorized browsers, increment session epoch to invalidate all sessions and redistribute code.
- If OpenAI key compromise is suspected, revoke it in the API project, create a new restricted project key/service-account key, update `.env.production`, restart web container, and inspect provider usage.
- Only re-enable AI after budget/rate controls are verified.

## 49.2 Suspected server compromise
- Disable public access at the DigitalOcean Cloud Firewall or redirect DNS only after preserving required forensic information.
- Revoke OpenAI API key and rotate all application secrets, database password, access code, admin secret, and session epoch.
- Rebuild from a trusted image/release rather than attempting to “clean” a compromised host in place.
- Restore only required operational DB data from a known-good backup; remember share blobs are ciphertext.
- Review logs for secret exposure without assuming absence of reading logs proves no in-memory exposure.
- Update privacy/security notices if an incident legally requires notification.

## 49.3 Provider outage
- Keep secure tarot draw and deterministic analysis available.
- Do not repeatedly retry provider calls. Preserve active reading ticket for one user-initiated retry within TTL.
- Show: “The full interpretation isn’t available at this moment. Your cards and the underlying pattern can still be read.”
- Admin health can show provider outage details; end users do not see provider names/errors in the reading flow.

## 49.4 Database outage
Because authorization/settings/budget/share retrieval depend on PostgreSQL, fail closed for new AI calls and share creation. Never bypass budget checks because the database is unavailable. The app may show a graceful temporary unavailable state; do not call OpenAI if atomic budget enforcement cannot run.

# 50. Claude Implementation Phases
Claude should implement in phases and not begin the next phase until the prior phase’s acceptance tests pass. Each phase should produce code, tests, migrations/content fixtures, and concise README updates.

## Phase 0 — Repository and policy scaffolding
- Initialize strict TypeScript/Next.js project, lint/typecheck/test harness.
- Create architecture decision records for privacy/no-free-text/no-user-table/AI-one-call rules.
- Implement config validation; fail startup if secrets/budgets are invalid.
- Create CI that runs typecheck, unit tests, content validation, and Playwright smoke tests.

## Phase 1 — Access gate, security baseline, database
- PostgreSQL schema/migrations for operational tables only.
- Argon2id global access/admin hashing, authorization cookie, session epoch, unlock rate limiting.
- Security headers, noindex/robots, no-store API behavior.
- Admin shell with AI disabled by default.

## Phase 2 — Structured reading UI
- Complete domain/focus/insight/time/depth/reversal data files and accessible selection components.
- Progressive birth-date/time/place UI with no free-text except the controlled place-search query used only to select a canonical place record.
- Capability summary and reading-oriented validation/error copy.
- Celestial Prototype placeholder deck components.

## Phase 3 — Tarot engine
- 78-card canonical dataset schema and source manifest.
- CSPRNG shuffle/orientation algorithm and statistical tests.
- Spread definitions/automatic selection and card-position binding.
- Tarot pattern extraction.

## Phase 4 — Astrology and numerology
- AstrologyProvider adapter and verified fixtures.
- Current-sky snapshot; conservative unknown-time rules; full natal and transits with exact data.
- Local place dataset import/search.
- Numerology module and fixtures.

## Phase 5 — Knowledge graph/resonance compiler
- Correspondence/source schemas and seed public-domain/factual corpus.
- Acceptance classes, lineage, independence, scoring, thresholds, contradiction detection.
- Theme compiler and ReadingContext schema.
- Deterministic fallback rendering.

## Phase 6 — OpenAI synthesis
- Dedicated provider adapter, strict structured outputs, `store:false`, no tools/persistence.
- Atomic budget reservation/finalization and concurrency controls.
- Evidence validation and single-repair ceiling.
- AI evaluation harness; do not enable production until eval thresholds pass.

## Phase 7 — Transparency and sharing
- What shaped this reading / Detailed Basis transient panels.
- Browser Web Crypto AES-GCM share creation, ciphertext-only persistence, auth-gated share viewer, TTL cleanup.
- Privacy disclosures and encrypted-share E2E tests.

## Phase 8 — Operations/deployment
- Dockerfile/Compose/Caddy, health checks, admin controls, sanitized logs.
- DigitalOcean deployment scripts/docs, migrations/backup procedure.
- OpenAI project setup checklist and provider smoke test.
- Staging-to-production launch checklist.

## Phase 9 — Hardening
- Accessibility audit, CSP tightening, dependency/security scan, race/load tests, budget adversarial tests.
- Full AI evaluation suite and prompt/model pinning.
- Privacy review: inspect DB/logs/browser storage/network traces for prohibited data.
- Release candidate and rollback drill.

# 51. Definition of Done / Acceptance Criteria
- An invited user can access the domain with the single global code and does not create an account.
- A user can create a complete reading with only a domain selection and zero birth information.
- No reading screen contains a free-text prompt or chat field.
- Entering birth information adds only legitimately calculable context; unknown birth time never produces fabricated houses/angles.
- The tarot draw is cryptographically secure, unique within the spread, committed before interpretation, and independent of user/context/AI.
- Current celestial context is frozen at the exact draw moment and can be inspected in Detailed Basis while the session is active.
- Resonance scoring can return “no significant resonance”; it does not search indefinitely for synchronicity.
- AI receives at most the configured evidence cap and cannot introduce unsupported evidence without validation failure.
- Deep output is normally 6–8 paragraphs, cohesive, specific, and does not read like a chatbot or a checklist of esoteric systems.
- User-facing failures contain no API/token/budget/model language and no false supernatural explanations.
- Application DB/logs contain no birth data, full reading context, cards, prompts, or prose after the active ticket window, except cards/prose inside ciphertext for deliberate shares.
- Share URL requires app authorization, uses a fragment decryption key unavailable to the server, and expires automatically.
- OpenAI key exists only server-side; budget controls are atomic; a concurrency test cannot drive spend beyond the app hard limit.
- AI can be disabled instantly without disabling deterministic readings.
- Only ports 80/443 are public; SSH is IP-restricted; PostgreSQL/Next.js ports are not internet-exposed.
- Accessibility and reduced-motion tests pass; app works at 320px width and desktop.
- All content/assets have source/license/provenance records and production has no unverified copyrighted deck art.

# APPENDIX A — ReadingContext Reference Schema

| type ReadingContext = {  schemaVersion: "1.0";  reading: {    momentUtc: string;    domain: { id: string; label: string };    focus: { id: string; label: string };    insight: { id: string; label: string };    timePerspective: { id: string; label: string };    depth: "focused" | "deep" | "comprehensive";    spread: {      id: string; name: string;      positions: Array<{ index:number; id:string; label:string; purpose:string }>;    };    cards: Array<{      evidenceId: string;      cardId: string;      name: string;      orientation: "upright" | "reversed";      positionId: string;      canonicalMeaningSummary: string;      activeCorrespondenceIds: string[];    }>;  };  capability: {    tarot: true;    currentAstrology: true;    birthDateProvided: boolean;    birthTimeProvided: boolean;    birthplaceProvided: boolean;    stableDateAstrology: boolean;    fullNatalChart: boolean;    natalHouses: boolean;    natalAngles: boolean;    numerology: boolean;  };  personalFactors: Array<{    evidenceId: string;    type: string;    displayFact: string;    precision: "exact" | "stable-sign" | "derived-date";    provenanceIds: string[];  }>;  currentSky: Array<{    evidenceId: string;    type: string;    displayFact: string;    relevance: number;    provenanceIds: string[];  }>;  tarotPatterns: EvidenceNode[];  resonances: EvidenceNode[];  themes: CompiledTheme[];  tensions: CompiledTension[];  unavailable: Array<{    factor: string;    reasonCode: string;    userFacingExplanation: string;  }>;  providerEvidence: Array<{    id: string;    statement: string;    category: string;    significance: "supporting" | "strong" | "dominant";    provenanceLabel?: string;    rootIds: string[];  }>;}; |


## A.1 Provider minimization
The model-facing version should not include raw input birth date/time/place unless the prose specifically must quote a calendar fact, which is normally unnecessary. Convert them to the derived factors required for interpretation first. Do not include discarded candidate evidence, numeric scores, exact rate-limit/access data, IP information, browser identifiers, cost/budget values, or share metadata.

# APPENDIX B — Production AI Prompt Template

| SYSTEM / INSTRUCTIONS — VERSION reading-synthesis-1.0You write the final reading for a private esoteric tarot application.You are not conducting the card draw and you are not calculating the user’sastrology, numerology, or correspondences. Those tasks have already beenperformed deterministically. The context you receive is authoritative.MISSIONTransform the supplied tarot cards, spread positions, compiled themes,tensions, personal factors, current celestial factors, and approvedesoteric correspondences into one cohesive, meaningful reading.EVIDENCE RULES1. Use only evidence supplied in the context.2. Never add an astrological, numerological, Qabalistic, Hermetic, crystal,   herbal, elemental, planetary, or tarot correspondence from memory.3. Never invent an unstated personal circumstance or third-party motive.4. Every paragraph must cite one or more valid evidence IDs in the structured   `evidenceIds` field. Do not show IDs in the prose.5. Give the greatest weight to the actual cards, their spread positions,   repeated tarot patterns, and the selected reading domain/focus.6. Personal/natal/numerological and current-celestial factors reinforce,   complicate, or contextualize the tarot; they do not replace it.7. Deep Hermetic material is used only when it materially strengthens a theme.8. Preserve supplied tensions instead of forcing them into a simple yes/no answer.9. If the context contains no strong personal/celestial resonance, do not invent one.VOICE- Write as a skilled, careful esoteric reader: specific, composed, perceptive,  slightly literary, and easy to understand.- Do not sound like a chatbot, therapist, customer-support agent, database,  or technical report.- Do not say “based on the data you entered,” “the algorithm,” “the model,”  “the system detected,” “AI,” or mention prompts/tokens/API infrastructure.- Avoid generic mystical filler such as “the universe wants you to,”  “a powerful portal is opening,” or “trust the journey” unless a supplied  tradition/evidence specifically makes such phrasing meaningful.- Do not repeat the same caution/disclaimer in each paragraph.INTERPRETIVE BOUNDARIES- Be confident about what the supplied symbolic tradition says.- Do not claim tarot/astrology proves objective facts or guarantees future events.- Do not diagnose disease or mental conditions.- Do not predict death or pregnancy.- Do not accuse another person of cheating, lying, criminal behavior, abuse,  or secret intentions as factual claims.- Do not direct gambling, investment, medication, legal strategy, or other  high-stakes decisions on divinatory grounds.- Do not fabricate biography to make the reading feel personal.- Allow the user to decide how the symbolism applies to their actual life.FORM- Return strict JSON matching the supplied schema.- For `deep`, normally produce 6–8 substantial paragraphs totaling about  700–1,000 words. Do not add bullet lists inside the reading.- Create one short evocative title that reflects the actual dominant themes  without sensationalism.- The first paragraph should establish the dominant atmosphere/tension.- The body should integrate actual cards and relevant correspondences naturally.- The final paragraph should synthesize rather than command. Do not end with  a question or invitation to continue chatting.SIGNIFICANCE LANGUAGE- dominant: “one of the strongest patterns,” “the reading repeatedly emphasizes”- strong: “a notable emphasis,” “this is reinforced by”- supporting: “a secondary thread,” “a quieter resonance”- background: normally omitOUTPUTReturn only the structured object required by the response schema. |


# APPENDIX C — End-User Error and State Copy

| Situation | Recommended copy / action |
| Invalid access code | “That access code doesn’t open this space. Check it and try again.” |
| Unlock temporarily throttled | “Access is temporarily unavailable from this browser. Try again a little later.” |
| Birthplace not uniquely resolved | “That birthplace could refer to more than one place. Choose the closest match, or leave it blank.” |
| Birth time omitted | No error. In basis summary: “Birth time left open — time-dependent natal factors will not be used.” |
| Birth time invalid due to DST gap | “That local time did not occur on this date because of a clock change. Check the time, or leave birth time open.” |
| Celestial layer partial | “Part of the celestial context couldn’t be resolved. The reading can continue without that layer.” |
| Interpretation provider interruption | “The interpretation was interrupted. Your cards and the moment of the draw are still set for this session.” Button: “Continue this reading.” |
| Full synthesis unavailable due budget/capacity | “The full interpretation isn’t available at this moment. Your cards and the underlying pattern can still be read.” Show deterministic result; optional “Return later for the complete interpretation.” |
| Reading ticket expired | “This reading has closed. Begin a new reading when you’re ready.” |
| Network lost before draw committed | “The reading couldn’t begin because the connection was interrupted. Nothing was drawn. Try again.” |
| Network lost after draw committed while ticket remains | “Your cards are set. Reconnect to continue the interpretation.” |
| Share creation fails | “A private link couldn’t be created. Your reading is still here in this session.” |
| Shared artifact expired/missing | “This shared reading is no longer available. Private reading links are temporary.” |
| Share decryption key invalid | “This private link can’t be opened with the information in this URL.” |
| Generic unrecoverable session problem | “This reading has closed.” Primary action: “Begin a new reading.” |


# APPENDIX D — Transparency UX

## D.1 Layer 1: normal reading
Display only the cards, integrated reading, and a compact basis line such as `Tarot • Current Sky • Birth Astrology • Numerology • Hermetic Correspondences`, containing only layers actually used.

## D.2 Layer 2: What shaped this reading
Human-readable strongest factors, no numeric scores. Example:

| WHAT SHAPED THIS READINGThe cards• The Emperor occupied a primary position and emphasized structure/boundaries.• Pentacles repeated strongly, reinforcing material/practical concerns.Personal correspondence• A Virgo-linked factor in the spread resonated with a stable natal factor  available from the birth information you provided.Current sky• A current Saturn pattern reinforced themes already present in the cards.Available but not emphasized• Other calculated natal factors did not materially strengthen this reading.Not available• Ascendant and houses — exact birth time/place were not available. |


## D.3 Layer 3: Detailed Basis
Show exact card/position, derived factor, aspect/orb where applicable, tradition label, acceptance classification, and source reference. Scores may remain internal; this layer is about provenance, not gamification.

# APPENDIX E — Source / Reference Manifest Seed

| Reference | Purpose | URL / note |
| OpenAI Developer Quickstart | Current API SDK/key/Responses setup | https://developers.openai.com/api/docs/quickstart |
| OpenAI Models | Current model IDs and comparison | https://developers.openai.com/api/docs/models |
| OpenAI GPT-5.6 Luna model page | Current Luna capability/pricing | https://developers.openai.com/api/docs/models/gpt-5.6-luna |
| OpenAI data controls | Training/retention/ZDR/store behavior | https://developers.openai.com/api/docs/guides/your-data |
| OpenAI project management | Project keys/service accounts/limits | https://help.openai.com/en/articles/9186755 |
| DigitalOcean production-ready Droplet | SSH/non-root/firewall/monitoring/backups guidance | https://docs.digitalocean.com/products/droplets/getting-started/recommended-droplet-setup/ |
| DigitalOcean Linux images | Available Ubuntu LTS image identifiers | https://docs.digitalocean.com/products/droplets/details/images/ |
| DigitalOcean Cloud Firewall | Current rule behavior | https://docs.digitalocean.com/products/networking/firewalls/how-to/configure-rules/ |
| DigitalOcean DNS quickstart | Domain and record setup | https://docs.digitalocean.com/products/networking/dns/getting-started/quickstart/ |
| DigitalOcean backups | Current backup enable/interval documentation | https://docs.digitalocean.com/products/backups/how-to/enable/ |
| Docker Engine Ubuntu | Official Docker apt-repository installation | https://docs.docker.com/engine/install/ubuntu/ |
| A. E. Waite public-domain editions | Historical RWS research foundation | Use Project Gutenberg/Wikisource public-domain edition after jurisdiction verification. |
| GeoNames export | Birthplace gazetteer candidate | https://www.geonames.org/export/ — verify current CC BY terms/attribution. |
| Celestine | Candidate MIT astrology adapter | https://github.com/Anonyfox/celestine — verify current license/version/accuracy before lock-in. |
| Astronomy Engine | Independent MIT astronomy fixture reference | https://github.com/cosinekitty/astronomy |
| Swiss Ephemeris | Potential future high-precision adapter | Use only after selecting AGPL-compatible distribution or purchasing appropriate commercial license. |

External links and vendor facts above were checked for this specification in August 2026 where noted. Claude must re-open official documentation during implementation/deployment rather than assuming prices, model aliases, package versions, or control-panel labels remain unchanged.

# APPENDIX F — Production Launch Checklist
☐ Codebase passes typecheck, unit, integration, Playwright, content validation, and AI evaluation thresholds.
☐ No free-text reading input exists; place search only selects canonical internal places.
☐ No users/profiles/readings/prompts/outputs tables exist.
☐ Global access code and separate admin secret generated; hashes only persisted.
☐ DigitalOcean Droplet uses SSH keys, non-root sudo admin, monitoring, Cloud Firewall.
☐ Cloud Firewall: SSH restricted; only 80/443 public.
☐ DNS A/AAAA resolve correctly; Caddy certificate valid.
☐ Docker Compose publishes only Caddy; web/Postgres internal.
☐ `.env.production` chmod 600; no secrets committed or exposed in frontend bundle.
☐ OpenAI dedicated project created; billing configured; project key/service account restricted; chosen model allowed.
☐ OpenAI `store:false`; no Conversations/Assistants/files/tools/background mode.
☐ OpenAI project spend/rate controls configured; application budgets configured and race-tested.
☐ AI kill switch verified.
☐ Current model/pricing reverified and price env variables updated.
☐ Privacy page matches actual OpenAI data-control and backup settings.
☐ Birthplace dataset attribution/license included.
☐ Randomization statistical suite passes.
☐ Astrology fixtures pass including DST/boundary/high-latitude cases.
☐ No-birth reading and full-birth reading both produce high-quality output.
☐ Provider outage and budget-unavailable UX verified without technical/mystical falsehoods.
☐ Encrypted share server DB contains ciphertext only; fragment key never appears in logs/network server request.
☐ Share expiry cleanup verified.
☐ robots.txt + X-Robots-Tag + meta noindex verified.
☐ Accessibility and reduced-motion checks pass.
☐ Backup/restore and rollback procedure rehearsed.
☐ Production release tagged and exact build SHA recorded.

# APPENDIX G — Final Instruction to Claude

| Build the product described here, not a generic tarot prototype. Favor explicit domain models, deterministic computation, privacy boundaries, rigorous tests, and restrained UX over “AI-first” shortcuts. When you encounter an ambiguity not resolved by this document, choose the option that minimizes personal data, prevents AI/cost runaway, preserves the independence of the card draw, preserves esoteric provenance, and keeps the normal user experience coherent and non-technical. Record any unavoidable deviation as an Architecture Decision Record before implementing it. |

END OF SPECIFICATION