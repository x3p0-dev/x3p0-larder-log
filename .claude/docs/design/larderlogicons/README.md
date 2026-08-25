# Larder Log — app icons

**Oat** ground `#E2D5C0`, ink `#241E17`, Playfair Display roman 800 at 66% cap height.
Contrast 11.4:1. The L is a converted outline, not `<text>` — icons render without
webfont access, so a text element would silently fall back to Georgia.

## Files

| File | Use |
|---|---|
| `favicon.ico` | tab icon — 16, 32 and 48 in one file |
| `favicon-16.png` | the **hand-cut** 16px version (see below) |
| `favicon-32.png`, `favicon-48.png` | rendered from the outline |
| `apple-touch-icon.png` | 180, full bleed — iOS applies its own rounding |
| `icon-192.png`, `icon-512.png` | PWA, rounded at 22% |
| `icon-maskable-512.png` | full bleed, glyph inside the 80% safe zone |
| `larder-log-icon.svg` | 512 master, rounded |
| `larder-log-icon-maskable.svg` | 512 full bleed |
| `larder-log-favicon.svg` | 64 rounded — see the caveat below |
| `favicon-16.svg` | source of the hand-cut 16 |

## The 16px is a separate drawing

Playfair's arm is the thinnest stroke in the letter. Below about 20px it
antialiases to grey no matter the weight, and the L stops reading as an L.
`favicon-16.png` is the same silhouette snapped to whole pixels — 3px stem,
2px arm, 1px top serif, a 2×2 terminal flare. From 20px up the real outline
takes over and the handover is invisible.

**Caveat on `larder-log-favicon.svg`:** browsers that accept an SVG favicon
prefer it at every size, including 16px — which is exactly the case the
hand-cut version exists for. Link the `.ico` and skip the SVG favicon unless
you would rather have the softer arm in the tab.

## Markup

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#E2D5C0">
```

```json
{
  "name": "Larder Log",
  "short_name": "Larder",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "theme_color": "#E2D5C0",
  "background_color": "#F3EADC",
  "display": "standalone"
}
```
