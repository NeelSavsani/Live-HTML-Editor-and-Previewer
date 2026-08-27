/**
 * CodeNest - Modern Online Code Editor & Live Previewer
 * Powered by Monaco Editor
 */

// Initial File Templates matching the OneCompiler demo
const defaultFiles = {
  'index.html': {
    name: 'index.html',
    language: 'html',
    iconClass: 'fa-brands fa-html5 html',
    content: `<!DOCTYPE html>
<html>
  <head>
    <title>Hello, World!</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <h1 class="title">Hello World!</h1>
    <p id="currentTime"></p>
    <script src="script.js"><\/script>
  </body>
</html>`
  },
  'styles.css': {
    name: 'styles.css',
    language: 'css',
    iconClass: 'fa-brands fa-css3-alt css',
    content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Ubuntu', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #ffffff;
  color: #1e293b;
  text-align: center;
  padding: 20px;
}

.title {
  font-size: 2.75rem;
  font-weight: 700;
  color: #4f46e5;
  margin-bottom: 1rem;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

#currentTime {
  font-size: 1.15rem;
  color: #64748b;
  font-weight: 500;
  padding: 8px 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}`
  },
  'script.js': {
    name: 'script.js',
    language: 'javascript',
    iconClass: 'fa-brands fa-js js',
    content: `function updateTime() {
  const now = new Date();
  const options = {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  };
  const timeString = now.toUTCString();
  const timeElement = document.getElementById("currentTime");
  if (timeElement) {
    timeElement.innerText = timeString;
  }
}

// Initial update & dynamic interval
updateTime();
setInterval(updateTime, 1000);

console.log("CodeNest live preview running successfully!");`
  }
};

// Application State
const state = {
  files: JSON.parse(JSON.stringify(defaultFiles)),
  activeFile: 'index.html',
  currentPreviewHtml: 'index.html',
  isExplorerOpen: false,
  editor: null,
  models: {},
  viewStates: {},
  theme: 'vs-dark', // 'vs-dark' or 'vs'
  autoRun: false,
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  isConsoleOpen: false,
  consoleEntries: [],
  debounceTimer: null,
  lastExecutedCode: ''
};

// Monaco Fast Worker Environment (prevents worker fetch timeout delays)
window.MonacoEnvironment = {
  getWorkerUrl: function () {
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
      self.MonacoEnvironment = {
        baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/'
      };
      importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/base/worker/workerMain.js');
    `)}`;
  }
};

// Monaco Configuration using high-speed CDN
require.config({
  paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
});

// Initialize App once DOM and Monaco are ready
document.addEventListener('DOMContentLoaded', () => {
  initUIEvents();
  initResizer();
  initConsoleListener();
  
  require(['vs/editor/editor.main'], () => {
    initMonaco();
  });
});

/**
 * Initialize Monaco Editor and File Models
 */
function initMonaco() {
  // Configure HTML Language Options
  monaco.languages.html.htmlDefaults.setOptions({
    format: { tabSize: state.tabSize, insertSpaces: true },
    suggest: { html5: true }
  });

  // Register HTML Snippets
  registerHtmlSnippets();

  // Create Monaco Models for all initial files
  Object.keys(state.files).forEach(fileName => {
    const file = state.files[fileName];
    const uri = monaco.Uri.parse(`inmemory://workspace/${fileName}`);
    state.models[fileName] = monaco.editor.createModel(file.content, file.language, uri);
    
    // Listen to changes to keep file.content updated (without auto-running on keyup)
    state.models[fileName].onDidChangeContent(() => {
      file.content = state.models[fileName].getValue();
    });
  });

  // Mount Monaco Editor
  const container = document.getElementById('monaco-container');
  state.editor = monaco.editor.create(container, {
    model: state.models[state.activeFile],
    theme: state.theme,
    fontSize: state.fontSize,
    tabSize: state.tabSize,
    wordWrap: state.wordWrap,
    automaticLayout: true,
    fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
    fontLigatures: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    bracketPairColorization: { enabled: true },
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    padding: { top: 12, bottom: 12 }
  });

  // Update Cursor Position in Statusbar
  state.editor.onDidChangeCursorPosition(e => {
    const pos = e.position;
    document.getElementById('status-cursor').innerText = `Ln ${pos.lineNumber}, Col ${pos.column}`;
  });

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to Run
  state.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    runPreview();
    showToast('Code executed');
  });

  // Render initial Tabs and Explorer UI
  renderTabs();
  renderExplorerFiles();

  // Initial Run
  runPreview();
}

