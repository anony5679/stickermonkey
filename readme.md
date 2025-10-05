# StickerApp Style Static Site (Clone)

This is a static, responsive website built with plain HTML, CSS, and vanilla JS. It includes:
- `index.html` (home with hero, product grid, materials scroller)
- `stickers.html` (materials + rates grid)
- `material.html` (Material detail page with carousel, upload preview, features, pricing table, reviews, and cart section)
- `editor.html` (Canva-style editor for image customization)
- `styles.css` and `script.js`
- `assets/` with placeholder images

## Pages

- `index.html` — Home with hero, product grid, and materials scroller.
- `stickers.html` — Materials overview grid with pricing snippets linking to detail pages.
- `material.html` — Material detail page with carousel, upload preview, features, pricing table, reviews, and cart section.
- `editor.html` — Canva-style editor for image customization.

## How to Run Locally

1. Open this folder in VS Code.
2. Install the “Live Server” extension (by Ritwick Dey).
3. Right-click `index.html` and choose “Open with Live Server”.
4. Navigate between pages using the navbar links.

## Canva‑style Editor

- After you upload an image on `material.html`, you will be redirected automatically to `editor.html`.
- In the editor, you can:
  - Upload more images
  - Add text (color and size), shapes (rectangle, circle, star), and stickers (from assets)
  - Drag, resize, and rotate elements; double‑click text to edit
  - Change background color
  - Undo/Redo and export as PNG or JPG

### How it works
- The uploaded image is passed to the editor via sessionStorage under the key "editor:image".
- The editor uses a single HTML canvas for rendering, with device‑pixel‑ratio scaling for crisp output.

### Quick start
1. Open `index.html` in a local server.
2. Go to Materials → pick a material → upload an image.
3. You'll land in `editor.html` with your image on canvas.
4. Add text/shapes/stickers, then click Download PNG or Download JPG.

### Troubleshooting
- If you don't see your image, ensure your browser allows sessionStorage and that `editor.html` is being served from the same origin.
- For broken stickers, verify the files exist in `./assets` and the paths in `editor.html` match.

## Notes

- Cart items persist across pages using localStorage (no backend).
- To test a detail page directly, open `material.html?material=Vinyl` (or any listed material).

The layout is mobile-first, uses semantic HTML, focus-visible states for accessibility, and supports smooth scrolling. Colors are limited to a small, consistent palette with brand yellow highlights.
