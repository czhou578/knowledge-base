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

    // Handle initial routing
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
  
  if (!hash && pagesMap.size > 0) {
    // Show the first page by default as requested
    const firstKey = Array.from(pagesMap.keys())[0];
    hash = firstKey;
    // Without altering browser history unnecessarily
    history.replaceState(null, null, `#${hash}`);
  }

  // Update active state in sidebar
  document.querySelectorAll('#nav-list a').forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') === `#${hash}`) {
      a.classList.add('active');
    }
  });

  const filename = pagesMap.get(hash);
  if (filename) {
    await fetchAndRenderMarkdown(filename);
  } else if (hash) {
    contentDiv.innerHTML = `<h1>Page Not Found</h1><p>The requested page <code>${hash}</code> could not be found.</p>`;
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
