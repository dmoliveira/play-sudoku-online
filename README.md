# Sudoku Sakura

Japanese-inspired Sudoku for GitHub Pages, built with plain HTML, CSS, and JavaScript.

## Features

- Easy, medium, advanced, hard, and expert puzzles
- Classic, zen, sprint, no-mistakes, no-notes, no-check, and daily challenge modes
- Timer, pause/resume, and background auto-pause
- Notes mode and optional wrong-guess highlighting
- Local best times, streaks, starts, abandons, and engagement stats with `localStorage`
- URL-driven state for difficulty, mode, notes, and mistake feedback
- Responsive board-first layout
- Technique-aware hints, puzzle insights, and near-board ritual suggestions
- SEO-friendly landing content and supporting guide pages
- Top menu with Diego Marinho link

## Run locally

Open `index.html` directly in a browser, or serve the folder with a static server.

## Validate locally

```bash
npm run validate
```

This checks:

- puzzle integrity and clue consistency
- JavaScript syntax for `app.js`, `sudoku.js`, and `puzzles.js`

## Publish on GitHub Pages

1. Push this folder to a GitHub repository.
2. In GitHub, open **Settings → Pages**.
3. Set the source to deploy from the main branch root.
4. Update canonical URLs in `index.html`, `robots.txt`, `sitemap.xml`, and content pages if the repo name changes.

## Notes

The current menu uses this default:

- CV page: `https://dmoliveira.github.io/my-cv-public/cv/human/`

Adjust it if you want a different destination.
