import type {
  Element,
  MinorRank,
  Suit,
  TarotCardDefinition,
  TensionTag,
  ThemeTag,
} from "@/domain/tarot/types";

const RANK_NUMBERS: Record<MinorRank, number> = {
  ace: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  page: 11,
  knight: 12,
  queen: 13,
  king: 14,
};

const SUIT_ELEMENTS: Record<Suit, Element> = {
  wands: "fire",
  cups: "water",
  swords: "air",
  pentacles: "earth",
};

const RANK_NAMES: Record<MinorRank, string> = {
  ace: "Ace",
  two: "Two",
  three: "Three",
  four: "Four",
  five: "Five",
  six: "Six",
  seven: "Seven",
  eight: "Eight",
  nine: "Nine",
  ten: "Ten",
  page: "Page",
  knight: "Knight",
  queen: "Queen",
  king: "King",
};

const SUIT_NAMES: Record<Suit, string> = {
  wands: "Wands",
  cups: "Cups",
  swords: "Swords",
  pentacles: "Pentacles",
};

const COURT_RANKS = new Set<MinorRank>(["page", "knight", "queen", "king"]);

const SRC = ["src_waite_pkt_1911", "src_book_t_1893"];

export function minor(
  suit: Suit,
  rank: MinorRank,
  coreKeywords: string[],
  uprightMeaning: string,
  reversedMeaning: string,
  themeTags: ThemeTag[],
  tensionTags: TensionTag[],
): TarotCardDefinition {
  const number = RANK_NUMBERS[rank];
  const idNum = number.toString().padStart(2, "0");
  return {
    id: COURT_RANKS.has(rank) ? `${suit}_${rank}` : `${suit}_${idNum}`,
    arcana: "minor",
    number,
    canonicalName: `${RANK_NAMES[rank]} of ${SUIT_NAMES[suit]}`,
    suit,
    rank,
    element: SUIT_ELEMENTS[suit],
    coreKeywords,
    uprightMeaning,
    reversedMeaning,
    numerologyNumber: COURT_RANKS.has(rank) ? null : number,
    themeTags,
    tensionTags,
    sourceRefs: SRC,
  };
}