/**
 * Register HTML code snippets
 */
function registerHtmlSnippets() {
  const createSnippet = (label, body, doc) => ({
    label,
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: body,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: doc || `${label} snippet`
  });

  monaco.languages.registerCompletionItemProvider('html', {
    provideCompletionItems: () => ({
      suggestions: [
        createSnippet('!', '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t$0\n</body>\n</html>', 'HTML5 Boilerplate'),
        createSnippet('div', '<div>$1</div>'),
        createSnippet('div.class', '<div class="$1">\n\t$2\n</div>'),
        createSnippet('span', '<span>$1</span>'),
        createSnippet('p', '<p>$1</p>'),
        createSnippet('h1', '<h1>$1</h1>'),
        createSnippet('h2', '<h2>$1</h2>'),
        createSnippet('h3', '<h3>$1</h3>'),
        createSnippet('button', '<button class="$1">$2</button>'),
        createSnippet('a', '<a href="$1" target="_blank">$2</a>'),
        createSnippet('img', '<img src="$1" alt="$2">'),
        createSnippet('ul', '<ul>\n\t<li>$1</li>\n</ul>'),
        createSnippet('li', '<li>$1</li>'),
        createSnippet('form', '<form action="$1" method="$2">\n\t$3\n</form>'),
        createSnippet('input', '<input type="${1:text}" placeholder="$2">'),
        createSnippet('section', '<section id="$1">\n\t$2\n</section>'),
        createSnippet('header', '<header>\n\t$1\n</header>'),
        createSnippet('footer', '<footer>\n\t$1\n</footer>'),
        createSnippet('script', '<script>\n\t$1\n<\/script>')
      ]
    })
  });
}

/**
 * Render editor tabs
 */
function renderTabs() {
  const container = document.getElementById('tabs-container');
  container.innerHTML = '';

  Object.keys(state.files).forEach(fileName => {
    const file = state.files[fileName];
    const isActive = fileName === state.activeFile;

    const tab = document.createElement('div');
    tab.className = `editor-tab ${isActive ? 'active' : ''}`;
    tab.dataset.file = fileName;
    tab.innerHTML = `
      <i class="${file.iconClass} tab-icon"></i>
      <span>${file.name}</span>
      ${Object.keys(state.files).length > 1 ? `<span class="tab-close" data-close="${fileName}" title="Close tab"><i class="fa-solid fa-xmark"></i></span>` : ''}
    `;

    tab.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) {
        e.stopPropagation();
        closeFileTab(fileName);
        return;
      }
      switchFileTab(fileName);
    });

    container.appendChild(tab);
  });

  // Update Statusbar Active Language
  const activeFileObj = state.files[state.activeFile];
  if (activeFileObj) {
    document.getElementById('status-lang').innerText = activeFileObj.language.toUpperCase();
    document.getElementById('nav-lang-label').innerText = activeFileObj.language.toUpperCase();
  }

  // Also sync Explorer Files list
  renderExplorerFiles();
}

/**
 * Render Explorer Sidebar file tree items
 */
function renderExplorerFiles() {
  const container = document.getElementById('sidebar-files-list');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(state.files).forEach(fileName => {
    const file = state.files[fileName];
    const isActive = fileName === state.activeFile;

    const item = document.createElement('div');
    item.className = `sidebar-file-item ${isActive ? 'active' : ''}`;
    item.dataset.file = fileName;
    item.innerHTML = `
      <div class="sidebar-file-info">
        <i class="${file.iconClass}"></i>
        <span class="sidebar-file-name">${file.name}</span>
      </div>
      ${Object.keys(state.files).length > 1 ? `<span class="sidebar-file-close" data-close="${fileName}" title="Delete file"><i class="fa-solid fa-xmark"></i></span>` : ''}
    `;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.sidebar-file-close')) {
        e.stopPropagation();
        closeFileTab(fileName);
        return;
      }
      switchFileTab(fileName);
    });

    container.appendChild(item);
  });
}

