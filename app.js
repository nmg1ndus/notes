const GITHUB_USER = 'nmg1ndus'; 
const GITHUB_REPO = 'notes';

const app = document.getElementById('app');
const sheet = document.getElementById('sheet');
const sheetBody = document.getElementById('sheet-body');
const backdrop = document.getElementById('backdrop');
const closeBtn = document.getElementById('sheet-close');
const toastEl = document.getElementById('toast');
const NS = 'http://www.w3.org/2000/svg';

let lang = 'en';
try { lang = localStorage.getItem('lang') === 'hi' ? 'hi' : 'en'; } catch (e) {}
const cache = {};
const EXEC = {
  compiler: ['Compiler', 'A compiler translates the whole program into machine code first, then runs it.'],
  interpreter: ['Interpreter', 'An interpreter reads and runs the program one line at a time.']
};

let currentAppState = 'NOTES'; 
let currentSkill = null;
let playgroundFiles = { html: '', css: '', js: '' };
let currentFileExt = '';
let pendingInput = null;      // { resolve, reject } of the open input() popup
let inputCancelled = false;   // true when the user closed the popup without submitting


function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (k in n) n[k] = v; else n.setAttribute(k, v); }
  kids.flat().forEach(k => k != null && n.append(k));
  return n;
}

function icon(...paths) {
  const s = document.createElementNS(NS, 'svg');
  [['viewBox', '0 0 24 24'], ['width', '18'], ['height', '18'], ['fill', 'none'], ['stroke', 'currentColor'],
   ['stroke-width', '2.2'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true']]
    .forEach(([k, v]) => s.setAttribute(k, v));
  paths.forEach(d => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.append(p); });
  return s;
}

async function getJSON(path) {
  if (cache[path]) return cache[path];
  const r = await fetch(path);
  if (!r.ok) throw new Error(path);
  return (cache[path] = await r.json());
}

let tt;
function toast(msg) {
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('show'), 1600);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ---------- Text Formatter ---------- */
function formatText(str) {
  if (typeof str !== 'string') return str;
  let html = str
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>')
    .replace(/__([^_]+)__/g, '<u>$1</u>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/(^|[\s(])'([^'\n]+)'(?=[\s.,!?)\]]|$)/g, '$1<code class="inline-code">$2</code>');
    
  if (html.includes('|')) {
    const lines = html.split('\n');
    let result = [], inTable = false, tableHtml = '';
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        if (/^\|[\s-:]+\|/.test(line) && line.replace(/[^|-]/g, '').length >= 3) continue; 
        if (!inTable) { inTable = true; tableHtml = '<div class="table-wrap"><table>'; }
        const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        const cellTag = (tableHtml === '<div class="table-wrap"><table>') ? 'th' : 'td';
        tableHtml += '<tr>' + cells.map(c => `<${cellTag}>${c}</${cellTag}>`).join('') + '</tr>';
      } else {
        if (inTable) { inTable = false; result.push(tableHtml + '</table></div>'); tableHtml = ''; }
        result.push(lines[i]);
      }
    }
    if (inTable) result.push(tableHtml + '</table></div>');
    html = result.join('\n');
  }
  return html;
}

function richText(tag, props, text) {
  const node = el(tag, props);
  node.innerHTML = formatText(text);
  return node;
}

