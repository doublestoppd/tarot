/**
 * Asset manifest (spec §47.4): no asset ships without known provenance.
 * v1 deliberately has a single visual asset family — the code-generated
 * Celestial Prototype deck — so this manifest is short by construction.
 */

export interface AssetRecord {
  id: string;
  path: string;
  assetType: string;
  creator: string;
  source: string;
  creationMethod: string;
  copyrightStatus: string;
  license: string;
  commercialUseAllowed: boolean;
  derivativeUseAllowed: boolean;
  attributionRequired: boolean;
  attributionText: string;
  verificationDate: string;
  replacementStatus: "placeholder" | "final";
}

export const ASSETS: AssetRecord[] = [
  {
    id: "asset_celestial_prototype_deck",
    path: "components/tarot/CardArt.tsx",
    assetType: "generated_svg_card_faces_and_back",
    creator: "This repository",
    source: "Deterministic in-application generation from canonical card definitions",
    creationMethod:
      "Code-generated SVG (seeded geometry, drawn suit emblems, Unicode astrological glyphs); no raster or third-party artwork",
    copyrightStatus: "Original work of this repository",
    license: "Repository license",
    commercialUseAllowed: true,
    derivativeUseAllowed: true,
    attributionRequired: false,
    attributionText: "",
    verificationDate: "2026-08-27",
    replacementStatus: "placeholder",
  },
  {
    id: "asset_celestial_ornament_set",
    path: "styles/globals.css",
    assetType: "css_ornament_and_motion_tokens",
    creator: "This repository",
    source: "Hand-authored design tokens and CSS ornaments (star mark, orbit)",
    creationMethod: "Original CSS; system font stacks only (ADR 0007), no bundled font binaries",
    copyrightStatus: "Original work of this repository",
    license: "Repository license",
    commercialUseAllowed: true,
    derivativeUseAllowed: true,
    attributionRequired: false,
    attributionText: "",
    verificationDate: "2026-08-27",
    replacementStatus: "placeholder",
  },
];