/**
 * Toggle Explorer Sidebar (open / close)
 */
function toggleExplorerSidebar(force) {
  const sidebar = document.getElementById('sidebar-explorer');
  const activityBtn = document.getElementById('btn-activity-explorer');
  if (!sidebar) return;

  const isCurrentlyCollapsed = sidebar.classList.contains('collapsed');
  const shouldOpen = typeof force === 'boolean' ? force : isCurrentlyCollapsed;
  state.isExplorerOpen = shouldOpen;

  if (shouldOpen) {
    sidebar.classList.remove('collapsed');
    if (activityBtn) activityBtn.classList.add('active');
  } else {
    sidebar.classList.add('collapsed');
    if (activityBtn) activityBtn.classList.remove('active');
  }

  // Trigger Monaco relayout on animation intervals
  [50, 150, 250].forEach(delay => {
    setTimeout(() => {
      if (state.editor) state.editor.layout();
    }, delay);
  });
}

/**
 * Switch Active Tab
 */
function switchFileTab(fileName) {
  if (fileName === state.activeFile || !state.files[fileName]) return;

  // Save current view state (scroll, cursor)
  if (state.editor && state.activeFile) {
    state.viewStates[state.activeFile] = state.editor.saveViewState();
  }

  state.activeFile = fileName;

  // If switched to an HTML file, set as current preview file
  if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
    state.currentPreviewHtml = fileName;
  }

  // Switch Monaco Model
  if (state.editor && state.models[fileName]) {
    state.editor.setModel(state.models[fileName]);
    if (state.viewStates[fileName]) {
      state.editor.restoreViewState(state.viewStates[fileName]);
    }
    state.editor.focus();
  }

  renderTabs();

  // If switched to an HTML file, update preview immediately
  if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
    runPreview(true);
  }
}

/**
 * Close a tab
 */
function closeFileTab(fileName) {
  if (Object.keys(state.files).length <= 1) {
    showToast('Cannot close the only open file');
    return;
  }

  // Dispose model
  if (state.models[fileName]) {
    state.models[fileName].dispose();
    delete state.models[fileName];
  }
  delete state.files[fileName];
  delete state.viewStates[fileName];

  // If active file was closed, switch to another
  if (state.activeFile === fileName) {
    state.activeFile = Object.keys(state.files)[0];
    if (state.editor && state.models[state.activeFile]) {
      state.editor.setModel(state.models[state.activeFile]);
    }
  }

  renderTabs();
}

/**
 * Add a new file
 */
function addNewFile(filename) {
  if (!filename || state.files[filename]) {
    showToast('File already exists or invalid name');
    return;
  }

  let language = 'plaintext';
  let iconClass = 'fa-solid fa-file';

  if (filename.endsWith('.html') || filename.endsWith('.htm')) {
    language = 'html';
    iconClass = 'fa-brands fa-html5 html';
  } else if (filename.endsWith('.css')) {
    language = 'css';
    iconClass = 'fa-brands fa-css3-alt css';
  } else if (filename.endsWith('.js')) {
    language = 'javascript';
    iconClass = 'fa-brands fa-js js';
  } else if (filename.endsWith('.json')) {
    language = 'json';
    iconClass = 'fa-solid fa-code';
  }

  state.files[filename] = {
    name: filename,
    language,
    iconClass,
    content: ''
  };

  const uri = monaco.Uri.parse(`inmemory://workspace/${filename}`);
  state.models[filename] = monaco.editor.createModel('', language, uri);
  
  state.models[filename].onDidChangeContent(() => {
    state.files[filename].content = state.models[filename].getValue();
  });

  renderTabs();
  switchFileTab(filename);
  showToast(`Created ${filename}`);
}

/**
 * Debounced Run Trigger for Live Auto-Update
 */