/* ---------- Syntax Highlighting ---------- */
const WORDS = s => new Set(s.split(' '));
const PYSTR = /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/;
const CSTR = /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/;
const CCOM = /\/\/.*|\/\*[\s\S]*?\*\//;
const CPRE = /\/\/.*|\/\*[\s\S]*?\*\/|^[ \t]*#.*/;
const mk = (com, str, kw, bi) => ({ re: new RegExp(`(${com.source})|(${str.source})|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_]\\w*)|([\\s\\S])`, 'gm'), kw: WORDS(kw), bi: WORDS(bi) });
const LANGS = {
  python: mk(/#.*/, PYSTR, 'False None True and as assert break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield', 'print input int str float len range list dict set tuple type open sum min max abs sorted bool enumerate zip map'),
  javascript: mk(CCOM, CSTR, 'var let const function return if else for while do switch case break continue new this class extends import export from true false null undefined try catch throw async await typeof', 'console document window Math Array Object JSON String Number'),
  java: mk(CCOM, CSTR, 'public private protected static final class interface extends implements new return if else for while do switch case break continue void int long double float char boolean byte short true false null try catch throw throws import package this super', 'System String Math Scanner ArrayList'),
  c: mk(CPRE, CSTR, 'int float double char long short void unsigned signed struct typedef enum const static return if else for while do switch case break continue sizeof NULL', 'printf scanf main malloc free strlen'),
  cpp: mk(CPRE, CSTR, 'int float double char long short void bool unsigned struct class public private using namespace new delete const static return if else for while do switch case break continue true false', 'cout cin endl std string vector main')
};
const ALIAS = { py: 'python', js: 'javascript', 'c++': 'cpp', html: 'html' };
const HTMLRE = /(<!--[\s\S]*?-->|<!DOCTYPE[^>]*>)|(<\/?[A-Za-z][\w:-]*|\/?>)|("[^"]*"|'[^']*')|([A-Za-z_:][\w:.-]*)(?=\s*=)|([\s\S])/gi;

function highlight(code, name) {
  const raw = (name || '').toLowerCase();
  const key = ALIAS[raw] || raw;
  const out = document.createDocumentFragment();
  let buf = '';
  const flush = () => { if (buf) { out.append(buf); buf = ''; } };
  const push = (cls, text) => { if (!cls) { buf += text; return; } flush(); out.append(el('span', { className: 't-' + cls }, text)); };
  const run = (re, pick) => { re.lastIndex = 0; let m; while ((m = re.exec(code))) pick(m, re.lastIndex); flush(); };
  
  if (key === 'html') {
    run(HTMLRE, m => push(m[1] ? 'com' : m[2] ? 'tag' : m[3] ? 'str' : m[4] ? 'attr' : '', m[0]));
  } else if (LANGS[key]) {
    const L = LANGS[key];
    run(L.re, (m, end) => {
      const t = m[0];
      if (m[1]) push('com', t); else if (m[2]) push('str', t); else if (m[3]) push('num', t);
      else if (m[4]) push(L.kw.has(t) ? 'kw' : L.bi.has(t) ? 'bi' : code[end] === '(' ? 'fn' : '', t); else push('', t);
    });
  } else { buf = code; flush(); }
  return out;
}

/* ---------- App States ---------- */
function switchAppState(newState) {
  currentAppState = newState;
  updateHeader(false, currentSkill);
  
  const notesView = document.getElementById('notes-view');
  const editorView = document.getElementById('editor-view');
  const outputView = document.getElementById('output-view');
  if (!notesView) return; 
  const playgroundView = document.getElementById('playground-view');
  if (playgroundView) playgroundView.style.display = newState === 'NOTES' ? 'none' : 'flex';

  if (newState === 'NOTES') {
      notesView.style.display = 'block';
      if(editorView) editorView.style.display = 'none';
      if(outputView) outputView.style.display = 'none';
  } else if (newState === 'EDITOR') {
      notesView.style.display = 'none';
      editorView.style.display = 'flex';
      outputView.style.display = 'none';
      syncEditorLogic();
  } else if (newState === 'OUTPUT') {
      notesView.style.display = 'none';
      editorView.style.display = 'none';
      outputView.style.display = 'flex';
  }
}

/* ---------- Editor Utilities (Line Number & Highlight Sync) ---------- */
function syncEditorLogic() {
  const editor = document.getElementById('code-editor');
  if (!editor) return;
  const code = editor.value;
  
  // Line numbers
  const lineNumbers = document.getElementById('line-numbers');
  if (lineNumbers) {
    const linesCount = code.split('\n').length;
    lineNumbers.innerHTML = Array.from({length: linesCount}, (_, i) => i + 1).join('<br>');
  }

  // Syntax highlight (extra newline keeps the last empty line scroll-aligned with the textarea)
  const highlighter = document.getElementById('code-highlighter');
  const langStr = currentFileExt || (currentSkill.language || '').toLowerCase();
  highlighter.replaceChildren(highlight(code, langStr), document.createTextNode('\n'));
  syncEditorScroll();
}

function syncEditorScroll() {
  const editor = document.getElementById('code-editor');
  const highlighter = document.getElementById('code-highlighter');
  const lineNumbers = document.getElementById('line-numbers');
  
  if(highlighter) {
    highlighter.scrollTop = editor.scrollTop;
    highlighter.scrollLeft = editor.scrollLeft;
  }
  if(lineNumbers) lineNumbers.scrollTop = editor.scrollTop;
}

/* ---------- Code Execution ---------- */
async function runCodeAction() {
  const editorArea = document.getElementById('code-editor');
  const langStr = (currentSkill.language || 'python').toLowerCase();
  
  if (langStr === 'html') playgroundFiles[currentFileExt] = editorArea.value;
  
  const code = editorArea.value;
  if (!code.trim() && langStr !== 'html') return toast('Please enter some code');
  
  switchAppState('OUTPUT');
  const consoleEl = document.getElementById('output-console');
  consoleEl.textContent = 'Running code...\n\n';
  
  try {
      if (langStr === 'html') {
          consoleEl.innerHTML = '';
          const frame = el('iframe', { style: 'width:100%; height:100%; border:none; background:#fff; border-radius:8px;' });
          consoleEl.append(frame);
          
          const combined = `
          <!DOCTYPE html>
          <html><head><style>${playgroundFiles.css || ''}</style></head>
          <body>${playgroundFiles.html || ''}<script>${playgroundFiles.js || ''}<\/script></body>
          </html>`;
          
          frame.contentWindow.document.open();
          frame.contentWindow.document.write(combined);
          frame.contentWindow.document.close();
          return;
      }
      
      if (langStr === 'javascript' || langStr === 'js') {
          consoleEl.textContent = '';
          const originalLog = console.log;
          console.log = (...args) => { consoleEl.textContent += args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n'; };
          try { new Function(code)(); if(consoleEl.textContent === '') consoleEl.textContent = '[Program finished]'; } 
          catch(e) { showError(e.toString()); } finally { console.log = originalLog; }
          return;
      }
      
      if (langStr === 'python') {
          consoleEl.textContent = '';
          if (typeof Sk === 'undefined') {
              await loadScript('https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js');
              await loadScript('https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js');
          }
          
          Sk.configure({
              output: function(text) { consoleEl.textContent += text; },
              read: function(x) {
                  if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) throw "File not found: '" + x + "'";
                  return Sk.builtinFiles["files"][x];
              },
              inputfunTakesPrompt: true,   // prompt text of input("...") is passed to inputfun
              __future__: Sk.python3,
              inputfun: function(promptText) {
                  consoleEl.textContent += promptText;
                  return new Promise((resolve, reject) => {
                      openInputSheet(promptText, resolve, reject);
                  }).then((val) => {
                      consoleEl.textContent += val + "\n";
                      return val;
                  });
              }
          });
          inputCancelled = false;
          
          try {
              await Sk.misceval.asyncToPromise(function() { return Sk.importMainWithBody("<stdin>", false, code, true); });
              if(consoleEl.textContent === '') consoleEl.textContent = '[Program finished]';
          } catch(e) {
              if (inputCancelled) consoleEl.textContent += '\n[Input cancelled]\n';
              else showError("Python Error:\n" + e.toString());
          }
          return;
      }
      
      const PISTON_LANGS = { c: '10.2.0', 'c++': '10.2.0', cpp: '10.2.0', java: '15.0.2' };
      const pistonLang = langStr === 'c++' ? 'cpp' : langStr;
      const pistonVer = PISTON_LANGS[pistonLang] || '*';
      
      const res = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: pistonLang, version: pistonVer, files: [{ content: code }] })
      });
      
      const data = await res.json();
      if (data.run) {
          const out = data.run.stdout + (data.run.stderr ? '\n' + data.run.stderr : '');
          consoleEl.textContent = out || '[Program finished]';
          if (data.run.code !== 0 && data.run.stderr) showError("Runtime Error:\n" + data.run.stderr);
      } else { showError(data.message || 'Execution failed due to API restriction.'); consoleEl.textContent = 'Execution Failed.'; }
  } catch (err) {
      showError('Could not connect to compiler API.');
      consoleEl.textContent = 'Connection Error.';
  }
}

