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

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (k in n) n[k] = v; else n.setAttribute(k, v); }
  kids.flat().forEach(k => k != null && n.append(k));
  return n;
}

function icon(...paths) {
  const s = document.createElementNS(NS, 'svg');
  [['viewBox', '0 0 24 24'], ['width', '20'], ['height', '20'], ['fill', 'none'], ['stroke', 'currentColor'],
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

/* ---------- Text Formatter (Markdown) ---------- */
function formatText(str) {
  if (typeof str !== 'string') return str;
  // Bold, Italic, and Inline Code (both `backticks` and 'single quotes')
  let html = str
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/(^|[\s(])'([^'\n]+)'(?=[\s.,!?)\]]|$)/g, '$1<code class="inline-code">$2</code>');
    
  // Table Parsing: Line by Line
  if (html.includes('|')) {
    const lines = html.split('\n');
    let result = [], inTable = false, tableHtml = '';
    for (let line of lines) {
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        if (!inTable) { inTable = true; tableHtml = '<div class="table-wrap"><table>'; }
        const cells = line.split('|').map(c => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1);
        tableHtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
      } else {
        if (inTable) { inTable = false; result.push(tableHtml + '</table></div>'); tableHtml = ''; }
        result.push(line);
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
const mk = (com, str, kw, bi) => ({
  re: new RegExp(`(${com.source})|(${str.source})|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_]\\w*)|([\\s\\S])`, 'gm'),
  kw: WORDS(kw), bi: WORDS(bi)
});
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

/* ---------- Bottom Sheets (Algo & Lang) ---------- */
let lastFocus = null;

function setLang(newLang) {
  lang = newLang;
  try { localStorage.setItem('lang', lang); } catch (e) {}
  closeSheet();
  route();
}

function openLangSheet() {
  lastFocus = document.querySelector('.lang-btn');
  sheet.classList.add('short');
  document.getElementById('sheet-title').textContent = 'Select Language';
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
  sheet.classList.remove('short'); // एल्गोरिथ्म के लिए फुल हाइट
  document.getElementById('sheet-title').textContent = 'Algorithm';
  const list = Array.isArray(steps) ? steps : steps ? [steps] : [];
  sheetBody.replaceChildren(list.length
    ? el('ol', {}, list.map(s => richText('li', {}, s)))
    : el('p', { className: 'muted' }, 'No algorithm added for this question yet.'));
  sheetBody.scrollTop = 0;
  backdrop.hidden = false;
  sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (trigger) trigger.focus();
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

/* ---------- Code Box ---------- */
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
      catch (e) {}
    } else toast(await copyText(`${question}\n\n${code}\n\n${url}`) ? 'Copied to share' : 'Could not share');
  });
  copy.addEventListener('click', async () => toast(await copyText(code) ? 'Code copied' : 'Could not copy'));
  algo.addEventListener('click', () => openSheet(algorithm, algo));
  
  return el('div', { className: 'code' },
    // यहाँ कोड लैंग्वेज का नाम स्मॉल लेटर (toLowerCase) में सेट किया गया है
    el('div', { className: 'code-bar' }, el('span', { className: 'code-lang' }, (language || 'Code').toLowerCase()), el('div', { className: 'acts' }, share, copy, algo)),
    el('pre', {}, el('code', {}, highlight(code, language))));
}

/* ---------- Header Logic ---------- */
function updateHeader(isIndex, s = null) {
  const headerTop = document.querySelector('.top');
  
  let left = document.getElementById('header-left');
  if (!left) { left = el('div', { id: 'header-left' }); headerTop.prepend(left); }
  
  let right = document.getElementById('header-right');
  if (!right) { right = el('div', { id: 'header-right' }); headerTop.append(right); }
  
  // पुरानी फालतू चीज़ें साफ़ करें (अगर index.html में रह गई हों)
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
      const btnNotes = el('button', { className: 'active' }, 'Notes');
      const btnCode = el('button', {}, exName);
      btnNotes.onclick = () => { btnNotes.classList.add('active'); btnCode.classList.remove('active'); };
      btnCode.onclick = () => { btnCode.classList.add('active'); btnNotes.classList.remove('active'); };
      left.replaceChildren(backBtn, el('div', { className: 'header-slider' }, btnNotes, btnCode));
    } else {
      left.replaceChildren(backBtn, el('span', { className: 'brand' }, 'Vyut Notes'));
    }
  }

  // लैंग्वेज बटन
  const globeIcon = icon('M22 12A10 10 0 112 12a10 10 0 0120 0z', 'M2 12h20', 'M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z');
  const langBtn = el('button', { className: 'lang-btn', onclick: openLangSheet, 'aria-label': 'Change Language' }, globeIcon, el('span', {}, 'A/अ'));
  right.replaceChildren(langBtn);
}