function debouncedRun() {
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(() => {
    runPreview();
  }, 400);
}

/**
 * Execute and Render Live Preview
 */
function runPreview(force) {
  // Determine which HTML file to preview
  const activeHtmlName = (state.activeFile && (state.activeFile.endsWith('.html') || state.activeFile.endsWith('.htm')))
    ? state.activeFile
    : (state.currentPreviewHtml && state.files[state.currentPreviewHtml] ? state.currentPreviewHtml : (Object.keys(state.files).find(f => f.endsWith('.html')) || 'index.html'));

  state.currentPreviewHtml = activeHtmlName;

  let htmlContent = state.files[activeHtmlName] ? (state.models[activeHtmlName] ? state.models[activeHtmlName].getValue() : state.files[activeHtmlName].content) : '';
  const defaultCss = state.files['styles.css'] ? (state.models['styles.css'] ? state.models['styles.css'].getValue() : state.files['styles.css'].content) : '';
  const defaultJs = state.files['script.js'] ? (state.models['script.js'] ? state.models['script.js'].getValue() : state.files['script.js'].content) : '';

  // Collect all files snapshot for cache comparison
  const allFilesSnapshot = Object.keys(state.files).map(k => `${k}:${state.models[k] ? state.models[k].getValue() : state.files[k].content}`).join('---');
  const combinedKey = `${activeHtmlName}|||${allFilesSnapshot}`;
  
  if (!force && state.lastExecutedCode === combinedKey) {
    return;
  }
  state.lastExecutedCode = combinedKey;

  const statusDot = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  
  if (statusDot) statusDot.className = 'status-dot busy';
  if (statusText) statusText.innerText = 'Running...';

  // Console Proxy and Navigation Interception Script
  const previewHelperScript = `
    <script>
      (function() {
        const _origLog = console.log;
        const _origWarn = console.warn;
        const _origError = console.error;
        const _origInfo = console.info;

        function serialize(arg) {
          if (arg === null) return 'null';
          if (arg === undefined) return 'undefined';
          if (typeof arg === 'object') {
            try { return JSON.stringify(arg, null, 2); } catch(e) { return String(arg); }
          }
          return String(arg);
        }

        function post(type, args) {
          try {
            const formatted = Array.from(args).map(serialize).join(' ');
            window.parent.postMessage({
              source: 'codenest-preview',
              type: type,
              message: formatted,
              time: new Date().toLocaleTimeString()
            }, '*');
          } catch(e) {}
        }

        console.log = function(...args) { post('log', args); _origLog.apply(console, args); };
        console.info = function(...args) { post('info', args); _origInfo.apply(console, args); };
        console.warn = function(...args) { post('warn', args); _origWarn.apply(console, args); };
        console.error = function(...args) { post('error', args); _origError.apply(console, args); };

        window.onerror = function(msg, url, line, col, error) {
          post('error', [msg + (line ? ' (line ' + line + ')' : '')]);
          return false;
        };

        // Intercept link clicks to prevent iframe navigation crash
        document.addEventListener('click', function(e) {
          var a = e.target.closest('a');
          if (!a) return;
          var href = a.getAttribute('href');
          if (!href || href.startsWith('javascript:') || href === '#') return;

          e.preventDefault();
          e.stopPropagation();

          if (href.startsWith('http://') || href.startsWith('https://')) {
            window.open(href, '_blank');
          } else {
            var clean = href.replace(/^(\\.\\/|\\/)/, '').split('#')[0].split('?')[0];
            window.parent.postMessage({
              source: 'codenest-preview',
              type: 'navigate',
              target: clean,
              fullHref: href
            }, '*');
          }
        }, true);
      })();
    <\/script>
  `;

  // Dynamically inline any linked CSS files in htmlContent
  let inlinedStyles = '';

  htmlContent = htmlContent.replace(/<link[^>]+href=["'](?:\.\/)?([^"']+\.css)["'][^>]*>/gi, (match, cssFilename) => {
    if (state.files[cssFilename]) {
      const cssVal = state.models[cssFilename] ? state.models[cssFilename].getValue() : state.files[cssFilename].content;
      return `<style data-file="${cssFilename}">\n${cssVal}\n</style>`;
    }
    return match;
  });

  // Dynamically inline any linked JS files in htmlContent
  let inlinedScripts = '';

  htmlContent = htmlContent.replace(/<script[^>]+src=["'](?:\.\/)?([^"']+\.js)["'][^>]*>\s*<\/script>/gi, (match, jsFilename) => {
    if (state.files[jsFilename]) {
      const jsVal = state.models[jsFilename] ? state.models[jsFilename].getValue() : state.files[jsFilename].content;
      return `<script data-file="${jsFilename}">\ntry {\n${jsVal}\n} catch(err) { console.error(err.message || err); }\n<\/script>`;
    }
    return match;
  });

  // Assemble full document
  let docContent = '';
  if (htmlContent.includes('<head>')) {
    docContent = htmlContent.replace('<head>', `<head>${previewHelperScript}${inlinedStyles}`);
  } else {
    docContent = `<!DOCTYPE html><html><head>${previewHelperScript}${inlinedStyles}</head><body>${htmlContent}</body></html>`;
  }

  if (inlinedScripts) {
    if (docContent.includes('</body>')) {
      docContent = docContent.replace('</body>', `${inlinedScripts}</body>`);
    } else {
      docContent += inlinedScripts;
    }
  }

  const iframe = document.getElementById('output-frame');
  if (iframe) {
    iframe.srcdoc = docContent;
  }

  setTimeout(() => {
    if (statusDot) statusDot.className = 'status-dot';
    if (statusText) statusText.innerText = 'Ready';
  }, 200);
}