/* ---------- Header Logic ---------- */
function updateHeader(isIndex, s = null) {
  const headerTop = document.querySelector('.top');
  
  let left = document.getElementById('header-left');
  if (!left) { left = el('div', { id: 'header-left' }); headerTop.prepend(left); }
  let right = document.getElementById('header-right');
  if (!right) { right = el('div', { id: 'header-right' }); headerTop.append(right); }
  
  const oldLang = headerTop.querySelector('.lang');
  if (oldLang) oldLang.remove();
  const oldBrand = headerTop.querySelector('.brand:not(#header-left .brand)');
  if (oldBrand) oldBrand.remove();

  if (isIndex) {
    left.replaceChildren(el('a', { href: '#/', className: 'brand' }, 'Vyut Notes'));
  } else {
    const backBtn = el('a', { href: '#/', className: 'back-btn', 'aria-label': 'Go back' }, icon('M15 18l-6-6 6-6'));
    if (s && s.programming) {
      const exName = (s.execution && EXEC[s.execution]) ? EXEC[s.execution][0] : 'Compiler';
      const btnNotes = el('button', { className: currentAppState === 'NOTES' ? 'active' : '' }, 'Notes');
      const btnCode = el('button', { className: currentAppState !== 'NOTES' ? 'active' : '' }, exName);
      btnNotes.onclick = () => switchAppState('NOTES');
      btnCode.onclick = () => switchAppState('EDITOR');
      left.replaceChildren(backBtn, el('div', { className: 'header-slider' }, btnNotes, btnCode));
    } else { left.replaceChildren(backBtn, el('span', { className: 'brand' }, 'Vyut Notes')); }
  }

  if (isIndex || currentAppState === 'NOTES') {
    const globeIcon = icon('M22 12A10 10 0 112 12a10 10 0 0120 0z', 'M2 12h20', 'M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z');
    const langBtn = el('button', { className: 'action-btn', onclick: openLangSheet, 'aria-label': 'Language' }, globeIcon, el('span', {}, 'A/अ'));
    right.replaceChildren(langBtn);
  } else if (currentAppState === 'EDITOR') {
    const playIcon = icon('M5 3l14 9-14 9V3z');
    const runBtn = el('button', { className: 'action-btn play-btn', onclick: runCodeAction }, playIcon, el('span', {}, 'Run'));
    right.replaceChildren(runBtn);
  } else if (currentAppState === 'OUTPUT') {
    const codeIcon = icon('M16 18l6-6-6-6', 'M8 6l-6 6 6 6');
    const codeBtn = el('button', { className: 'action-btn code-btn', onclick: () => switchAppState('EDITOR') }, codeIcon, el('span', {}, 'Code'));
    right.replaceChildren(codeBtn);
  }
}

