// Hash URLs: notes.vyut.in/#/python -> folders python/{skill,english,hindi}.json
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

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (k in n) n[k] = v; else n.setAttribute(k, v); }
  kids.flat().forEach(k => k != null && n.append(k));
  return n;
}
function icon(...paths) {
  const s = document.createElementNS(NS, 'svg');
  [['viewBox', '0 0 24 24'], ['width', '18'], ['height', '18'], ['fill', 'none'], ['stroke', 'currentColor'],
   ['stroke-width', '2'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true']]
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

/* ---------- syntax highlighting (no libraries) ---------- */
const WORDS = s => new Set(s.split(' '));
const PYSTR = /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/;
const CSTR = /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/;
const CCOM = /\/\/.*|\/\*[\s\S]*?\*\//;
const CPRE = /\/\/.*|\/\*[\s\S]*?\*\/|^[ \t]*#.*/;
const mk = (com, str, kw, bi) => ({
  re: new RegExp(`(${com.source})|(${str.source})|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_]\\w*)|([\\s\\S])`, 'gm'),
  kw: WORDS(kw), bi: WORDS(bi)
});
const LANGS = {
  python: mk(/#.*/, PYSTR, 'False None True and as assert break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield', 'print input int str float len range list dict set tuple type open sum min max abs sorted bool enumerate zip map'),
  javascript: mk(CCOM, CSTR, 'var let const function return if else for while do switch case break continue new this class extends import export from true false null undefined try catch throw async await typeof', 'console document window Math Array Object JSON String Number'),
  java: mk(CCOM, CSTR, 'public private protected static final class interface extends implements new return if else for while do switch case break continue void int long double float char boolean byte short true false null try catch throw throws import package this super', 'System String Math Scanner ArrayList'),
  c: mk(CPRE, CSTR, 'int float double char long short void unsigned signed struct typedef enum const static return if else for while do switch case break continue sizeof NULL', 'printf scanf main main malloc free strlen'),
  cpp: mk(CPRE, CSTR, 'int float double char long short void bool unsigned struct class public private using namespace new delete const static return if else for while do switch case break continue true false', 'cout cin endl std string vector main')
};
const ALIAS = { py: 'python', js: 'javascript', 'c++': 'cpp' };
const HTMLRE = /(<!--[\s\S]*?-->|<!DOCTYPE[^>]*>)|(<\/?[A-Za-z][\w:-]*|\/?>)|("[^"]*"|'[^']*')|([A-Za-z_:][\w:.-]*)(?=\s*=)|([\s\S])/gi;

function highlight(code, name) {
  const raw = (name || '').toLowerCase();
  const key = ALIAS[raw] || raw;
  const out = document.createDocumentFragment();
  let buf = '';
  const flush = () => { if (buf) { out.append(buf); buf = ''; } };
  const push = (cls, text) => {
    if (!cls) { buf += text; return; }
    flush(); out.append(el('span', { className: 't-' + cls }, text));
  };
  const run = (re, pick) => { re.lastIndex = 0; let m; while ((m = re.exec(code))) pick(m, re.lastIndex); flush(); };
  if (key === 'html') {
    run(HTMLRE, m => push(m[1] ? 'com' : m[2] ? 'tag' : m[3] ? 'str' : m[4] ? 'attr' : '', m[0]));
  } else if (LANGS[key]) {
    const L = LANGS[key];
    run(L.re, (m, end) => {
      const t = m[0];
      if (m[1]) push('com', t);
      else if (m[2]) push('str', t);
      else if (m[3]) push('num', t);
      else if (m[4]) push(L.kw.has(t) ? 'kw' : L.bi.has(t) ? 'bi' : code[end] === '(' ? 'fn' : '', t);
      else push('', t);
    });
  } else { buf = code; flush(); }
  return out;
}

/* ---------- algorithm bottom sheet ---------- */
let lastFocus = null;
function openSheet(steps, trigger) {
  lastFocus = trigger;
  const list = Array.isArray(steps) ? steps : steps ? [steps] : [];
  sheetBody.replaceChildren(list.length
    ? el('ol', {}, list.map(s => el('li', {}, s)))
    : el('p', { className: 'muted' }, 'No algorithm added for this question yet.'));
  sheetBody.scrollTop = 0;
  backdrop.hidden = false;
  sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  closeBtn.focus();
}
function closeSheet() {
  if (!sheet.classList.contains('open')) return;
  sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true');
  backdrop.hidden = true; document.body.style.overflow = '';
  if (lastFocus) lastFocus.focus();
}
closeBtn.addEventListener('click', closeSheet);
backdrop.addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

/* ---------- code box ---------- */
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
}
function codeBox(language, code, question, algorithm) {
  const btn = (label, hide, ...paths) => el('button', { type: 'button', 'aria-label': label },
    icon(...paths), el('span', { className: 'lbl' + (hide ? ' hide-sm' : '') }, label));
  const share = btn('Share', true, 'M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7', 'M16 6l-4-4-4 4', 'M12 2v13');
  const copy = btn('Copy', true, 'M9 9h11v11H9z', 'M5 15V4h11');
  const algo = btn('Algorithm', false, 'M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01');
  share.addEventListener('click', async () => {
    const url = location.href;
    if (navigator.share) {
      try { await navigator.share({ title: question, text: `${question}\n\n${code}`, url }); }
      catch (e) { /* share sheet dismissed */ }
    } else toast(await copyText(`${question}\n\n${code}\n\n${url}`) ? 'Copied to share' : 'Could not share');
  });
  copy.addEventListener('click', async () => toast(await copyText(code) ? 'Code copied' : 'Could not copy'));
  algo.addEventListener('click', () => openSheet(algorithm, algo));
  return el('div', { className: 'code' },
    el('div', { className: 'code-bar' }, el('span', { className: 'code-lang' }, language || 'Code'), el('div', { className: 'acts' }, share, copy, algo)),
    el('pre', {}, el('code', {}, highlight(code, language))));
}

/* ---------- pages ---------- */
const title = s => (s.title && (s.title[lang] || s.title.en || s.title.hi)) || s.id;
function badges(s) {
  const b = el('div', { className: 'badges' });
  if (s.class) b.append(el('span', { className: 'badge' }, `Class ${s.class}`));
  b.append(el('span', { className: 'badge' + (s.programming ? ' code' : '') }, s.programming ? 'Programming' : 'Theory'));
  if (s.programming && s.language) b.append(el('span', { className: 'badge code' }, s.language));
  if (s.programming && EXEC[s.execution]) b.append(el('span', { className: 'badge code' }, EXEC[s.execution][0]));
  return b;
}

// URL Paths को Relative बना दिया गया है
async function loadSkills() {
  const ids = await getJSON('chapters.json');
  return Promise.all(ids.map(async id => {
    try { return { id, ...(await getJSON(`${id}/skill.json`)) }; }
    catch (e) { return { id, title: { en: id } }; }
  }));
}

const link = (href, ...kids) => el('a', { href }, ...kids);

async function home() {
  document.title = 'Computer Notes';
  const skills = await loadSkills();
  const list = el('div', { className: 'list' });
  const draw = q => {
    list.replaceChildren();
    const hits = skills.filter(s => (title(s) + ' ' + (s.tags || []).join(' ')).toLowerCase().includes(q.toLowerCase()));
    if (!hits.length) list.append(el('p', { className: 'muted' }, 'No chapters found.'));
    // Href में Hash(#) जोड़ा गया
    hits.forEach(s => list.append(el('a', { className: 'item', href: `#/${s.id}` }, el('b', {}, title(s)), badges(s))));
  };
  const box = el('input', { type: 'search', placeholder: 'Search chapters', 'aria-label': 'Search chapters' });
  box.addEventListener('input', () => draw(box.value));
  app.lang = 'en';
  app.replaceChildren(el('h1', {}, 'All chapters'), box, list);
  draw('');
}

async function chapter(id) {
  const skills = await loadSkills();
  const i = skills.findIndex(s => s.id === id);
  const s = skills[i];
  if (!s) {
    document.title = 'Not found | Computer Notes';
    // Back to home लिंक में Hash(#)
    app.replaceChildren(el('h1', {}, 'Chapter not found'), link('#/', 'Back to all chapters'));
    return;
  }
  document.title = `${title(s)} | Computer Notes`;
  const out = [el('h1', {}, title(s)), badges(s)];
  if (s.programming && (s.language || EXEC[s.execution])) {
    const ex = EXEC[s.execution];
    out.push(el('div', { className: 'skill' }, el('b', {}, [s.language, ex && ex[0]].filter(Boolean).join(' · ')), ex ? el('p', {}, ex[1]) : null));
  }
  try {
    // Relative Path
    const d = await getJSON(`${id}/${lang === 'hi' ? 'hindi' : 'english'}.json`);
    if (d.summary) out.push(el('p', { className: 'summary' }, d.summary));
    (d.sections || []).forEach(sec => {
      const box = el('section', { className: 'sec' }, el('h2', {}, sec.heading || ''));
      if (sec.text) box.append(el('p', {}, sec.text));
      if (sec.points && sec.points.length) box.append(el('ul', {}, sec.points.map(p => el('li', {}, p))));
      if (sec.tip) box.append(el('p', { className: 'tip' }, sec.tip));
      out.push(box);
    });
    (d.questions || []).forEach((q, n) => {
      const box = el('article', { className: 'qa' }, el('h2', {}, `${n + 1}. ${q.q}`));
      [].concat(q.answer || []).forEach(p => box.append(el('p', {}, p)));
      if (s.programming && q.code) box.append(codeBox(q.language || s.language, q.code, q.q, q.algorithm));
      out.push(box);
    });
  } catch (e) { out.push(el('p', { className: 'muted' }, 'Notes are not available in this language yet.')); }
  
  const prev = skills[i - 1], next = skills[i + 1];
  // Pagination लिंक्स में Hash(#)
  out.push(el('nav', { className: 'nav' },
    prev ? link(`#/${prev.id}`, '\u2190 Previous') : el('span'),
    next ? link(`#/${next.id}`, 'Next \u2192') : el('span')));
  app.lang = lang;
  app.replaceChildren(...out);
}

// Routing Logic को Hash-based में बदला गया
async function route() {
  closeSheet();
  document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang));
  // Hash से ID निकाल रहे हैं (जैसे #/python से python)
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, '').replace(/\/$/, ''));
  try { await (!id || id === 'index.html' ? home() : chapter(id)); }
  catch (e) { app.replaceChildren(el('p', { className: 'muted' }, 'Could not load notes. Check your connection and try again.')); }
}

document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => {
  lang = b.dataset.lang;
  try { localStorage.setItem('lang', lang); } catch (e) {}
  route();
}));

// Browser के डिफ़ॉल्ट Hashchange इवेंट का इस्तेमाल कर रहे हैं
window.addEventListener('hashchange', () => {
  route().then(() => window.scrollTo(0, 0));
});

// App शुरुआत में लोड करने के लिए
route();