/**
 * Handle Console Logs and Navigation from Iframe
 */
function initConsoleListener() {
  window.addEventListener('message', (e) => {
    if (!e.data || e.data.source !== 'codenest-preview') return;

    if (e.data.type === 'navigate') {
      const target = e.data.target;
      let targetFile = null;
      if (state.files[target]) {
        targetFile = target;
      } else if (state.files[target + '.html']) {
        targetFile = target + '.html';
      } else if (state.files[target + '.htm']) {
        targetFile = target + '.htm';
      }

      if (targetFile) {
        state.currentPreviewHtml = targetFile;
        switchFileTab(targetFile);
        showToast(`Opened ${targetFile}`);
      } else {
        showToast(`File "${target}" not found in project`);
      }
      return;
    }

    const { type, message, time } = e.data;
    addConsoleEntry(type, message, time);
  });
}

function addConsoleEntry(type, message, time) {
  state.consoleEntries.push({ type, message, time });
  
  const container = document.getElementById('console-body');
  const entry = document.createElement('div');
  entry.className = `console-entry ${type}`;
  entry.innerHTML = `
    <span class="console-time">${time || new Date().toLocaleTimeString()}</span>
    <span class="console-text">${escapeHtml(message)}</span>
  `;
  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;

  // Update Console Badge
  updateConsoleBadge();
}

function updateConsoleBadge() {
  const badge = document.getElementById('console-badge');
  const count = state.consoleEntries.length;
  badge.innerText = count;

  const errorCount = state.consoleEntries.filter(e => e.type === 'error').length;
  if (errorCount > 0) {
    badge.className = 'console-badge error';
  } else {
    badge.className = 'console-badge';
  }
}

function clearConsole() {
  state.consoleEntries = [];
  document.getElementById('console-body').innerHTML = '';
  updateConsoleBadge();
  showToast('Console cleared');
}

/**
 * Split Pane Resizer
 */
