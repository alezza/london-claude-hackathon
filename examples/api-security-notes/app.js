const notes = window.NOTES || [];
const $ = s => document.querySelector(s);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
let cat = 'All';
let tag = null; // exact OWASP tag filter set by the coverage bar, e.g. 'owasp api1'
const norm = t => t.trim().toLowerCase();
const hasTag = (n, t) => (n.tags || []).some(x => norm(x) === t);

const cats = ['All', ...new Set(notes.map(n => n.category).filter(Boolean))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));
cats.forEach(c => {
  const b = el('button', 'chip', c);
  b.setAttribute('aria-pressed', c === cat);
  b.onclick = () => { cat = c; document.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x.textContent === c)); render(); };
  $('#cats').append(b);
});

const tagList = tags => { const t = el('div', 'tags'); (tags || []).forEach(x => t.append(el('span', 'tag', x))); return t; };

function render() {
  const q = $('#q').value.trim().toLowerCase();
  const list = notes.filter(n => (cat === 'All' || n.category === cat) && (!tag || hasTag(n, tag)) &&
    (!q || [n.title, n.summary, n.body, ...(n.tags || [])].join(' ').toLowerCase().includes(q)));
  const grid = $('#grid'); grid.replaceChildren();
  $('#count').textContent = `${list.length} of ${notes.length} notes` + (tag ? ` · ${tag.toUpperCase()}` : '');
  $('#clear-tag').hidden = !tag;
  document.querySelectorAll('.cov button').forEach(b => b.setAttribute('aria-pressed', norm(b.dataset.tag) === tag));
  if (!list.length) return grid.append(el('p', 'empty', 'No notes match.'));
  list.forEach(n => {
    // An article with a real heading; the title button is the one control, stretched over the card.
    const c = el('article', 'card');
    const h = el('h3');
    const b = el('button', 'card-link', n.title);
    b.onclick = () => open(n);
    h.append(b);
    c.append(el('p', 'cat', n.category || ''), h, el('p', null, n.summary || ''), tagList(n.tags));
    grid.append(c);
  });
}

function open(n) {
  $('#d-cat').textContent = n.category || '';
  $('#d-title').textContent = n.title;
  $('#d-tags').replaceWith(Object.assign(tagList(n.tags), { id: 'd-tags' }));
  const body = $('#d-body'); body.replaceChildren();
  (n.body || '').split(/\n\s*\n/).forEach(p => body.append(el('p', null, p)));
  const meta = $('#d-meta'); meta.replaceChildren(n.updated ? `Updated ${n.updated}` : '');
  if (n.source && /^https?:\/\//.test(n.source)) {
    const a = el('a', null, 'Source'); a.href = n.source; a.target = '_blank'; a.rel = 'noopener';
    meta.append(n.updated ? ' · ' : '', a);
  }
  $('#detail').showModal();
}

// OWASP API Security Top 10 (2023): which risks have at least one note (tagged "OWASP API<n>").
const OWASP = ['Broken Object Level Authorization', 'Broken Authentication', 'Broken Object Property Level Authorization',
  'Unrestricted Resource Consumption', 'Broken Function Level Authorization', 'Unrestricted Access to Sensitive Business Flows',
  'Server Side Request Forgery', 'Security Misconfiguration', 'Improper Inventory Management', 'Unsafe Consumption of APIs'];
const covered = OWASP.map((_, i) => notes.some(n => hasTag(n, `owasp api${i + 1}`)));
$('#cov-n').textContent = `· ${covered.filter(Boolean).length} of 10`;
OWASP.forEach((name, i) => {
  const li = el('li', covered[i] ? 'has' : null);
  const b = el('button', null, `API${i + 1}`);
  b.title = `${name}${covered[i] ? '' : ' (no notes yet)'}`;
  b.setAttribute('aria-label', `API${i + 1}: ${name}, ${covered[i] ? 'has notes' : 'no notes yet'}`);
  b.dataset.tag = `owasp api${i + 1}`;
  b.onclick = () => {
    const t = `owasp api${i + 1}`;
    tag = tag === t ? null : t; // click again to clear
    cat = 'All'; $('#q').value = '';
    document.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x.textContent === 'All'));
    render();
  };
  li.append(b);
  $('#cov').append(li);
});

$('#clear-tag').onclick = () => { tag = null; render(); };
$('#q').addEventListener('input', render);
$('#detail .close').onclick = () => $('#detail').close();
$('#detail').addEventListener('click', e => { if (e.target.id === 'detail') e.target.close(); });
render();