/* ---------- Pages ---------- */
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
    
    const folders = data
      .filter(item => item.type === 'dir' && !item.name.startsWith('.'))
      .map(item => item.name);

    return await Promise.all(folders.map(async id => {
      try { 
        const skillData = await getJSON(`${id}/skill.json`);
        return { id, ...skillData }; 
      } catch (e) { return { id, title: { en: id } }; }
    }));
  } catch (error) {
    const ids = await getJSON('chapters.json').catch(() => []);
    return Promise.all(ids.map(async id => {
      try { return { id, ...(await getJSON(`${id}/skill.json`)) }; }
      catch (e) { return { id, title: { en: id } }; }
    }));
  }
}

const link = (href, ...kids) => el('a', { href }, ...kids);

async function home() {
  document.title = 'Computer Notes';
  updateHeader(true);
  const skills = await loadSkills();
  const list = el('div', { className: 'list' });
  
  const draw = q => {
    list.replaceChildren();
    const hits = skills.filter(s => (title(s) + ' ' + (s.tags || []).join(' ')).toLowerCase().includes(q.toLowerCase()));
    
    if (!hits.length) list.append(el('p', { className: 'muted' }, 'No chapters found.'));
    
    hits.forEach(s => {
      const descText = s.description ? (s.description[lang] || s.description.en || s.description.hi) : (s.summary || '');
      const descEl = descText ? el('p', { className: 'desc' }, descText) : null;
      
      list.append(el('a', { className: 'item', href: `#/${s.id}` }, 
        el('b', {}, title(s)), 
        descEl,
        badges(s)
      ));
    });
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
    updateHeader(false);
    app.replaceChildren(el('h1', {}, 'Chapter not found'), link('#/', 'Back to all chapters'));
    return;
  }
  
  document.title = `${title(s)} | Computer Notes`;
  updateHeader(false, s);
  
  // टाइटल और क्लास बैज को एक ही लाइन में रखने के लिए
  const headerContainer = el('div', { className: 'chapter-header' }, 
    el('h1', {}, title(s)), 
    badges(s)
  );
  const out = [headerContainer];
  
  try {
    const d = await getJSON(`${id}/${lang === 'hi' ? 'hindi' : 'english'}.json`);
    
    if (d.summary) {
      out.push(richText('p', { className: 'summary' }, d.summary));
      out.push(el('hr', { className: 'thin-line' })); // समरी के नीचे लाइन
    }
    
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
      if (n > 0) box.append(el('hr', { className: 'thin-line' })); // हर क्वेश्चन से पहले लाइन (पहले वाले को छोड़कर)
      box.append(richText('h2', {}, `${n + 1}. ${q.q}`));
      [].concat(q.answer || []).forEach(p => box.append(richText('p', {}, p)));
      if (s.programming && q.code) box.append(codeBox(q.language || s.language, q.code, q.q, q.algorithm));
      out.push(box);
    });
  } catch (e) { out.push(el('p', { className: 'muted' }, 'Notes are not available in this language yet.')); }
  
  const next = skills[i + 1];
  if (next) {
    const nav = el('nav', { className: 'nav' }, link(`#/${next.id}`, 'Next \u2192'));
    out.push(nav);
  }
  
  app.lang = lang;
  app.replaceChildren(...out);
}

async function route() {
  closeSheet();
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, '').replace(/\/$/, ''));
  try { await (!id || id === 'index.html' ? home() : chapter(id)); }
  catch (e) { app.replaceChildren(el('p', { className: 'muted' }, 'Could not load notes. Check your connection and try again.')); }
}

window.addEventListener('hashchange', () => {
  route().then(() => window.scrollTo(0, 0));
});

route();