function initResizer() {
  const divider = document.getElementById('pane-divider');
  const editorPane = document.getElementById('editor-pane');
  const splitContainer = document.getElementById('split-container');

  let isDragging = false;

  divider.addEventListener('mousedown', (e) => {
    isDragging = true;
    divider.classList.add('dragging');
    document.body.style.cursor = window.innerWidth <= 820 ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const rect = splitContainer.getBoundingClientRect();
    const isMobile = window.innerWidth <= 820;

    if (isMobile) {
      const offsetY = e.clientY - rect.top;
      const percentage = (offsetY / rect.height) * 100;
      if (percentage >= 20 && percentage <= 80) {
        editorPane.style.height = `${percentage}%`;
      }
    } else {
      const offsetX = e.clientX - rect.left;
      const percentage = (offsetX / rect.width) * 100;
      if (percentage >= 20 && percentage <= 80) {
        editorPane.style.width = `${percentage}%`;
      }
    }

    if (state.editor) {
      state.editor.layout();
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      divider.classList.remove('dragging');
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      if (state.editor) state.editor.layout();
    }
  });
}

/**
 * UI Event Handlers & Modals
 */
function initUIEvents() {
  // Run Button
  document.getElementById('btn-run').addEventListener('click', () => {
    runPreview();
    showToast('Code executed');
  });

  // Add Tab (+) Button
  document.getElementById('btn-add-tab').addEventListener('click', () => {
    openModal('modal-new-file');
  });

  // Sidebar Header Add File (+) Button
  const btnSidebarAdd = document.getElementById('btn-sidebar-add-file');
  if (btnSidebarAdd) {
    btnSidebarAdd.addEventListener('click', () => {
      openModal('modal-new-file');
    });
  }

  // Theme Toggle Button
  document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);

  // Share Button
  document.getElementById('btn-share').addEventListener('click', () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Project link copied to clipboard!');
    }).catch(() => {
      showToast('Link ready to share!');
    });
  });

  // Download Project Button
  document.getElementById('btn-download').addEventListener('click', downloadProject);

  // Fullscreen Button
  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

  // Settings Button
  document.getElementById('btn-settings').addEventListener('click', () => {
    openModal('modal-settings');
  });

  // Refresh Preview Button
  document.getElementById('btn-refresh-preview').addEventListener('click', () => {
    runPreview();
    showToast('Preview refreshed');
  });

  // Popout Preview Button (Open in new window)
  document.getElementById('btn-popout-preview').addEventListener('click', openPreviewInNewWindow);

  // Console Drawer Header Toggle
  document.getElementById('console-header').addEventListener('click', (e) => {
    if (e.target.closest('.console-btn')) return;
    const drawer = document.getElementById('console-drawer');
    drawer.classList.toggle('expanded');
    state.isConsoleOpen = drawer.classList.contains('expanded');
  });

  // Clear Console Button
  document.getElementById('btn-clear-console').addEventListener('click', clearConsole);

  // Language badge dropdown
  const langBadge = document.getElementById('lang-badge');
  const langMenu = document.getElementById('dropdown-lang');
  if (langBadge && langMenu) {
    langBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      langMenu.classList.toggle('show');
    });

    // Close dropdown on outside click
    document.addEventListener('click', () => {
      langMenu.classList.remove('show');
    });
  }

  // Files / Explorer Activity Button Toggle
  const btnActivityExplorer = document.getElementById('btn-activity-explorer');
  if (btnActivityExplorer) {
    btnActivityExplorer.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleExplorerSidebar();
    });
  }

  // Dropdown & Generic Action elements
  document.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', (e) => {
      const action = el.dataset.action;
      if (action) handleAction(action);
    });
  });

  // Modal Closers
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllModals();
    });
  });

  // Modal Overlay click outside
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  // Form Submissions
  document.getElementById('form-new-file').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('input-filename');
    const filename = input.value.trim();
    if (filename) {
      addNewFile(filename);
      input.value = '';
      closeAllModals();
    }
  });

  // Settings Modal Controls
  // Font Size Stepper
  const btnFontDec = document.getElementById('btn-font-dec');
  const btnFontInc = document.getElementById('btn-font-inc');
  if (btnFontDec) {
    btnFontDec.addEventListener('click', () => updateFontSize(state.fontSize - 1));
  }
  if (btnFontInc) {
    btnFontInc.addEventListener('click', () => updateFontSize(state.fontSize + 1));
  }

  // Theme Settings Pills
  const btnThemeLight = document.getElementById('btn-setting-theme-light');
  const btnThemeDark = document.getElementById('btn-setting-theme-dark');
  if (btnThemeLight) {
    btnThemeLight.addEventListener('click', () => setTheme('light'));
  }
  if (btnThemeDark) {
    btnThemeDark.addEventListener('click', () => setTheme('dark'));
  }

  // Editor Settings Pills (Monaco / Ace)
  const btnEditorMonaco = document.getElementById('btn-setting-editor-monaco');
  const btnEditorAce = document.getElementById('btn-setting-editor-ace');
  if (btnEditorMonaco && btnEditorAce) {
    btnEditorMonaco.addEventListener('click', () => {
      btnEditorMonaco.classList.add('active');
      btnEditorAce.classList.remove('active');
      showToast('Monaco Editor active');
    });
    btnEditorAce.addEventListener('click', () => {
      btnEditorAce.classList.add('active');
      btnEditorMonaco.classList.remove('active');
      showToast('Monaco is currently the primary engine');
    });
  }

  // Word Wrap Switch Toggle
  const toggleWordWrap = document.getElementById('setting-word-wrap-toggle');
  if (toggleWordWrap) {
    toggleWordWrap.addEventListener('change', (e) => {
      state.wordWrap = e.target.checked ? 'on' : 'off';
      if (state.editor) {
        state.editor.updateOptions({ wordWrap: state.wordWrap });
      }
      showToast(`Word wrap: ${state.wordWrap}`);
    });
  }

  // Reset to defaults button
  const btnResetSettings = document.getElementById('btn-reset-settings');
  if (btnResetSettings) {
    btnResetSettings.addEventListener('click', () => {
      updateFontSize(14);
      setTheme('dark');
      if (toggleWordWrap) toggleWordWrap.checked = true;
      state.wordWrap = 'on';
      if (state.editor) state.editor.updateOptions({ wordWrap: 'on' });
      if (btnEditorMonaco) btnEditorMonaco.classList.add('active');
      if (btnEditorAce) btnEditorAce.classList.remove('active');
      showToast('Settings reset to defaults');
    });
  }
}

