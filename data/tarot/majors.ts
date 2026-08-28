import type { TarotCardDefinition } from "@/domain/tarot/types";

/**
 * Major arcana — canonical identity and original normalized meanings.
 * Structural/divinatory foundation: Rider–Waite–Smith tradition
 * (src_waite_pkt_1911); elemental/zodiacal/planetary attributions surface in
 * the correspondence graph, not here.
 *
 * Meaning prose follows the plain-language rule (ADR 0009) in its
 * conversational form: complete sentences spoken to the reader, concrete
 * and warm, never telegraphic fragments.
 */

const SRC = ["src_waite_pkt_1911", "src_book_t_1893"];

export const MAJOR_CARDS: TarotCardDefinition[] = [
  {
    id: "major_00_fool",
    arcana: "major",
    number: 0,
    canonicalName: "The Fool",
    suit: null,
    rank: null,
    element: "air",
    coreKeywords: ["beginnings", "openness", "trust", "risk", "threshold"],
    uprightMeaning:
      "You are at the start of something new, and the road ahead is only half visible. Nothing is locked in yet, which is exactly the gift. Step out with your eyes open.",
    reversedMeaning:
      "You want to begin, but you are either frozen at the edge or jumping without looking. The wish is real. Get your footing first, then go.",
    numerologyNumber: 0,
    themeTags: ["beginnings", "freedom", "risk", "movement", "hope"],
    tensionTags: ["beginning", "expansion", "outward"],
    sourceRefs: SRC,
  },
  {
    id: "major_01_magician",
    arcana: "major",
    number: 1,
    canonicalName: "The Magician",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["skill", "focus", "agency", "initiative", "channeling"],
    uprightMeaning:
      "You already have every tool this needs, and for once they all point the same way. This is the moment to turn the idea into a first real act. Focus is your whole advantage.",
    reversedMeaning:
      "Your energy is going ten directions at once, or into looking good instead of building. The talent is not in question. The aim is. Pick one target.",
    numerologyNumber: 1,
    themeTags: ["action", "clarity", "communication", "power", "beginnings"],
    tensionTags: ["outward", "beginning"],
    sourceRefs: SRC,
  },
  {
    id: "major_02_high_priestess",
    arcana: "major",
    number: 2,
    canonicalName: "The High Priestess",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["interiority", "stillness", "latency", "intuition", "reserve"],
    uprightMeaning:
      "Part of you already knows the answer here, and it is not ready to be said out loud. Give that knowing some quiet instead of arguments. Listen before you explain.",
    reversedMeaning:
      "You keep asking everyone else about something you already sense yourself. Or a secret is being kept past its usefulness. Go quiet and hear your own voice out.",
    numerologyNumber: 2,
    themeTags: ["intuition", "mystery", "solitude", "insight", "waiting"],
    tensionTags: ["inward"],
    sourceRefs: SRC,
  },
  {
    id: "major_03_empress",
    arcana: "major",
    number: 3,
    canonicalName: "The Empress",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["growth", "nurture", "fertility", "embodiment", "abundance"],
    uprightMeaning:
      "This grows by care, not force. Feed it, protect it, and let it ripen at its own living pace. There is real abundance here, with more on the way.",
    reversedMeaning:
      "The care is going wrong somewhere: smothering what it tends, or skipping the person doing the caring. Good ground is sitting unused. Tend yourself first, then the garden.",
    numerologyNumber: 3,
    themeTags: ["growth", "abundance", "emotional", "harmony", "material"],
    tensionTags: ["expansion"],
    sourceRefs: SRC,
  },
  {
    id: "major_04_emperor",
    arcana: "major",
    number: 4,
    canonicalName: "The Emperor",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["structure", "authority", "order", "boundaries", "stewardship"],
    uprightMeaning:
      "Structure is protecting something you care about. Rules, limits, and a steady hand are keeping the thing standing. Right now the frame holds, so let it hold.",
    reversedMeaning:
      "The structure has gone rigid, or nobody is holding it at all. Control is being mistaken for safety. Let the frame bend a little before it cracks.",
    numerologyNumber: 4,
    themeTags: ["structure", "authority", "stability", "discipline", "power"],
    tensionTags: ["restriction", "holding_on"],
    sourceRefs: SRC,
  },
  {
    id: "major_05_hierophant",
    arcana: "major",
    number: 5,
    canonicalName: "The Hierophant",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["tradition", "teaching", "transmission", "belonging", "convention"],
    uprightMeaning:
      "There is real strength in learning from something older than you: a teacher, a practice, a shared way of doing things. You do not have to invent this alone. Belonging steadies you.",
    reversedMeaning:
      "You may have outgrown a rule you are still obeying. Ask why it exists before you follow it again. It might be time to find a form that actually fits you.",
    numerologyNumber: 5,
    themeTags: ["structure", "connection", "discipline", "stability", "truth"],
    tensionTags: ["restriction", "holding_on"],
    sourceRefs: SRC,
  },
  {
    id: "major_06_lovers",
    arcana: "major",
    number: 6,
    canonicalName: "The Lovers",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["choice", "union", "alignment", "values", "attraction"],
    uprightMeaning:
      "This is a real joining, and a real choice. What you want and what you value line up here, and that match matters more than charm. Choose it out loud.",
    reversedMeaning:
      "You want one thing and keep choosing another. The decision is being put off, and the delay is itself a decision. Look honestly at whether the values match.",
    numerologyNumber: 6,
    themeTags: ["connection", "choice", "harmony", "truth", "emotional"],
    tensionTags: ["outward"],
    sourceRefs: SRC,
  },
  {
    id: "major_07_chariot",
    arcana: "major",
    number: 7,
    canonicalName: "The Chariot",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["momentum", "will", "direction", "containment", "victory"],
    uprightMeaning:
      "You are holding two opposite pulls under one steady hand, and it is working. Keep the grip firm and the destination simple. Momentum is on your side.",
    reversedMeaning:
      "Either this is moving fast with no steering, or it is stalled by your own tug-of-war. Line the wheels up first. Then ask for speed.",
    numerologyNumber: 7,
    themeTags: ["movement", "action", "power", "discipline", "conflict"],
    tensionTags: ["outward", "expansion"],
    sourceRefs: SRC,
  },
  {
    id: "major_08_strength",
    arcana: "major",
    number: 8,
    canonicalName: "Strength",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["courage", "patience", "gentleness", "mastery", "endurance"],
    uprightMeaning:
      "This calls for the soft kind of strong: patience, nerve, and a calm grip on your own wild part. That hold beats raw force every time.",
    reversedMeaning:
      "You are doubting a strength you actually have, or using force where patience would work better. The instinct is not the problem. The handling is.",
    numerologyNumber: 8,
    themeTags: ["power", "discipline", "harmony", "healing", "vulnerability"],
    tensionTags: ["inward"],
    sourceRefs: SRC,
  },
  {
    id: "major_09_hermit",
    arcana: "major",
    number: 9,
    canonicalName: "The Hermit",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["withdrawal", "discernment", "refinement", "search", "guidance"],
    uprightMeaning:
      "You are being drawn to step back and look at this alone for a while. That is not hiding. Time apart is how you sort what matters from what only makes noise.",
    reversedMeaning:
      "The alone time has stopped helping and started hiding you. Or good advice keeps bouncing off a closed door. Let someone in.",
    numerologyNumber: 9,
    themeTags: ["solitude", "insight", "clarity", "discipline", "waiting"],
    tensionTags: ["inward"],
    sourceRefs: SRC,
  },
  {
    id: "major_10_wheel",
    arcana: "major",
    number: 10,
    canonicalName: "Wheel of Fortune",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["turning", "cycles", "timing", "fortune", "change"],
    uprightMeaning:
      "The wheel is turning on its own schedule, and you are on it. Timing and luck are doing some of the moving right now. Ride the turn instead of fighting it.",
    reversedMeaning:
      "You are pushing against a turn that is already happening. The same loop keeps coming back because its lesson has not moved in with you yet. Learn it once, and the wheel rolls on.",
    numerologyNumber: 10,
    themeTags: ["cycles", "change", "movement", "risk", "hope"],
    tensionTags: ["expansion"],
    sourceRefs: SRC,
  },
  {
    id: "major_11_justice",
    arcana: "major",
    number: 11,
    canonicalName: "Justice",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["equity", "consequence", "truth", "adjustment", "accountability"],
    uprightMeaning:
      "Actions and their results are meeting here. Look at it with clear eyes, weigh it fairly, and make the small correction that sets things level. That is all this asks.",
    reversedMeaning:
      "Something here is out of balance and has not been put right. Or you are judging yourself harder than the facts do. Weigh it again, kinder and straighter.",
    numerologyNumber: 11,
    themeTags: ["justice", "truth", "balance", "clarity", "structure"],
    tensionTags: ["restriction"],
    sourceRefs: SRC,
  },
  {
    id: "major_12_hanged_man",
    arcana: "major",
    number: 12,
    canonicalName: "The Hanged Man",
    suit: null,
    rank: null,
    element: "water",
    coreKeywords: ["suspension", "surrender", "reversal", "pause", "sacrifice"],
    uprightMeaning:
      "Right now, progress looks like pausing. Hang here a moment and the whole picture flips. What pushing hid from you, stillness shows.",
    reversedMeaning:
      "The pause has quietly become a stall. Whatever this wait was supposed to teach, it has taught. Come down and move.",
    numerologyNumber: 12,
    themeTags: ["surrender", "waiting", "insight", "restraint", "vulnerability"],
    tensionTags: ["inward", "letting_go"],
    sourceRefs: SRC,
  },
  {
    id: "major_13_death",
    arcana: "major",
    number: 13,
    canonicalName: "Death",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["ending", "transformation", "release", "clearing", "irreversibility"],
    uprightMeaning:
      "Something is genuinely ending, and it cannot be argued back to life. This is change by release, not repair. The clearing it leaves is where the new thing goes.",
    reversedMeaning:
      "You are carrying something that has already ended, and it has gone heavy. Setting it down is not giving up. It is making room.",
    numerologyNumber: 13,
    themeTags: ["endings", "transformation", "release", "change", "loss"],
    tensionTags: ["ending", "letting_go"],
    sourceRefs: SRC,
  },
  {
    id: "major_14_temperance",
    arcana: "major",
    number: 14,
    canonicalName: "Temperance",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["blending", "calibration", "moderation", "patience", "synthesis"],
    uprightMeaning:
      "This works by blending, not by picking a side. A little of this, a little of that, tested and adjusted with patience. What comes out is alive and workable.",
    reversedMeaning:
      "The mix is off: too much of one ingredient, not enough of another. Some parts of this are not ready to combine yet. Adjust before you pour.",
    numerologyNumber: 14,
    themeTags: ["balance", "harmony", "healing", "discipline", "renewal"],
    tensionTags: [],
    sourceRefs: SRC,
  },
  {
    id: "major_15_devil",
    arcana: "major",
    number: 15,
    canonicalName: "The Devil",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["attachment", "compulsion", "materiality", "bondage", "shadow"],
    uprightMeaning:
      "Look at the chain before anything else. A comfort, habit, or appetite has more grip on this than you have admitted. Naming it honestly is the first link coming open.",
    reversedMeaning:
      "The grip is loosening. A habit or fear that used to run the show is losing its hold. Freedom starts small here, so protect it while it grows.",
    numerologyNumber: 15,
    themeTags: ["restraint", "power", "excess", "fear", "material"],
    tensionTags: ["holding_on", "restriction"],
    sourceRefs: SRC,
  },
  {
    id: "major_16_tower",
    arcana: "major",
    number: 16,
    canonicalName: "The Tower",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["rupture", "collapse", "revelation", "release", "disillusion"],
    uprightMeaning:
      "Something built on a flaw is breaking, fast and honestly. Losing it hurts, and it also tells the truth. What you build next gets to stand on rock.",
    reversedMeaning:
      "The break is happening in slow motion, or it is already behind you. Either way, stop propping up what wants to fall. Tend the aftershocks with care.",
    numerologyNumber: 16,
    themeTags: ["change", "endings", "truth", "loss", "release"],
    tensionTags: ["ending", "letting_go"],
    sourceRefs: SRC,
  },
  {
    id: "major_17_star",
    arcana: "major",
    number: 17,
    canonicalName: "The Star",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["renewal", "clarity", "hope", "replenishment", "orientation"],
    uprightMeaning:
      "After the hard stretch, this is the refill. One steady light has come back, and with it your sense of direction. The hope here is quiet, and it is real.",
    reversedMeaning:
      "Your well is low and the light feels far away. Do not navigate on empty. Refill first, with rest and kindness, and then find your heading.",
    numerologyNumber: 17,
    themeTags: ["hope", "renewal", "healing", "clarity", "harmony"],
    tensionTags: [],
    sourceRefs: SRC,
  },
  {
    id: "major_18_moon",
    arcana: "major",
    number: 18,
    canonicalName: "The Moon",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["uncertainty", "imagination", "instinct", "distortion", "night"],
    uprightMeaning:
      "You are walking by moonlight here. Shapes shift, and fears look bigger than they are. You simply do not have full information yet, so keep walking. The road is still under you.",
    reversedMeaning:
      "The fog is starting to lift. Before you act on a dark guess, check it against a plain fact. Not every shadow was telling the truth.",
    numerologyNumber: 18,
    themeTags: ["mystery", "illusion", "intuition", "fear", "emotional"],
    tensionTags: ["inward"],
    sourceRefs: SRC,
  },
  {
    id: "major_19_sun",
    arcana: "major",
    number: 19,
    canonicalName: "The Sun",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["vitality", "clarity", "warmth", "success", "visibility"],
    uprightMeaning:
      "This is the clear-sky card. Warmth, health, and success that can afford to be seen. Nothing here needs to hide, so enjoy it in the open.",
    reversedMeaning:
      "The good thing is real, but something is dimming it: doubt, delay, or a cloud you keep parked overhead. Let what is good be seen, including by you.",
    numerologyNumber: 19,
    themeTags: ["clarity", "growth", "hope", "action", "harmony"],
    tensionTags: ["outward", "expansion"],
    sourceRefs: SRC,
  },
  {
    id: "major_20_judgement",
    arcana: "major",
    number: 20,
    canonicalName: "Judgement",
    suit: null,
    rank: null,
    element: "fire",
    coreKeywords: ["reckoning", "awakening", "summons", "evaluation", "rebirth"],
    uprightMeaning:
      "An old chapter is calling you to settle it, honestly and for good. Answer the call and the chapter actually closes. Once you wake up to this, there is no going back to sleep.",
    reversedMeaning:
      "The call has come, and you are letting it ring. Or you judged yourself so harshly the case closed wrong. Reopen it gently and answer for real.",
    numerologyNumber: 20,
    themeTags: ["renewal", "transformation", "truth", "endings", "beginnings"],
    tensionTags: ["ending", "beginning"],
    sourceRefs: SRC,
  },
  {
    id: "major_21_world",
    arcana: "major",
    number: 21,
    canonicalName: "The World",
    suit: null,
    rank: null,
    element: null,
    coreKeywords: ["completion", "integration", "wholeness", "culmination", "arrival"],
    uprightMeaning:
      "The circle is closing, and every part of the effort got its honor. This is what finished actually looks like. Take the bow, rest a beat, and only then start the next round.",
    reversedMeaning:
      "You are one honest step from done, and that step keeps getting avoided. Name it and take it, and the circle seals. Almost-finished is not a place to live.",
    numerologyNumber: 21,
    themeTags: ["completion", "cycles", "harmony", "stability", "structure"],
    tensionTags: ["ending"],
    sourceRefs: SRC,
  },
];
