# UX Lens

An AI "Dual Lens" UX evaluation tool — Heuristics Evaluation & Heatmap Analysis — built from the Figma design as a working React + Vite website with running mock data.

## Screens

- **Home** — prompt input, page/tool/heuristic selectors, "Generate Report".
- **Heuristic evaluation** — observation viewer with annotated screenshot, severity, observation & recommendation cards, expandable category sidebar.
- **Attention insight** — heatmap overlay viewer with attention scores and metrics.
- **Accessibility** — score gauge, per-check breakdown, WCAG comments.
- **Competitor analysis** — editable competitor list + feature comparison matrix.

All data is mock data in `src/data/mockData.js`. No backend or API keys required.

## Run it

You need [Node.js](https://nodejs.org) 18+ installed. Then, in this folder:

```bash 
npm install
npm install
```

Vite prints a local URL (default http://localhost:5173) and opens it automatically.

To make a production build:

```bash
npm run build
npm run preview
```

## Tech

- React 18 + React Router (hash routing, so it also works opened from a static host)
- Vite 5
- Plain CSS (no UI framework) — design tokens live at the top of `src/index.css`

## Project structure

```
src/
  main.jsx              app entry + router
  App.jsx               routes
  index.css             all styles + theme tokens
  data/mockData.js      every screen's mock data
  components/
    ReportLayout.jsx    top bar + tabs + shared right panel
    TopBar.jsx, ReportTabs.jsx, RightPanel.jsx
    MockBankPage.jsx    CSS mock of the evaluated site (screenshot base)
    Icons.jsx           inline SVG icons
  pages/
    Home.jsx
    HeuristicEvaluation.jsx
    AttentionInsight.jsx
    Accessibility.jsx
    CompetitorAnalysis.jsx
```
