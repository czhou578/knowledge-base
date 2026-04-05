import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

// marked string parsed locally, custom DOM manipulation handles syntax highlighting

const contentDiv = document.getElementById('content');
const navList = document.getElementById('nav-list');
let pagesMap = new Map();

async function init() {
  try {
    // Fetch the list of available pages from generated index
    const res = await fetch('/pages.json');
    const pages = await res.json();

    // Add pinned Index link at top of sidebar
    const indexLi = document.createElement('li');
    indexLi.className = 'nav-index-item';
    const indexA = document.createElement('a');
    indexA.href = '#index';
    indexA.textContent = '📋 Wiki Index';
    indexLi.appendChild(indexA);
    navList.appendChild(indexLi);

    // Add divider
    const divider = document.createElement('li');
    divider.className = 'nav-divider';
    navList.appendChild(divider);

    // Setup Navigation
    pages.forEach(page => {
      // Create safe ID from filename
      const id = page.replace('.md', '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
      pagesMap.set(id, page);
      
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${id}`;
      a.textContent = page.replace('.md', '');
      li.appendChild(a);
      navList.appendChild(li);
    });

    // Handle initial routing — default to index
    if (!window.location.hash) {
      history.replaceState(null, null, '#index');
    }
    handleRoute();

    // Listen for hash changes
    window.addEventListener('hashchange', handleRoute);
  } catch (error) {
    console.error('Failed to initialize wiki:', error);
    contentDiv.innerHTML = `<p style="color: red;">Error loading wiki index. Ensure server is running.</p>`;
  }
}

async function handleRoute() {
  let hash = window.location.hash.substring(1);

  if (!hash) {
    hash = 'index';
    history.replaceState(null, null, '#index');
  }

  // Update active state in sidebar
  document.querySelectorAll('#nav-list a').forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') === `#${hash}`) {
      a.classList.add('active');
    }
  });

  if (hash === 'index') {
    await renderIndexPage();
    return;
  }

  const filename = pagesMap.get(hash);
  if (filename) {
    await fetchAndRenderMarkdown(filename);
  } else if (hash) {
    contentDiv.innerHTML = `<h1>Page Not Found</h1><p>The requested page <code>${hash}</code> could not be found.</p>`;
  }
}

async function renderIndexPage() {
  contentDiv.style.animation = 'none';
  contentDiv.offsetHeight;
  contentDiv.innerHTML = '<div class="loader">Loading index...</div>';

  try {
    const res = await fetch('/wiki-index.json');
    const index = await res.json();

    // Group by category
    const categories = {};
    index.forEach(entry => {
      if (!categories[entry.category]) categories[entry.category] = [];
      categories[entry.category].push(entry);
    });

    const totalPages = index.length;
    const totalLinks = index.reduce((sum, e) => sum + e.linkCount, 0);

    let html = `
      <div class="wiki-index-header">
        <h1>Wiki Index</h1>
        <p class="wiki-index-meta">${totalPages} articles &nbsp;·&nbsp; ${totalLinks} external links</p>
      </div>
    `;

    const categoryOrder = [
      'Project Planning', 'Architecture', 'Libraries — MIR General',
      'Libraries — Audio Analysis', 'Libraries — Pitch Estimation',
      'Research & Conversations', 'References', 'Other'
    ];

    const orderedCats = [
      ...categoryOrder.filter(c => categories[c]),
      ...Object.keys(categories).filter(c => !categoryOrder.includes(c))
    ];

    for (const cat of orderedCats) {
      const entries = categories[cat];
      html += `<div class="index-category">`;
      html += `<h2 class="index-category-title">${cat} <span class="index-count">${entries.length}</span></h2>`;
      html += `<div class="index-cards">`;

      for (const entry of entries) {
        const id = entry.filename.replace('.md', '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
        const desc = entry.description && entry.description.length > 6
          ? entry.description.slice(0, 120) + (entry.description.length > 120 ? '…' : '')
          : 'No description.';
        const linkBadge = entry.linkCount > 0 ? `<span class="index-badge">${entry.linkCount} links</span>` : '';
        const dateBadge = entry.created ? `<span class="index-badge index-badge-date">${entry.created}</span>` : '';
        const sourceDomain = entry.source ? new URL(entry.source).hostname.replace('www.', '') : '';
        const sourceBadge = sourceDomain ? `<span class="index-badge index-badge-source">${sourceDomain}</span>` : '';

        html += `
          <a class="index-card" href="#${id}">
            <div class="index-card-title">${entry.title.replace('.md', '')}</div>
            <div class="index-card-desc">${desc}</div>
            <div class="index-card-meta">${dateBadge}${sourceBadge}${linkBadge}</div>
          </a>
        `;
      }

      html += `</div></div>`;
    }

    contentDiv.innerHTML = DOMPurify.sanitize(html);
    contentDiv.style.animation = 'fadeIn 0.4s ease-out forwards';

    // Wire up card clicks (DOMPurify strips event attrs, use event delegation)
    contentDiv.querySelectorAll('.index-card').forEach(card => {
      card.addEventListener('click', e => {
        e.preventDefault();
        const href = card.getAttribute('href');
        window.location.hash = href;
      });
    });
  } catch (err) {
    contentDiv.innerHTML = `<h1>Index Unavailable</h1><p>Could not load wiki-index.json. Run the dev server to regenerate it.</p>`;
    console.error('Index render error:', err);
  }
}

async function fetchAndRenderMarkdown(filename) {
  contentDiv.style.animation = 'none';
  contentDiv.offsetHeight; // Trigger reflow
  contentDiv.innerHTML = '<div class="loader">Loading...</div>';
  
  try {
    const res = await fetch(`/raw/${filename}`);
    if (!res.ok) {
      // Remove any pages that are not found from the sidebar
      let failedHash = "";
      for (let [k, v] of pagesMap.entries()) {
        if (v === filename)failedHash = k;
      }
      if (failedHash) {
        pagesMap.delete(failedHash);
        const linkToRemove = navList.querySelector(`a[href="#${failedHash}"]`);
        if (linkToRemove && linkToRemove.parentElement) linkToRemove.parentElement.remove();
      }
      throw new Error('File not found');
    }
    const markdown = await res.text();
    
    // Parse markdown to HTML
    const rawHtml = marked.parse(markdown);
    
    // Post-process HTML utilizing DOM APIs for cleaner AST manipulation
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;
    
    // 1. Remove links from headers
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      heading.querySelectorAll('a').forEach(aEl => {
        // Replace the <a> tag with its inner text node directly
        aEl.replaceWith(document.createTextNode(aEl.textContent));
      });
    });
    
    // 2. Format code blocks correctly using highlight.js directly on the DOM
    tempDiv.querySelectorAll('pre code').forEach(codeEl => {
      let lang = 'plaintext';
      codeEl.classList.forEach(c => {
        if (c.startsWith('language-')) {
          lang = c.replace('language-', '');
        }
      });
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      
      const highlighted = hljs.highlight(codeEl.textContent, { language }).value;

      // Wrap each line in a .line span for line-number display via CSS counters
      const lines = highlighted.split('\n');
      // Remove trailing empty line if present
      if (lines[lines.length - 1] === '') lines.pop();
      codeEl.innerHTML = lines.map(l => `<span class="line">${l}</span>`).join('\n');

      codeEl.classList.add('hljs', `language-${language}`);
      
      if (codeEl.parentElement.tagName === 'PRE') {
        codeEl.parentElement.classList.add('hljs', 'line-numbers');
      }
    });

    // 2.5 Make all text links clickable
    const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let textNode;
    while((textNode = walker.nextNode())) {
      if (textNode.parentElement && textNode.parentElement.tagName !== 'A' && textNode.parentElement.tagName !== 'CODE' && textNode.parentElement.tagName !== 'PRE') {
        textNodes.push(textNode);
      }
    }
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    textNodes.forEach(node => {
      if (urlRegex.test(node.nodeValue)) {
        const span = document.createElement('span');
        span.innerHTML = node.nodeValue.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
        node.replaceWith(...span.childNodes);
      }
    });
    
    // Ensure existing links are clickable and external links open in a new tab
    tempDiv.querySelectorAll('a').forEach(aEl => {
      if (aEl.getAttribute('href') && aEl.getAttribute('href').startsWith('http')) {
        aEl.setAttribute('target', '_blank');
      }
    });

    // 3. Format mermaid diagrams
    tempDiv.querySelectorAll('pre code.language-mermaid').forEach(codeEl => {
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = codeEl.textContent;
      codeEl.parentElement.replaceWith(div);
    });
    
    // Sanitize the properly manipulated HTML structure (allowing target attribute for clickable external links)
    const cleanHtml = DOMPurify.sanitize(tempDiv.innerHTML, { ADD_ATTR: ['target'] });
    
    contentDiv.innerHTML = cleanHtml;
    contentDiv.style.animation = 'fadeIn 0.4s ease-out forwards';

    // Render Mermaid diagrams
    if (window.mermaid) {
      mermaid.initialize({ startOnLoad: false, theme: 'dark' });
      const mermaidNodes = contentDiv.querySelectorAll('.mermaid');
      if (mermaidNodes.length > 0) {
        try {
          await mermaid.run({ nodes: mermaidNodes });
        } catch (e) {
          console.error('Mermaid render error:', e);
        }
      }
    }
  } catch (err) {
    contentDiv.innerHTML = `<h1>Error</h1><p>Failed to load ${filename}.</p>`;
    console.error('Render error:', err);
  }
}

init();
