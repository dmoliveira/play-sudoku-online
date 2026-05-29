# Sudoku Sakura

Japanese-inspired Sudoku and Suguru for GitHub Pages, built with plain HTML, CSS, and JavaScript.

## Features

- Sudoku with easy, medium, advanced, hard, and expert levels
- Suguru with dynamic level options and a dedicated challenge tier
- Classic, zen, sprint, no-mistakes, no-notes, no-check, daily, and challenge play variants
- Timer, pause/resume, and background auto-pause
- Notes mode and optional wrong-guess highlighting
- Optional Symbol Play with dual-label symbol themes and visible/fading legends while keeping numeric input
- Local best times, streaks, starts, abandons, and engagement stats with `localStorage`
- URL-driven state for game, difficulty/level, mode, notes, and mistake feedback
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
- JavaScript syntax for `app.js`, `games.js`, `game-switcher.js`, `sudoku.js`, `puzzles.js`, `suguru.js`, `suguru-puzzles.js`, and `suguru-app.js`

## Publish on GitHub Pages

1. Push this folder to a GitHub repository.
2. In GitHub, open **Settings → Pages**.
3. Set the source to deploy from the main branch root.
4. Update canonical URLs in `index.html`, `robots.txt`, `sitemap.xml`, and content pages if the repo name changes.

## Notes

The current menu uses this default:

- CV page: `https://dmoliveira.github.io/my-cv-public/cv/human/`

Adjust it if you want a different destination.
