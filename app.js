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
  isExplorerOpen: true,
  editor: null,
  models: {},
  viewStates: {},
  theme: 'vs-dark', // 'vs-dark' or 'vs'
  autoRun: true,
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  isConsoleOpen: false,
  consoleEntries: [],
  debounceTimer: null
};

// Monaco Configuration
require.config({
  paths: { vs: 'https://unpkg.com/monaco-editor@latest/min/vs' }
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
    
    // Listen to changes for auto-run
    state.models[fileName].onDidChangeContent(() => {
      file.content = state.models[fileName].getValue();
      if (state.autoRun) {
        debouncedRun();
      }
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

  if (typeof force === 'boolean') {
    state.isExplorerOpen = force;
  } else {
    state.isExplorerOpen = !state.isExplorerOpen;
  }

  if (state.isExplorerOpen) {
    sidebar.classList.remove('collapsed');
    if (activityBtn) activityBtn.classList.add('active');
  } else {
    sidebar.classList.add('collapsed');
    if (activityBtn) activityBtn.classList.remove('active');
  }

  // Trigger Monaco relayout on animation intervals
  [50, 150, 220].forEach(delay => {
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

  // Switch Monaco Model
  if (state.editor && state.models[fileName]) {
    state.editor.setModel(state.models[fileName]);
    if (state.viewStates[fileName]) {
      state.editor.restoreViewState(state.viewStates[fileName]);
    }
    state.editor.focus();
  }

  renderTabs();
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
    if (state.autoRun) debouncedRun();
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
  }, 350);
}

/**
 * Execute and Render Live Preview
 */
function runPreview() {
  const statusDot = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  
  statusDot.className = 'status-dot busy';
  statusText.innerText = 'Running...';

  const htmlContent = state.files['index.html'] ? (state.models['index.html'] ? state.models['index.html'].getValue() : state.files['index.html'].content) : '';
  const cssContent = state.files['styles.css'] ? (state.models['styles.css'] ? state.models['styles.css'].getValue() : state.files['styles.css'].content) : '';
  const jsContent = state.files['script.js'] ? (state.models['script.js'] ? state.models['script.js'].getValue() : state.files['script.js'].content) : '';

  // Console Proxy Script to capture inside iframe
  const consoleScript = `
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
      })();
    <\/script>
  `;

  // Build combined document
  let docContent = '';
  
  if (htmlContent.includes('<head>')) {
    docContent = htmlContent
      .replace('<head>', `<head>${consoleScript}<style>${cssContent}</style>`)
      .replace('</head>', `</head>`);
  } else {
    docContent = `<!DOCTYPE html><html><head>${consoleScript}<style>${cssContent}</style></head><body>${htmlContent}</body></html>`;
  }

  // Inject user JS before closing body tag
  const scriptTag = `<script>\ntry {\n${jsContent}\n} catch(err) {\nconsole.error(err.message || err);\n}\n<\/script>`;
  if (docContent.includes('</body>')) {
    docContent = docContent.replace('</body>', `${scriptTag}</body>`);
  } else {
    docContent += scriptTag;
  }

  const iframe = document.getElementById('output-frame');
  iframe.srcdoc = docContent;

  setTimeout(() => {
    statusDot.className = 'status-dot';
    statusText.innerText = 'Ready';
  }, 200);
}

/**
 * Handle Console Logs from Iframe
 */
function initConsoleListener() {
  window.addEventListener('message', (e) => {
    if (!e.data || e.data.source !== 'codenest-preview') return;

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

  // More Options Menu Toggle (3 vertical dots)
  const btnMore = document.getElementById('btn-more-options');
  const moreMenu = document.getElementById('dropdown-more-options');
  btnMore.addEventListener('click', (e) => {
    e.stopPropagation();
    moreMenu.classList.toggle('show');
  });

  // Language badge dropdown
  const langBadge = document.getElementById('lang-badge');
  const langMenu = document.getElementById('dropdown-lang');
  langBadge.addEventListener('click', (e) => {
    e.stopPropagation();
    langMenu.classList.toggle('show');
  });

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    moreMenu.classList.remove('show');
    langMenu.classList.remove('show');
  });

  // Dropdown actions
  document.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', (e) => {
      const action = el.dataset.action;
      handleAction(action);
    });
  });

  // Activity Bar item actions
  document.querySelectorAll('.activity-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
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

  // Save Settings Form
  document.getElementById('form-settings').addEventListener('submit', (e) => {
    e.preventDefault();
    const fontSize = parseInt(document.getElementById('setting-font-size').value, 10);
    const tabSize = parseInt(document.getElementById('setting-tab-size').value, 10);
    const wordWrap = document.getElementById('setting-word-wrap').value;
    const autoRun = document.getElementById('setting-auto-run').checked;

    state.fontSize = fontSize;
    state.tabSize = tabSize;
    state.wordWrap = wordWrap;
    state.autoRun = autoRun;

    if (state.editor) {
      state.editor.updateOptions({
        fontSize,
        tabSize,
        wordWrap
      });
    }

    document.getElementById('status-font-size').innerText = `${fontSize}px`;
    closeAllModals();
    showToast('Settings saved');
  });
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
  const isLight = document.body.classList.toggle('light-theme');
  state.theme = isLight ? 'vs' : 'vs-dark';
  
  const icon = document.querySelector('#btn-theme-toggle i');
  if (isLight) {
    icon.className = 'fa-solid fa-moon';
    document.getElementById('status-theme').innerText = 'Light';
  } else {
    icon.className = 'fa-solid fa-sun';
    document.getElementById('status-theme').innerText = 'Dark';
  }

  if (monaco && monaco.editor) {
    monaco.editor.setTheme(state.theme);
  }
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
  if (modal) modal.classList.add('show');
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