/**
 * Update Font Size
 */
function updateFontSize(newSize) {
  if (newSize < 8) newSize = 8;
  if (newSize > 32) newSize = 32;
  state.fontSize = newSize;

  const valEl = document.getElementById('val-font-size');
  if (valEl) valEl.innerText = `${newSize}px`;

  const statusEl = document.getElementById('status-font-size');
  if (statusEl) statusEl.innerText = `${newSize}px`;

  if (state.editor) {
    state.editor.updateOptions({ fontSize: newSize });
  }
}

/**
 * Set Theme (Light or Dark)
 */
function setTheme(themeName) {
  const isLight = themeName === 'light';
  if (isLight) {
    document.body.classList.add('light-theme');
    state.theme = 'vs';
  } else {
    document.body.classList.remove('light-theme');
    state.theme = 'vs-dark';
  }

  const icon = document.querySelector('#btn-theme-toggle i');
  if (icon) icon.className = isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun';

  const statusTheme = document.getElementById('status-theme');
  if (statusTheme) statusTheme.innerText = isLight ? 'Light' : 'Dark';

  const btnLight = document.getElementById('btn-setting-theme-light');
  const btnDark = document.getElementById('btn-setting-theme-dark');
  if (btnLight && btnDark) {
    if (isLight) {
      btnLight.classList.add('active');
      btnDark.classList.remove('active');
    } else {
      btnDark.classList.add('active');
      btnLight.classList.remove('active');
    }
  }

  if (monaco && monaco.editor) {
    monaco.editor.setTheme(state.theme);
  }
}

/**
 * Handle Menu / Activity actions
 */
