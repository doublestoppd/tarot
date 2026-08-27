import type { SourceReference } from "@/domain/correspondences/types";

/**
 * Source / reference manifest (spec §12.3, §47, Appendix E).
 *
 * Historical and public-domain works establish source facts; every
 * user-facing description in this repository is original normalized wording.
 * Public-domain status can vary by jurisdiction — re-audit before wider
 * commercialization (spec §47.2).
 */
export const SOURCES: SourceReference[] = [
  {
    id: "src_waite_pkt_1911",
    title: "The Pictorial Key to the Tarot",
    authorOrEditor: "Arthur Edward Waite",
    year: "1911",
    edition: "London: William Rider & Son",
    sourceType: "primary",
    tradition: "rws",
    copyrightOrLicenseStatus:
      "Public domain (author died 1942; US publication pre-1929)",
    jurisdictionNotes:
      "Public domain in the US and in life+70 jurisdictions since 2013.",
    url: "https://www.gutenberg.org/ebooks/57633",
    verificationDate: "2026-08-27",
    reviewerNotes:
      "Foundation for structural/divinatory card meanings; wording normalized, never reproduced.",
  },
  {
    id: "src_book_t_1893",
    title: "Book T — The Tarot (Golden Dawn instructional manuscript)",
    authorOrEditor:
      "Hermetic Order of the Golden Dawn (attributed to S. L. MacGregor Mathers and others)",
    year: "c. 1893",
    sourceType: "primary",
    tradition: "golden_dawn",
    copyrightOrLicenseStatus: "Public domain (19th-century manuscript)",
    verificationDate: "2026-08-27",
    reviewerNotes:
      "Factual decan, court, and elemental attributions for the minor arcana.",
  },
  {
    id: "src_liber_777_1909",
    title: "Liber 777 (tabulation of Golden Dawn correspondences)",
    authorOrEditor: "Aleister Crowley (compiling earlier Golden Dawn tables)",
    year: "1909",
    sourceType: "reference",
    tradition: "golden_dawn",
    copyrightOrLicenseStatus:
      "Public domain in life+70 jurisdictions (author died 1947) and US (pre-1929 publication)",
    jurisdictionNotes: "Verify remaining jurisdictions before wider commercial use.",
    verificationDate: "2026-08-27",
    reviewerNotes:
      "Cross-reference for trump/letter/path/astrological attributions only; no expressive text reused.",
  },
  {
    id: "src_sepher_yetzirah_westcott_1887",
    title: "Sepher Yetzirah (translation)",
    authorOrEditor: "W. Wynn Westcott (translator)",
    year: "1887",
    sourceType: "primary",
    tradition: "hermetic_qabalah",
    copyrightOrLicenseStatus: "Public domain",
    verificationDate: "2026-08-27",
    reviewerNotes:
      "Historical basis for letter/element/planet/zodiac classes in Hermetic Qabalah; labeled as Hermetic Qabalah, never as Jewish Kabbalah.",
  },
  {
    id: "src_agrippa_1533",
    title: "Three Books of Occult Philosophy",
    authorOrEditor: "Heinrich Cornelius Agrippa",
    year: "1533",
    sourceType: "primary",
    tradition: "planetary_symbolism",
    copyrightOrLicenseStatus: "Public domain",
    verificationDate: "2026-08-27",
    reviewerNotes: "Traditional Western planetary and elemental symbolism.",
  },
  {
    id: "src_ptolemy_tetrabiblos",
    title: "Tetrabiblos",
    authorOrEditor: "Claudius Ptolemy (Robbins translation, Loeb 1940 consulted as reference)",
    year: "2nd century CE",
    sourceType: "primary",
    tradition: "western_astrology",
    copyrightOrLicenseStatus: "Ancient text public domain; app encodes only factual doctrine (rulerships, aspects)",
    verificationDate: "2026-08-27",
    reviewerNotes:
      "Traditional seven-planet rulerships, aspect doctrine, sign elements/modalities.",
  },
  {
    id: "src_astronomy_engine",
    title: "Astronomy Engine documentation",
    authorOrEditor: "Don Cross (cosinekitty)",
    year: "2019–2026",
    sourceType: "reference",
    tradition: "general",
    copyrightOrLicenseStatus: "MIT license",
    url: "https://github.com/cosinekitty/astronomy",
    verificationDate: "2026-08-27",
    reviewerNotes:
      "Planetary position calculations (VSOP87-derived), ±1 arcminute documented accuracy 1700–2100.",
  },
  {
    id: "src_meeus_1998",
    title: "Astronomical Algorithms (2nd ed.)",
    authorOrEditor: "Jean Meeus",
    year: "1998",
    sourceType: "reference",
    tradition: "general",
    copyrightOrLicenseStatus:
      "Copyrighted; used only as a reference for standard published formulae (obliquity, sidereal time, house mathematics) — no text reproduced",
    verificationDate: "2026-08-27",
  },
  {
    id: "src_pythagorean_numerology_v1",
    title: "Private Tarot numerology algorithm document v1 (Western/Pythagorean convention)",
    authorOrEditor: "This repository (docs/numerology-v1.md)",
    year: "2026",
    sourceType: "reference",
    tradition: "pythagorean_numerology",
    copyrightOrLicenseStatus: "Original work of this repository",
    verificationDate: "2026-08-27",
    reviewerNotes:
      "Documents the exact versioned reduction rules, master-number handling, pinnacles/challenges, and the modern tarot birth-card convention.",
  },
  {
    id: "src_geonames",
    title: "GeoNames gazetteer export",
    authorOrEditor: "GeoNames (geonames.org)",
    year: "2026",
    sourceType: "reference",
    tradition: "general",
    copyrightOrLicenseStatus:
      "CC BY 4.0 — attribution required; verify current terms at import time",
    url: "https://www.geonames.org/export/",
    verificationDate: "2026-08-27",
    reviewerNotes:
      "Birthplace city/region/country, coordinates, and IANA timezone ids, imported at build/admin time only.",
  },
];

export const SOURCE_IDS = new Set(SOURCES.map((s) => s.id));
