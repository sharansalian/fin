# Pocket

A revival of the read-later experience — for everyone who still believes great articles deserve your full attention.

In 2025, Mozilla shut down the original Pocket after 14 years. This is an open-source rebuild of that idea: same name, same love of reading.

## Features

- **Save anything** — articles, videos, and pages from anywhere on the web
- **Clean reader** — strip away clutter and read in a distraction-free view
- **Tags and search** — organise your list and find anything instantly
- **Favorites** — star the articles you love and revisit them anytime
- **Archive** — keep your list clean by archiving what you've read
- **Private by default** — no tracking, no selling data

## Chrome Extension

The included extension lets you save any page to your list with one click.

To load it:

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 |
| Auth and database | Firebase |
| Build | Vite |
| Animations | Framer Motion |
| Icons | Lucide |
| Article parsing | @mozilla/readability |

## Getting Started

```bash
npm install
npm run dev
```

## GitHub

[github.com/sharansalian/pocket](https://github.com/sharansalian/pocket)
