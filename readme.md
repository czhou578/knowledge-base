# Research Knowledge Base for AI Agents

This repository serves as a specialized, locally-hosted knowledge base designed for AI agents. It was originally built to hold research, documentation, and chat logs for building an AI-powered violin music coaching consultant.

The core idea is to curate raw information (like markdown files downloaded from the web or AI chats) and feed it into a local compilation pipeline. This produces a dynamic, readable wiki application that both humans and AI agents can navigate, query, and learn from.

## Project Structure

```text
├── raw/          # source PDFs, articles, datasets, images, etc.
├── scripts/      # Automation and scraping scripts
├── wiki/         # The frontend SPA wiki application 
│   ├── public/   # Public assets including the raw markdown
│   ├── scripts/  # Build scripts for the wiki index
│   └── src/      # JavaScript and CSS for the frontend wiki
├── images/       # all visuals (auto-referenced in .md)
├── outputs/      # query results, slides, plots (filed back into wiki/)
└── tools/        # your custom search engine, scripts, etc.
```

## How to Run the Wiki

The frontend is a Single Page Application (SPA) built with Vite. It renders markdown files on the fly and provides a sidebar navigation system based on a generated JSON index.

1. Ensure you have Node.js installed.
2. Navigate to the `wiki` directory:
   ```bash
   cd wiki
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open the URL provided in your terminal (typically `http://localhost:5173`) to view the web app.

Note: Before running `npm run dev`, the `predev` script automatically executes `scripts/generate-index.js` to ensure the wiki's navigation reflects your latest markdown files.

## Key Files

* **`AGENTS.md`**: Contains the core rules, behavior instructions, and action definitions (Ingest, Query, Lint) for the AI agent (like Claude) interacting with this knowledge base.
* **`log.md`**: An append-only, chronological record of all operations performed on the knowledge base. It tracks ingests, queries, and their results, making it easy to parse the wiki's evolution.
* **`wiki/scripts/generate-index.js`**: Re-compiles the knowledge base structure. It parses the metadata (frontmatter) of all markdown files in `wiki/public/raw` and outputs `wiki-index.json`.
* **`wiki/public/wiki-index.json`**: The compiled metadata index of all pages, including titles, sources, creation dates, and tags. This serves as the "table of contents" for both the frontend SPA and the AI agents.
* **`wiki/src/main.js`**: The core logic of the frontend SPA. It handles routing, fetches the selected markdown files, parses them to HTML (using `marked`), renders mermaid diagrams, adds syntax highlighting, and injects the result into the DOM.
* **`scripts/scraper.py`**: A Playwright script designed to automate fetching data from dynamic web sources.