/* ---------- Code Box ---------- */
async function copyText(text) { try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; } }

function codeBox(language, code, question, algorithm) {
  const btn = (label, hide, ...paths) => el('button', { type: 'button', 'aria-label': label }, icon(...paths), el('span', { className: 'lbl' + (hide ? ' hide-sm' : '') }, label));
  const share = btn('Share', true, 'M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7', 'M16 6l-4-4-4 4', 'M12 2v13');
  const copy = btn('Copy', true, 'M9 9h11v11H9z', 'M5 15V4h11');
  const algo = btn('Algorithm', false, 'M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01');
  
  share.addEventListener('click', async () => {
    const url = location.href;
    if (navigator.share) { try { await navigator.share({ title: question, text: `${question}\n\n${code}`, url }); } catch (e) {} }
    else toast(await copyText(`${question}\n\n${code}\n\n${url}`) ? 'Copied to share' : 'Could not share');
  });
  copy.addEventListener('click', async () => toast(await copyText(code) ? 'Code copied' : 'Could not copy'));
  algo.addEventListener('click', () => openSheet(algorithm, algo));
  
  const lineCount = code.replace(/\n$/, '').split('\n').length;
  const gutter = el('div', { className: 'code-gutter', 'aria-hidden': 'true' }, Array.from({ length: lineCount }, (_, i) => i + 1).join('\n'));
  return el('div', { className: 'code' },
    el('div', { className: 'code-bar' }, el('span', { className: 'code-lang' }, (language || 'Code').toLowerCase()), el('div', { className: 'acts' }, share, copy, algo)),
    el('div', { className: 'code-body' }, gutter, el('pre', {}, el('code', {}, highlight(code, language)))));
}

