/**
 * Lived textures: one concrete everyday image per card per orientation,
 * used by the narrative composer after a card's meaning — always framed as
 * possibility ("in daily life, that often looks like …"), never as a claim
 * about the reader's actual circumstances. Written to complete the phrase
 * "that often looks like ___" as a lowercase noun phrase or gerund.
 */
export interface CardTexture {
  upright: string;
  reversed: string;
}

export const TEXTURES: Record<string, CardTexture> = {
  major_00_fool: {
    upright: "clearing a weekend to finally try the thing you keep mentioning",
    reversed: "tabs open for weeks while the first step stays untaken",
  },
  major_01_magician: {
    upright: "finally sending the pitch, booking the room, starting the build",
    reversed: "five projects at ten percent and none at done",
  },
  major_02_high_priestess: {
    upright: "knowing your answer before the pros-and-cons list is finished",
    reversed: "polling five friends and ignoring the answer you already had",
  },
  major_03_empress: {
    upright: "cooking real meals again, tending plants, letting rest count as progress",
    reversed: "meeting everyone's needs except the ones in your own body",
  },
  major_04_emperor: {
    upright: "a calendar that is actually followed, rules that protect the work",
    reversed: "rules enforced long after anyone remembers why",
  },
  major_05_hierophant: {
    upright: "asking someone who has done it before, joining the class",
    reversed: "staying in the program after you stopped believing in it",
  },
  major_06_lovers: {
    upright: "choosing the person, the city, or the path out loud",
    reversed: "keeping both options warm so neither becomes real",
  },
  major_07_chariot: {
    upright: "one goal on the whiteboard and traffic that finally parts",
    reversed: "flooring it in neutral: busy all day, position unchanged",
  },
  major_08_strength: {
    upright: "staying kind in the conversation you rehearsed dreading",
    reversed: "mistaking your own patience for weakness",
  },
  major_09_hermit: {
    upright: "declining the invite to finally hear yourself think",
    reversed: "declining every invite until nobody sends them",
  },
  major_10_wheel: {
    upright: "the timing suddenly working: the reply, the opening, the shift",
    reversed: "the same argument, job, or slump arriving with new scenery",
  },
  major_11_justice: {
    upright: "the honest tally: what you owe, what you are owed",
    reversed: "keeping score with a thumb on the scale, usually against yourself",
  },
  major_12_hanged_man: {
    upright: "letting the message sit a day and seeing it differently by morning",
    reversed: "calling it patience when it is really avoidance",
  },
  major_13_death: {
    upright: "the lease ending, the era closing, the boxes getting packed",
    reversed: "paying storage fees on a life you no longer live",
  },
  major_14_temperance: {
    upright: "mixing work and rest until the week finally holds",
    reversed: "all-or-nothing swings: strict Monday, abandoned Thursday",
  },
  major_15_devil: {
    upright: "one more scroll, one more pour, one more justification",
    reversed: "the first morning you skip it and feel the air change",
  },
  major_16_tower: {
    upright: "the plan collapsing in one conversation, and the odd relief after",
    reversed: "propping up a thing you privately know is coming down",
  },
  major_17_star: {
    upright: "sleep coming back, water tasting good, plans feeling possible",
    reversed: "running on fumes and calling it commitment",
  },
  major_18_moon: {
    upright: "reading the same message five times for hidden meaning",
    reversed: "the facts arriving and half the dread dissolving",
  },
  major_19_sun: {
    upright: "saying the good news out loud without shrinking it",
    reversed: "hiding a win because someone might mind you having it",
  },
  major_20_judgement: {
    upright: "the call you finally return, the apology you finally make",
    reversed: "the unopened letter you already know the contents of",
  },
  major_21_world: {
    upright: "shipping it, graduating, closing the loop and toasting it",
    reversed: "ninety-five percent done and finding reasons not to finish",
  },

  wands_01: {
    upright: "a new idea that has you talking faster",
    reversed: "a notebook full of first pages",
  },
  wands_02: {
    upright: "researching the move, drafting the letter, mapping the leap",
    reversed: "perfecting the plan instead of leaving the porch",
  },
  wands_03: {
    upright: "applications out, seeds planted, replies pending",
    reversed: "checking hourly for results that need a season",
  },
  wands_04: {
    upright: "the housewarming, the milestone dinner, the small earned party",
    reversed: "celebrating before the last screws are in",
  },
  wands_05: {
    upright: "loud brainstorms, rival pitches, everyone talking at once",
    reversed: "an argument nobody remembers starting, rerunning weekly",
  },
  wands_06: {
    upright: "the shout-out in the meeting, the news that travels for you",
    reversed: "applause that leaves you strangely empty",
  },
  wands_07: {
    upright: "defending your call in the review, holding your price",
    reversed: "still arguing points that stopped mattering months ago",
  },
  wands_08: {
    upright: "three answers landing in one afternoon after weeks of quiet",
    reversed: "messages crossing and everyone answering the wrong one",
  },
  wands_09: {
    upright: "showing up tired and showing up anyway",
    reversed: "bracing for a blow that is not coming",
  },
  wands_10: {
    upright: "carrying every errand, every deadline, everyone's feelings",
    reversed: "handing one task off and feeling your shoulders drop",
  },
  wands_page: {
    upright: "a new class, a new craft, a hundred questions",
    reversed: "starter kits gathering dust",
  },
  wands_knight: {
    upright: "booking it before you can talk yourself out of it",
    reversed: "sprinting the first week and vanishing the second",
  },
  wands_queen: {
    upright: "hosting the table where everyone relaxes",
    reversed: "needing the room's applause to feel the warmth",
  },
  wands_king: {
    upright: "setting the direction and handing out real ownership",
    reversed: "big announcements, thin follow-through",
  },

  cups_01: {
    upright: "a crush, a thaw, tears at a song out of nowhere",
    reversed: "nothing moving you that used to",
  },
  cups_02: {
    upright: "a coffee that turns into three hours",
    reversed: "keeping a private ledger of who reached out first",
  },
  cups_03: {
    upright: "the group dinner that runs late and heals something",
    reversed: "feeling alone in a full room",
  },
  cups_04: {
    upright: "scrolling past invitations while wanting something you cannot name",
    reversed: "appetite returning: for people, projects, plans",
  },
  cups_05: {
    upright: "replaying the loss on a loop while dinner goes cold",
    reversed: "noticing what stayed: the friend, the skill, the standing offer",
  },
  cups_06: {
    upright: "old photos, childhood food, a message from a name you know by heart",
    reversed: "measuring every new person against a memory",
  },
  cups_07: {
    upright: "seventeen open maybes: courses, cities, paths",
    reversed: "a shortlist of two and a deadline",
  },
  cups_08: {
    upright: "leaving the stable thing that stopped meaning anything",
    reversed: "half-in at the job or the relationship, fully in nowhere",
  },
  cups_09: {
    upright: "the quiet dinner where you realize you are actually happy",
    reversed: "the purchase that was supposed to feel like this and did not",
  },
  cups_10: {
    upright: "the ordinary evening you would bottle if you could",
    reversed: "smiling for the photo and going quiet in the car",
  },
  cups_page: {
    upright: "a feeling arriving as a doodle, a craving, a hunch",
    reversed: "moods delivering news you refuse to read",
  },
  cups_knight: {
    upright: "the grand gesture, the playlist made for someone",
    reversed: "romance that evaporates at the first bit of logistics",
  },
  cups_queen: {
    upright: "being the one people call at midnight, and surviving it",
    reversed: "absorbing everyone's weather until you cannot find your own",
  },
  cups_king: {
    upright: "staying steady in the family storm, warm without wobbling",
    reversed: "answering “fine” while the water rises",
  },

  swords_01: {
    upright: "the sentence that finally names the problem",
    reversed: "the truth used as a weapon instead of a lamp",
  },
  swords_02: {
    upright: "two lists, equal length, decision postponed again",
    reversed: "a coin flip whose result you catch yourself hoping against",
  },
  swords_03: {
    upright: "the sentence you cannot unhear",
    reversed: "the first day the memory does not run the morning",
  },
  swords_04: {
    upright: "the nap you fought and needed, the weekend off the grid",
    reversed: "resting the body while the mind runs laps",
  },
  swords_05: {
    upright: "winning the argument and eating alone",
    reversed: "an apology drafted, pride negotiating the send",
  },
  swords_06: {
    upright: "the move, the transfer, the slow ferry to a calmer season",
    reversed: "boxes packed and unpacked in the same doorway",
  },
  swords_07: {
    upright: "the workaround, the quiet exit, the unsent reply",
    reversed: "the workaround discovered, the cost arriving with interest",
  },
  swords_08: {
    upright: "“I can’t” repeated until it feels like a fact",
    reversed: "doing the forbidden thing and finding the door unlocked",
  },
  swords_09: {
    upright: "the 3 a.m. ceiling stare and its catastrophe reel",
    reversed: "sunrise shrinking the monster to a to-do item",
  },
  swords_10: {
    upright: "the final no, the ending that ends the wondering",
    reversed: "the first stretch afterward, stiff but standing",
  },
  swords_page: {
    upright: "reading the fine print, asking the awkward question",
    reversed: "passing the rumor along before checking it",
  },
  swords_knight: {
    upright: "sending the message while the blood is up",
    reversed: "regretting it before the reply even lands",
  },
  swords_queen: {
    upright: "the kind, exact feedback nobody else would give",
    reversed: "sarcasm doing the work that grief should be doing",
  },
  swords_king: {
    upright: "the fair ruling that costs you something",
    reversed: "the debate won on points and lost on people",
  },

  pentacles_01: {
    upright: "the offer letter, the deposit, the first paying client",
    reversed: "the gift card expiring in a drawer",
  },
  pentacles_02: {
    upright: "calendar juggling that somehow keeps working",
    reversed: "the dropped ball you saw coming for weeks",
  },
  pentacles_03: {
    upright: "the collaboration where every part actually fits",
    reversed: "working around people instead of with them",
  },
  pentacles_04: {
    upright: "savings finally growing, a boundary finally held",
    reversed: "declining every joy that costs anything",
  },
  pentacles_05: {
    upright: "the tight month, the coat that will not close",
    reversed: "accepting the help that was always on offer",
  },
  pentacles_06: {
    upright: "giving without keeping the receipt",
    reversed: "generosity with an invoice attached",
  },
  pentacles_07: {
    upright: "checking the numbers monthly instead of hourly",
    reversed: "quitting at mile twenty-five",
  },
  pentacles_08: {
    upright: "reps, drafts, and rewrites nobody sees",
    reversed: "polishing a corner nobody will ever look at",
  },
  pentacles_09: {
    upright: "your own place, your own money, your own morning",
    reversed: "a beautiful fortress with no visitors",
  },
  pentacles_10: {
    upright: "the family table, the paid-off thing, the plan that outlives you",
    reversed: "the inheritance argument, the ledger kept between relatives",
  },
  pentacles_page: {
    upright: "the course finished, the notes actually taken",
    reversed: "a certificate collection with no practice hours",
  },
  pentacles_knight: {
    upright: "the same small deposit, the same daily rep",
    reversed: "motion without traction, busywork as theater",
  },
  pentacles_queen: {
    upright: "soup for the sick friend and the invoice sent on time",
    reversed: "the caretaker running on an empty tank",
  },
  pentacles_king: {
    upright: "money boring in the best way: steady, planned, shared",
    reversed: "wealth guarding itself against living",
  },
};
