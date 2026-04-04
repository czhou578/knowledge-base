# Goal Description

The goal is to create a dynamic and visually stunning Wiki application out of the markdown files located in the `raw` directory. The structure and content of these files will be parsed and rendered inside an interactive user interface, allowing for easy reading and navigation.

## User Review Required

> [!IMPORTANT]
> Please review the chosen technology stack below. I've opted for a lightweight, custom Vite-powered SPA (Single Page Application) using Vanilla Javascript and CSS, as per the design guidelines. This approach gives us complete control over producing a premium, top-tier design while avoiding bloated frameworks. 
> Alternatively, if you would prefer a fully-fledged markdown framework like **Docusaurus**, **Nextra**, or **MkDocs**, please let me know before we proceed!

## Proposed Changes

We will build an SPA inside the existing `wiki/` directory.

### Build Tooling
- Initialize a vanilla Vite project to serve the development server and bundle the site.
- Install `marked` (for markdown parsing) and `dompurify` (for security).

### Application Architecture

#### [NEW] wiki/index.html
The main HTML shell featuring:
- A responsive sidebar for navigation.
- A main content area to display the rendered markdown.
- CDN links for fonts (Google Fonts: Inter or Outfit) and icons.

#### [NEW] wiki/src/style.css
A robust stylesheet to implement a premium aesthetic:
- A curated dark mode color palette with gradients.
- Glassmorphism effects for the sidebar.
- Smooth micro-animations for hover states and page transitions.
- Elegant typography rules for generated markdown (headers, code blocks, blockquotes).

#### [NEW] wiki/src/main.js
The core logic for the wiki:
- Creates a central configuration consisting of a list of the available `raw` files.
- Modifies the browser URL hash to handle routing (e.g., `/#/Building-an-AI-music-coaching-consultant`).
- Dynamically `fetch()`es the corresponding `.md` file from the `raw` directory.
- Parses the markdown using `marked` and displays it in the content area with a fade-in animation.

#### [NEW] wiki/scripts/generate_index.js
A small helper script that runs during the build/dev process to scan the `..\raw\` directory and automatically update the list of available wiki pages, ensuring any new markdown files are instantly picked up by the sidebar navigation.

## Open Questions

> [!QUESTION]
> 1. Do you want the root index (`/`) to show a specific markdown page by default (e.g., a welcome page), or just the first file in the directory?
> 2. Are you comfortable with me moving/copying the `raw` directory into the `wiki/public/` folder so it can be reliably served by Vite, or must it remain exactly in its current path `c:\Users\mycol\WebProjects\knowledge-base\raw`? (I can configure Vite to serve it from the parent directory if needed).

## Verification Plan

### Automated/Local Tests
- Run `npm run dev` in the `wiki` directory.
- Navigate between multiple wiki pages to ensure the markdown is fetching and rendering correctly without a full page reload.

### Manual Verification
- Review the aesthetic design of the wiki to ensure it meets the "premium" standard, including typography, colors, and layout.
- Check code snippets in the markdown to ensure they are visually distinct and readable.