function handleAction(action) {
  switch (action) {
    case 'toggle-explorer':
      toggleExplorerSidebar();
      break;
    case 'format-code':
      if (state.editor) {
        state.editor.getAction('editor.action.formatDocument').run();
        showToast('Document formatted');
      }
      break;
    case 'find-code':
      if (state.editor) {
        state.editor.focus();
        state.editor.getAction('actions.find').run();
      }
      break;
    case 'clear-console':
      clearConsole();
      break;
    case 'reset-code':
      if (confirm('Reset editor to default template? Current changes will be replaced.')) {
        resetToDefault();
      }
      break;
    case 'download-project':
      downloadProject();
      break;
    case 'show-shortcuts':
      openModal('modal-shortcuts');
      break;
    case 'switch-html':
      switchFileTab('index.html');
      break;
    case 'switch-css':
      switchFileTab('styles.css');
      break;
    case 'switch-js':
      switchFileTab('script.js');
      break;
    case 'open-github':
      window.open('https://github.com/NeelSavsani', '_blank');
      break;
    case 'open-portfolio':
      window.open('https://neelsavsani.vercel.app', '_blank');
      break;
    case 'open-settings':
      openModal('modal-settings');
      break;
  }
}

/**
 * Toggle Dark / Light Theme
 */
function toggleTheme() {
  const isLight = document.body.classList.contains('light-theme');
  setTheme(isLight ? 'dark' : 'light');
}

/**
 * Toggle Fullscreen
 */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

/**
 * Open Preview in a New Window
 */
function openPreviewInNewWindow() {
  const htmlContent = state.files['index.html'] ? (state.models['index.html'] ? state.models['index.html'].getValue() : state.files['index.html'].content) : '';
  const cssContent = state.files['styles.css'] ? (state.models['styles.css'] ? state.models['styles.css'].getValue() : state.files['styles.css'].content) : '';
  const jsContent = state.files['script.js'] ? (state.models['script.js'] ? state.models['script.js'].getValue() : state.files['script.js'].content) : '';

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CodeNest Preview</title>
  <style>${cssContent}</style>
</head>
<body>
  ${htmlContent}
  <script>${jsContent}<\/script>
</body>
</html>`;

  const newWin = window.open();
  if (newWin) {
    newWin.document.open();
    newWin.document.write(fullHtml);
    newWin.document.close();
  } else {
    showToast('Please allow popups to open in a new window');
  }
}

/**
 * Download Project Files as single HTML
 */
function downloadProject() {
  const htmlContent = state.files['index.html'] ? (state.models['index.html'] ? state.models['index.html'].getValue() : state.files['index.html'].content) : '';
  const cssContent = state.files['styles.css'] ? (state.models['styles.css'] ? state.models['styles.css'].getValue() : state.files['styles.css'].content) : '';
  const jsContent = state.files['script.js'] ? (state.models['script.js'] ? state.models['script.js'].getValue() : state.files['script.js'].content) : '';

  const combined = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeNest Export</title>
  <style>
${cssContent}
  </style>
</head>
<body>
${htmlContent}

  <script>
${jsContent}
  <\/script>
</body>
</html>`;

  const blob = new Blob([combined], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'codenest-project.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Project downloaded as HTML');
}

/**
 * Reset all editor files to default template
 */
function resetToDefault() {
  state.files = JSON.parse(JSON.stringify(defaultFiles));
  
  // Dispose all existing models
  Object.keys(state.models).forEach(name => {
    state.models[name].dispose();
  });
  state.models = {};

  // Re-create default models
  Object.keys(state.files).forEach(fileName => {
    const file = state.files[fileName];
    const uri = monaco.Uri.parse(`inmemory://workspace/${fileName}`);
    state.models[fileName] = monaco.editor.createModel(file.content, file.language, uri);
    
    state.models[fileName].onDidChangeContent(() => {
      file.content = state.models[fileName].getValue();
      if (state.autoRun) debouncedRun();
    });
  });

  state.activeFile = 'index.html';
  state.editor.setModel(state.models['index.html']);
  renderTabs();
  renderExplorerFiles();
  runPreview();
  clearConsole();
  showToast('Project reset to default');
}

/**
 * Modal Management
 */
function openModal(id) {
  closeAllModals();
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('show');
    // Focus the input field (e.g. filename input)
    setTimeout(() => {
      const input = modal.querySelector('input, select, textarea');
      if (input) {
        input.focus();
        if (input.select) input.select();
      }
    }, 60);
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
}

/**
 * Toast Notification Helper
 */
function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}

/**
 * Utility HTML Escaper
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