/* ---------- Bottom Sheets (Error, Lang, Algo, Input) ---------- */
let lastFocus = null;

function setLang(newLang) {
  lang = newLang;
  try { localStorage.setItem('lang', lang); } catch (e) {}
  closeSheet();
  route();
}

function openLangSheet() {
  lastFocus = document.querySelector('.action-btn');
  sheet.classList.add('short');
  document.getElementById('sheet-title').innerHTML = 'Select Language';
  sheetBody.replaceChildren(
    el('div', { className: 'lang-opts' },
      el('button', { className: 'lang-opt' + (lang === 'en' ? ' active' : ''), onclick: () => setLang('en') }, 'English'),
      el('button', { className: 'lang-opt' + (lang === 'hi' ? ' active' : ''), onclick: () => setLang('hi') }, 'Hindi')
    )
  );
  backdrop.hidden = false;
  sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function openSheet(steps, trigger) {
  lastFocus = trigger;
  sheet.classList.remove('short'); 
  document.getElementById('sheet-title').innerHTML = 'Algorithm';
  const list = Array.isArray(steps) ? steps : steps ? [steps] : [];
  sheetBody.replaceChildren(list.length ? el('ol', {}, list.map(s => richText('li', {}, s))) : el('p', { className: 'muted' }, 'No algorithm added for this question yet.'));
  sheetBody.scrollTop = 0;
  backdrop.hidden = false;
  sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (trigger) trigger.focus();
}

function showError(msg) {
  sheet.classList.add('short');
  document.getElementById('sheet-title').innerHTML = `<svg width="20" height="20" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> <span style="color: #ef4444;">Error</span>`;
  sheetBody.replaceChildren(el('div', { className: 'err-msg-sheet' }, msg));
  backdrop.hidden = false;
  sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

// Custom Input Prompt (contenteditable instead of <input>: Chrome/Gboard show no password/card/map autofill bar)
function openInputSheet(promptMsg, resolveFunc, rejectFunc) {
  pendingInput = { resolve: resolveFunc, reject: rejectFunc };
  lastFocus = null;
  sheet.classList.add('short');
  document.getElementById('sheet-title').innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M4 17l6-6-6-6M12 19h8"></path></svg> <span>Input Required</span>`;

  const inputBox = el('div', { className: 'input-prompt-box' });
  const probe = document.createElement('div');
  try { probe.contentEditable = 'plaintext-only'; } catch (e) {}
  inputBox.contentEditable = probe.contentEditable === 'plaintext-only' ? 'plaintext-only' : 'true';
  [['role', 'textbox'], ['aria-label', promptMsg || 'Input'], ['data-placeholder', 'Type here...'],
   ['enterkeyhint', 'done'], ['inputmode', 'text'], ['autocapitalize', 'off'], ['autocorrect', 'off'],
   ['autocomplete', 'off'], ['spellcheck', 'false'], ['data-lpignore', 'true'], ['data-1p-ignore', 'true'],
   ['data-form-type', 'other']].forEach(([k, v]) => inputBox.setAttribute(k, v));

  const submitBtn = el('button', { className: 'input-prompt-btn', type: 'button' }, 'Submit');
  const submit = () => {
    const p = pendingInput;
    if (!p) return;
    const val = (inputBox.textContent || '').replace(/[\r\n]+/g, ' ');
    pendingInput = null;      // clear first, so closeSheet() does not treat this as a cancel
    p.resolve(val);
    closeSheet();
  };
  submitBtn.onclick = submit;

  inputBox.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  inputBox.addEventListener('beforeinput', e => {   // Android keyboards often send Enter this way
    if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') { e.preventDefault(); submit(); }
  });
  inputBox.addEventListener('input', () => { if (!inputBox.textContent) inputBox.innerHTML = ''; });

  // Prompt text of input("...") shown above the box
  const promptLabel = el('div', { className: 'input-prompt-label' }, promptMsg || '');

  sheetBody.replaceChildren(promptLabel, inputBox, submitBtn);

  backdrop.hidden = false;
  sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  setTimeout(() => inputBox.focus(), 300);
}

function closeSheet() {
  if (!sheet.classList.contains('open')) return;
  sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true');
  backdrop.hidden = true; document.body.style.overflow = '';
  if (lastFocus) lastFocus.focus();

  if (pendingInput) {       // popup closed without Submit -> stop the program (no fake empty input)
    const p = pendingInput;
    pendingInput = null;
    inputCancelled = true;
    p.reject(new Error('INPUT_CANCELLED'));
  }
}
closeBtn.addEventListener('click', closeSheet);
backdrop.addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });


/* ---------- Main API Logic ---------- */
const title = s => (s.title && (s.title[lang] || s.title.en || s.title.hi)) || s.id;
function badges(s) {
  const b = el('div', { className: 'badges' });
  if (s.class) b.append(el('span', { className: 'badge' }, `Class ${s.class}`));
  return b;
}

async function loadSkills() {
  try {
    const repoUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/`;
    const res = await fetch(repoUrl);
    if (!res.ok) throw new Error('API limit reached');
    const data = await res.json();
    const folders = data.filter(item => item.type === 'dir' && !item.name.startsWith('.')).map(item => item.name);
    return await Promise.all(folders.map(async id => {
      try { return { id, ...(await getJSON(`${id}/skill.json`)) }; } catch (e) { return { id, title: { en: id } }; }
    }));
  } catch (error) {
    const ids = await getJSON('chapters.json').catch(() => []);
    if (!ids.length) showError("Couldn't load chapters. Please check your internet connection.");
    return Promise.all(ids.map(async id => {
      try { return { id, ...(await getJSON(`${id}/skill.json`)) }; } catch (e) { return { id, title: { en: id } }; }
    }));
  }
}

const link = (href, ...kids) => el('a', { href }, ...kids);

async function home() {
  document.title = 'Computer Notes';
  currentAppState = 'NOTES';
  updateHeader(true);
  const skills = await loadSkills();
  const list = el('div', { className: 'list' });
  
  if (!skills.length) { list.append(el('p', { className: 'muted' }, 'No chapters found.')); } 
  else {
    skills.forEach(s => {
      const descText = s.description ? (s.description[lang] || s.description.en || s.description.hi) : (s.summary || '');
      const descEl = descText ? el('p', { className: 'desc' }, descText) : null;
      const topRow = el('div', { className: 'item-header' }, el('b', {}, title(s)), badges(s));
      list.append(el('a', { className: 'item', href: `#/${s.id}` }, topRow, descEl));
    });
  }
  app.lang = 'en';
  app.replaceChildren(list); 
}

