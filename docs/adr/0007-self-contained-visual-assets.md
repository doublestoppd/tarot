# ADR 0007 — Self-contained visual assets: system font stacks and deterministic SVG card art

**Status:** accepted

## Decision

1. **Typography** uses curated system font stacks (a transitional serif stack
   for display, the platform sans stack for UI/body) instead of bundled or
   remote webfonts. The specification forbids runtime Google Fonts and
   requires provenance for every shipped asset; shipping a third-party font
   binary would require a license audit that adds no v1 value. The CSS tokens
   isolate the choice so a properly licensed self-hosted font can be added
   later by editing two custom properties.

2. **Card art** is the "Celestial Prototype" deck: deterministic inline SVG
   generated from the canonical card definition (Roman numeral or rank, name,
   suit/element glyph, astrological glyph where a Class A/B attribution
   exists, and a geometric star/orbit motif seeded from the card id). No
   raster assets, no third-party artwork, nothing with unknown provenance.
   The `DeckTheme` abstraction (`components/tarot/deck-theme.ts`) keeps card
   identity separate from presentation so a commissioned deck can replace the
   prototype without touching interpretation code.