async function chapter(id) {
  const skills = await loadSkills();
  const i = skills.findIndex(s => s.id === id);
  const s = skills[i];
  
  if (!s) {
    document.title = 'Not found | Computer Notes';
    currentAppState = 'NOTES';
    updateHeader(false);
    app.replaceChildren(el('h1', {}, 'Chapter not found'), link('#/', 'Back to all chapters'));
    return;
  }
  
  document.title = `${title(s)} | Computer Notes`;
  currentSkill = s;
  currentAppState = 'NOTES';
  
  const headerContainer = el('div', { className: 'chapter-header' }, el('h1', {}, title(s)), badges(s));
  const out = [headerContainer];
  
  try {
    const d = await getJSON(`${id}/${lang === 'hi' ? 'hindi' : 'english'}.json`);
    if (d.summary) { out.push(richText('p', { className: 'summary' }, d.summary)); out.push(el('hr', { className: 'thin-line' })); }
    
    (d.sections || []).forEach(sec => {
      const box = el('section', { className: 'sec' });
      if (sec.heading) box.append(richText('h2', {}, sec.heading));
      if (sec.text) box.append(richText('p', {}, sec.text));
      if (sec.points && sec.points.length) box.append(el('ul', {}, sec.points.map(p => richText('li', {}, p))));
      if (sec.tip) box.append(richText('p', { className: 'tip' }, sec.tip));
      out.push(box);
    });
    
    (d.questions || []).forEach((q, n) => {
      const box = el('article', { className: 'qa' });
      if (n > 0) box.append(el('hr', { className: 'thin-line' })); 
      box.append(richText('h2', {}, `${n + 1}. ${q.q}`));
      [].concat(q.answer || []).forEach(p => box.append(richText('p', {}, p)));
      if (s.programming && q.code) box.append(codeBox(q.language || s.language, q.code, q.q, q.algorithm));
      out.push(box);
    });
  } catch (e) { out.push(el('p', { className: 'muted' }, 'Notes are not available in this language yet.')); }
  
  const next = skills[i + 1];
  if (next) { out.push(el('nav', { className: 'nav' }, link(`#/${next.id}`, 'Next \u2192'))); }
  
  const notesView = el('div', { id: 'notes-view' }, ...out);

  // --- PLAYGROUND SETUP (Editor & Output) ---
  const isHTML = (s.language || '').toLowerCase() === 'html';
  
  playgroundFiles = {
      html: '<h1>Hello, World!</h1>\n<div class="box">Let\'s code in HTML, CSS & JS!</div>\n<button onclick="greet()">Click Me</button>',
      css: 'body {\n  font-family: sans-serif;\n  padding: 20px;\n}\n.box {\n  color: white;\n  background: #2563eb;\n  padding: 15px;\n  border-radius: 8px;\n  margin-bottom: 15px;\n}',
      js: 'function greet() {\n  alert("Awesome! JavaScript is working.");\n}'
  };
  currentFileExt = 'html';

  const defaultCodes = {
      'python': 'a = int(input("Enter first number: "))\nb = int(input("Enter second number: "))\ntotal = a + b\nprint("Sum =", total)',
      'javascript': 'console.log("Hello, World!");',
      'c': '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
      'c++': '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}'
  };
  
  const editorArea = el('textarea', { id: 'code-editor', spellcheck: false, autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', wrap: 'off' });
  editorArea.value = isHTML ? playgroundFiles.html : (defaultCodes[(s.language || '').toLowerCase()] || '// Write your code here');
  
  const highlighter = el('pre', { id: 'code-highlighter' });
  const lineNumbers = el('div', { id: 'line-numbers', className: 'line-numbers' });

  editorArea.addEventListener('input', e => {
      if(isHTML) playgroundFiles[currentFileExt] = e.target.value;
      syncEditorLogic();
  });
  
  editorArea.addEventListener('scroll', syncEditorScroll);
  
  editorArea.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
          e.preventDefault();
          const start = editorArea.selectionStart;
          const end = editorArea.selectionEnd;
          editorArea.value = editorArea.value.substring(0, start) + "    " + editorArea.value.substring(end);
          editorArea.selectionStart = editorArea.selectionEnd = start + 4;
          syncEditorLogic();
      }
  });

  let fileTabsBar = null;
  if (isHTML) {
      const mkTab = (ext, label) => {
          const btn = el('button', { className: 'file-tab' + (ext === 'html' ? ' active' : '') }, label);
          btn.onclick = () => {
              document.querySelectorAll('.file-tab').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              currentFileExt = ext;
              editorArea.value = playgroundFiles[ext];
              syncEditorLogic();
          };
          return btn;
      };
      fileTabsBar = el('div', { className: 'file-tabs' }, mkTab('html', 'index.html'), mkTab('css', 'style.css'), mkTab('js', 'script.js'));
  }

  const codeAreaWrapper = el('div', { className: 'code-area-wrapper' }, highlighter, editorArea);
  const editorContainer = el('div', { className: 'editor-container' + (isHTML ? ' with-tabs' : '') }, lineNumbers, codeAreaWrapper);

  const editorWrap = el('div', { style: 'display:flex; flex-direction:column; height:100%;' });
  if (fileTabsBar) editorWrap.append(fileTabsBar);
  editorWrap.append(editorContainer);

  const editorView = el('div', { id: 'editor-view', style: 'display:none;' }, editorWrap);
  const outputView = el('div', { id: 'output-view', style: 'display:none;' }, el('pre', { id: 'output-console' }));
  
  const playgroundView = el('div', { id: 'playground-view', style: 'display:none;' }, editorView, outputView);
  
  app.lang = lang;
  app.replaceChildren(notesView, playgroundView);
  
  setTimeout(syncEditorLogic, 10); // Start Line Sync
  updateHeader(false, currentSkill);
}

async function route() {
  closeSheet();
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, '').replace(/\/$/, ''));
  try { await (!id || id === 'index.html' ? home() : chapter(id)); }
  catch (e) { app.replaceChildren(el('p', { className: 'muted' }, 'Could not load notes. Check your connection and try again.')); }
}

window.addEventListener('hashchange', () => { route().then(() => window.scrollTo(0, 0)); });
route();
