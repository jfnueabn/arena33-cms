// Arena33 admin dashboard.
// Section forms are generated from each section's JSON `content`, so adding a
// new field to db/defaults.js automatically gives it an input here.

const $ = (sel, el = document) => el.querySelector(sel);
const clone = v => JSON.parse(JSON.stringify(v));

// Tiny DOM builder: h('div', { class: 'x', onclick: fn }, child1, child2)
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (['value', 'checked', 'disabled', 'open', 'type', 'draggable'].includes(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

async function api(method, url, body) {
  const opts = { method, headers: { 'X-Requested-With': 'fetch' } };
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch('/api/admin' + url, opts);
  if (res.status === 401) {
    location.href = '/admin/login';
    throw new Error('Session expired');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

let toastTimer;
function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = 'toast' + (isError ? ' error' : '')), 2600);
}

// ---------- Field metadata ----------
const LABELS = {
  eyebrow: 'Small label above title', highlight: 'Highlighted words', url: 'Link', text: 'Text',
  target_date: 'Event date & time', expires_at: 'Hide after', ours: 'Our value', others: 'Their value',
  our_label: 'Our column name', other_label: 'Competitor column name', color_from: 'Gradient start', color_to: 'Gradient end',
  image_alt: 'Image alt text (SEO)', logo_text: 'Logo text', logo_accent: 'Logo coloured part', anchor: 'Section ID'
};
const HINTS = {
  highlight: 'Must match words in the headline exactly — they get the accent colour.',
  expires_at: 'Optional. The banner hides itself automatically after this date.',
  anchor: 'Used by menu links, e.g. a value of "how" is linked as #how.',
  copyright: '{year} is replaced with the current year.',
  suffix: 'Shown after the number, e.g. + or %.',
  icon: 'An emoji or 1–2 characters.',
  ours: 'Start with ✓ or ✕ to show it green or red.',
  others: 'Start with ✓ or ✕ to show it green or red.',
  rating: 'Stars from 1 to 5.',
  image: 'Leave empty to use the built-in illustration.',
  image_alt: 'Describes the image for Google and screen readers.',
  logo_image: 'Optional. Replaces the text logo.',
  url: 'Use #section-id, /path, https://… or mailto:'
};
const LONG = new Set(['description', 'banner_text', 'answer', 'quote', 'about_text', 'card_note', 'note', 'copyright']);
const humanize = k => (LABELS[k] || k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()));
const itemTitle = (item, i) => {
  if (typeof item !== 'object' || !item) return `Item ${i + 1}`;
  const t = item.title || item.name || item.label || item.question || item.feature || item.heading || item.text;
  return t || `Item ${i + 1}`;
};

// ---------- App state ----------
const state = {
  admin: null, settings: {}, sections: [], defaults: {},
  current: null,  // 'settings' or a section_key
  draft: null,    // editable copy of the current item
  dirty: false,
  open: new Set() // expanded list items (by path) so re-renders keep them open
};

const editor = $('#editor');
const sectionByKey = key => state.sections.find(s => s.section_key === key);

function replaceSection(sec) {
  const i = state.sections.findIndex(s => s.section_key === sec.section_key);
  if (i >= 0) state.sections[i] = sec;
}

function reloadPreview() {
  const f = $('#preview');
  try { f.contentWindow.location.reload(); } catch { f.src = '/'; }
}

function markDirty() {
  if (state.dirty) return;
  state.dirty = true;
  const b = $('#dirtyBadge');
  if (b) { b.textContent = 'Unsaved changes'; b.classList.add('dirty'); }
  const s = $('#saveBtn');
  if (s) s.disabled = false;
}

// ---------- Sidebar ----------
function renderSidebar() {
  const fixed = state.sections.filter(s => s.is_fixed);
  const body = state.sections.filter(s => !s.is_fixed);

  $('#fixedList').replaceChildren(...fixed.map(s =>
    h('button', { class: 'side-item' + (state.current === s.section_key ? ' active' : ''), onclick: () => openItem(s.section_key) },
      s.section_key === 'header' ? '🔝 ' : '🔚 ', s.name)
  ));

  document.querySelectorAll('.side-item[data-open]').forEach(b => b.classList.toggle('active', state.current === b.dataset.open));

  let dragKey = null;
  $('#sectionList').replaceChildren(...body.map((s, i) => {
    const li = h('li', {
      class: s.is_visible ? '' : 'hidden-sec', draggable: true,
      ondragstart: e => { dragKey = s.section_key; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; },
      ondragend: () => li.classList.remove('dragging'),
      ondragover: e => { e.preventDefault(); li.classList.add('drop-target'); },
      ondragleave: () => li.classList.remove('drop-target'),
      ondrop: e => {
        e.preventDefault();
        li.classList.remove('drop-target');
        const order = body.map(x => x.section_key).filter(k => k !== dragKey);
        order.splice(order.indexOf(s.section_key), 0, dragKey);
        saveOrder(order);
      }
    },
      h('span', { class: 'handle', 'aria-hidden': 'true' }, '⋮⋮'),
      h('button', { class: 'side-item' + (state.current === s.section_key ? ' active' : ''), onclick: () => openItem(s.section_key), title: s.name }, h('span', {}, s.name)),
      h('button', { class: 'icon-btn', title: s.is_visible ? 'Hide section' : 'Show section', 'aria-label': (s.is_visible ? 'Hide ' : 'Show ') + s.name, onclick: () => toggleVisible(s) }, s.is_visible ? '👁' : '🚫'),
      h('button', { class: 'icon-btn', title: 'Move up', 'aria-label': 'Move ' + s.name + ' up', disabled: i === 0, onclick: () => moveSection(i, -1) }, '↑'),
      h('button', { class: 'icon-btn', title: 'Move down', 'aria-label': 'Move ' + s.name + ' down', disabled: i === body.length - 1, onclick: () => moveSection(i, 1) }, '↓')
    );
    return li;
  }));
}

async function saveOrder(order) {
  try {
    const { sections } = await api('PUT', '/sections-order', { order });
    state.sections = sections;
    renderSidebar();
    reloadPreview();
    toast('Order saved');
  } catch (e) { toast(e.message, true); }
}

function moveSection(i, dir) {
  const order = state.sections.filter(s => !s.is_fixed).map(s => s.section_key);
  [order[i], order[i + dir]] = [order[i + dir], order[i]];
  saveOrder(order);
}

async function toggleVisible(s) {
  try {
    const { section } = await api('PUT', `/sections/${s.section_key}`, {
      eyebrow: s.eyebrow, title: s.title, subtitle: s.subtitle, content: s.content, is_visible: !s.is_visible
    });
    replaceSection(section);
    if (state.current === s.section_key) {
      state.draft.is_visible = section.is_visible;
      renderEditor();
    }
    renderSidebar();
    reloadPreview();
    toast(section.is_visible ? `${s.name} is now visible` : `${s.name} is now hidden`);
  } catch (e) { toast(e.message, true); }
}

// ---------- Navigation ----------
function openItem(target) {
  if (state.current === target) return;
  if (state.dirty && !confirm('You have unsaved changes. Discard them?')) return;
  state.current = target;
  state.draft = target === 'settings' ? clone(state.settings) : target === 'logins' ? null : clone(sectionByKey(target));
  state.dirty = false;
  state.open.clear();
  history.replaceState(null, '', '#' + target);
  $('#sidebar').classList.remove('open');
  renderSidebar();
  renderEditor();
  editor.scrollTop = 0;
}

function renderEditor() {
  const scroll = editor.scrollTop;
  if (state.current === 'logins') return loginsView();
  editor.replaceChildren(state.current === 'settings' ? settingsView() : sectionView());
  if (state.current === 'settings') updateSerp();
  editor.scrollTop = scroll;
}

// ---------- Settings view ----------
function settingsView() {
  const d = state.draft;
  const set = (k, v) => { d[k] = v; markDirty(); updateSerp(); };

  const text = (k, label, opts = {}) => {
    const input = h(opts.long ? 'textarea' : 'input', { type: opts.long ? null : (opts.type || 'text'), value: d[k] ?? '', placeholder: opts.placeholder || '' });
    const counter = opts.max ? h('div', { class: 'counter' }) : null;
    const count = () => {
      if (!counter) return;
      const n = input.value.length;
      counter.textContent = `${n} / ${opts.max} characters`;
      counter.classList.toggle('over', n > opts.max);
    };
    input.addEventListener('input', () => { set(k, input.value); count(); });
    count();
    return h('label', { class: 'field' + (opts.long ? ' wide' : '') }, h('span', {}, label), input, counter, opts.hint ? h('small', {}, opts.hint) : null);
  };

  const serp = h('div', { class: 'serp', id: 'serp' }, h('div', { class: 'url' }), h('div', { class: 't' }), h('div', { class: 'd' }));

  return h('div', {},
    head('SEO & site settings', null),
    h('div', { class: 'panel' },
      h('h2', {}, 'Google search preview'),
      serp,
      h('p', { class: 'muted small', style: 'margin-top:8px' }, 'Roughly how the homepage appears in Google results.')
    ),
    h('div', { class: 'panel' },
      h('h2', {}, 'Search engine (SEO)'),
      text('seo_title', 'Page title', { max: 60, hint: 'Shown in the browser tab and as the blue link on Google. Aim for 50–60 characters.' }),
      text('seo_description', 'Meta description', { long: true, max: 160, hint: 'The grey text under the link on Google. Aim for 120–160 characters.' }),
      text('seo_keywords', 'Keywords', { hint: 'Comma-separated. Minor ranking value today, but useful for the team.' }),
      text('canonical_url', 'Canonical URL', { type: 'url', placeholder: 'https://www.example.com/', hint: 'The official address of the homepage. Used for canonical, Open Graph and the sitemap.' }),
      imageField('og_image', 'Social share image (Open Graph)', d.og_image, v => set('og_image', v), 'Shown when the link is shared on WhatsApp, Facebook or X. 1200×630 works best.'),
      h('label', { class: 'field check' },
        h('input', { type: 'checkbox', checked: d.robots_index === '1', onchange: e => set('robots_index', e.target.checked ? '1' : '0') }),
        h('span', {}, 'Allow search engines to index this site')
      )
    ),
    h('div', { class: 'panel' },
      h('h2', {}, 'Site & branding'),
      h('div', { class: 'grid2' },
        text('site_name', 'Site name'),
        h('label', { class: 'field' }, h('span', {}, 'Language'),
          h('select', { onchange: e => set('language', e.target.value) },
            ...[['en-MY', 'English (Malaysia)'], ['ms-MY', 'Bahasa Melayu'], ['en', 'English']].map(([v, l]) => h('option', { value: v, selected: d.language === v ? 'selected' : null }, l))
          )
        ),
        colorField('accent_color', 'Accent colour', d.accent_color, v => set('accent_color', v)),
        colorField('secondary_color', 'Secondary colour', d.secondary_color, v => set('secondary_color', v)),
        text('ga_id', 'Google Analytics ID', { placeholder: 'G-XXXXXXXXXX', hint: 'Optional. Leave empty to disable tracking.' })
      )
    ),
    saveBar(false)
  );
}

function updateSerp() {
  const serp = $('#serp');
  if (!serp || state.current !== 'settings') return;
  const d = state.draft;
  serp.querySelector('.url').textContent = (d.canonical_url || '').replace(/^https?:\/\//, '').replace(/\/$/, '') || 'example.com';
  serp.querySelector('.t').textContent = d.seo_title || 'Page title';
  const desc = d.seo_description || '';
  serp.querySelector('.d').textContent = desc.length > 160 ? desc.slice(0, 157) + '…' : desc;
}

// ---------- Section view ----------
function sectionView() {
  const d = state.draft;
  const isHero = d.section_key === 'hero';

  const headingPanel = d.is_fixed ? null : h('div', { class: 'panel' },
    h('h2', {}, 'Section heading'),
    h('label', { class: 'field check' },
      h('input', { type: 'checkbox', checked: d.is_visible, onchange: e => { d.is_visible = e.target.checked; markDirty(); } }),
      h('span', {}, 'Show this section on the homepage')
    ),
    h('div', { class: 'grid2' },
      plainInput('Small label above title', d.eyebrow, v => (d.eyebrow = v)),
      plainInput(isHero ? 'Headline (H1 — the main SEO heading)' : 'Title (H2)', d.title, v => (d.title = v), 'wide'),
      plainInput('Subtitle', d.subtitle, v => (d.subtitle = v), 'wide', true)
    )
  );

  return h('div', {},
    head(d.name, d),
    headingPanel,
    h('div', { class: 'panel' }, h('h2', {}, 'Content'), h('div', { class: 'grid2' }, buildFields(d.content, []))),
    saveBar(true)
  );
}

function head(title, sec) {
  return h('div', { class: 'editor-head' },
    h('h1', {}, title),
    sec && !sec.is_fixed ? h('span', { class: 'badge' }, sec.is_visible ? 'Visible' : 'Hidden') : null,
    h('span', { class: 'badge' + (state.dirty ? ' dirty' : ''), id: 'dirtyBadge' }, state.dirty ? 'Unsaved changes' : 'Saved'),
    sec && sec.updated_at ? h('span', { class: 'muted small' }, 'Last updated ' + new Date(sec.updated_at).toLocaleString()) : null
  );
}

function plainInput(label, value, onChange, cls = '', long = false) {
  const input = h(long ? 'textarea' : 'input', { type: long ? null : 'text', value: value ?? '' });
  input.addEventListener('input', () => { onChange(input.value); markDirty(); });
  return h('label', { class: 'field ' + cls }, h('span', {}, label), input);
}

function saveBar(withHistory) {
  const historyWrap = withHistory ? h('div', { class: 'history' }) : null;
  if (historyWrap) historyWrap.append(h('button', { class: 'btn', type: 'button', onclick: () => toggleHistory(historyWrap) }, '🕘 History'));
  return h('div', { class: 'savebar' },
    h('button', { class: 'btn primary', id: 'saveBtn', disabled: !state.dirty, onclick: save }, 'Save changes'),
    h('button', { class: 'btn ghost', onclick: discard }, 'Discard'),
    historyWrap,
    h('span', { class: 'spacer' }),
    h('span', { class: 'muted small' }, 'Ctrl + S to save')
  );
}

// ---------- Generic JSON → form builder ----------
function getAt(path) { return path.reduce((o, k) => o[k], state.draft.content); }
function setAt(path, value) {
  const parent = getAt(path.slice(0, -1));
  parent[path[path.length - 1]] = value;
  markDirty();
}

// The default content tells us what a new list item should look like.
function templateFor(path) {
  let node = state.defaults[state.current];
  for (const k of path) {
    if (node == null) break;
    node = Array.isArray(node) ? node[0] : node[k];
  }
  const sample = Array.isArray(node) ? node[0] : undefined;
  return sample !== undefined ? blank(sample) : undefined;
}
function blank(v) {
  if (Array.isArray(v)) return [];
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)]));
  if (typeof v === 'string') return v.startsWith('#') ? v : ''; // keep colours and #anchors
  if (typeof v === 'number') return 0;
  return v; // booleans keep their default
}

function buildFields(obj, path) {
  return Object.entries(obj).map(([key, val]) => buildField(key, val, [...path, key]));
}

function buildField(key, val, path) {
  if (Array.isArray(val)) return listField(key, val, path);
  if (val && typeof val === 'object') {
    return h('fieldset', { class: 'group wide' }, h('legend', {}, humanize(key)), h('div', { class: 'grid2' }, buildFields(val, path)));
  }
  if (typeof val === 'boolean') {
    return h('label', { class: 'field check' },
      h('input', { type: 'checkbox', checked: val, onchange: e => setAt(path, e.target.checked) }),
      h('span', {}, humanize(key)));
  }
  if (typeof val === 'number') {
    const input = h('input', { type: 'number', value: val, min: key === 'rating' ? 1 : null, max: key === 'rating' ? 5 : null });
    input.addEventListener('input', () => setAt(path, Number(input.value) || 0));
    return h('label', { class: 'field' }, h('span', {}, humanize(key)), input, HINTS[key] ? h('small', {}, HINTS[key]) : null);
  }
  return stringField(key, val, path);
}

function stringField(key, val, path) {
  const onChange = v => setAt(path, v);
  if (/color/.test(key)) return colorField(key, humanize(key), val, onChange);
  if (/image/.test(key) && key !== 'image_alt') return imageField(key, humanize(key), val, onChange, HINTS[key]);
  if (key === 'target_date' || key === 'expires_at') {
    const input = h('input', { type: 'datetime-local', value: val });
    input.addEventListener('input', () => onChange(input.value));
    return h('label', { class: 'field' }, h('span', {}, humanize(key)), input, HINTS[key] ? h('small', {}, HINTS[key]) : null);
  }
  const long = LONG.has(key);
  const input = h(long ? 'textarea' : 'input', { type: long ? null : 'text', value: val });
  input.addEventListener('input', () => onChange(input.value));
  return h('label', { class: 'field' + (long ? ' wide' : '') }, h('span', {}, humanize(key)), input, HINTS[key] ? h('small', {}, HINTS[key]) : null);
}

function colorField(key, label, val, onChange) {
  const color = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(val) ? val : '#000000' });
  const text = h('input', { type: 'text', value: val ?? '' });
  color.addEventListener('input', () => { text.value = color.value; onChange(color.value); });
  text.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(text.value)) color.value = text.value; onChange(text.value); });
  return h('label', { class: 'field' }, h('span', {}, label), h('div', { class: 'color-row' }, color, text));
}

function imageField(key, label, val, onChange, hint) {
  const text = h('input', { type: 'text', value: val ?? '', placeholder: '/uploads/… or https://…' });
  const thumb = h('img', { class: 'thumb', alt: '', src: val || null });
  thumb.hidden = !val;
  const sync = v => { text.value = v; thumb.src = v; thumb.hidden = !v; onChange(v); };
  text.addEventListener('input', () => sync(text.value));
  const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', hidden: true });
  file.addEventListener('change', async () => {
    if (!file.files[0]) return;
    try {
      const fd = new FormData();
      fd.append('file', file.files[0]);
      const { url } = await api('POST', '/upload', fd);
      sync(url);
      toast('Image uploaded — remember to save');
    } catch (e) { toast(e.message, true); }
    file.value = '';
  });
  return h('div', { class: 'field wide' },
    h('span', {}, label),
    h('div', { class: 'image-row' }, text,
      h('button', { class: 'btn', type: 'button', onclick: () => file.click() }, '⬆ Upload'),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => sync('') }, 'Clear'),
      file),
    thumb,
    hint ? h('small', {}, hint) : null
  );
}

function listField(key, arr, path) {
  const tpl = templateFor(path);
  const isStrings = typeof (arr[0] ?? tpl ?? '') === 'string';
  const rerender = () => { markDirty(); renderEditor(); };
  const move = (i, dir) => {
    [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
    rerender();
  };
  const remove = i => {
    if (!confirm('Remove this item?')) return;
    arr.splice(i, 1);
    rerender();
  };
  const controls = i => [
    h('button', { class: 'icon-btn', type: 'button', title: 'Move up', disabled: i === 0, onclick: e => { e.preventDefault(); move(i, -1); } }, '↑'),
    h('button', { class: 'icon-btn', type: 'button', title: 'Move down', disabled: i === arr.length - 1, onclick: e => { e.preventDefault(); move(i, 1); } }, '↓'),
    h('button', { class: 'icon-btn', type: 'button', title: 'Remove', onclick: e => { e.preventDefault(); remove(i); } }, '🗑')
  ];

  const items = arr.map((item, i) => {
    if (isStrings) {
      const long = key === 'paragraphs';
      const input = h(long ? 'textarea' : 'input', { type: long ? null : 'text', value: item });
      input.addEventListener('input', () => setAt([...path, i], input.value));
      return h('div', { class: 'str-row' }, input, ...controls(i));
    }
    const pathKey = [...path, i].join('.');
    const det = h('details', { class: 'list-item', open: state.open.has(pathKey) },
      h('summary', {}, h('span', { class: 'num' }, `${i + 1}.`), h('span', { class: 'title' }, itemTitle(item, i)), ...controls(i)),
      h('div', { class: 'body grid2' }, buildFields(item, [...path, i]))
    );
    det.addEventListener('toggle', () => (det.open ? state.open.add(pathKey) : state.open.delete(pathKey)));
    return det;
  });

  const add = h('button', {
    class: 'btn sm', type: 'button',
    onclick: () => {
      const item = tpl !== undefined ? clone(tpl) : (isStrings ? '' : {});
      arr.push(item);
      if (!isStrings) state.open.add([...path, arr.length - 1].join('.'));
      rerender();
    }
  }, '+ Add ' + (isStrings ? 'line' : 'item'));

  return h('fieldset', { class: 'group wide' },
    h('legend', {}, `${humanize(key)} (${arr.length})`),
    items,
    add
  );
}

// ---------- Save / discard / history ----------
async function save() {
  if (!state.dirty) return;
  const btn = $('#saveBtn');
  if (btn) btn.disabled = true;
  try {
    if (state.current === 'settings') {
      const { settings } = await api('PUT', '/settings', { settings: state.draft });
      state.settings = settings;
      state.draft = clone(settings);
    } else {
      const { eyebrow, title, subtitle, is_visible, content } = state.draft;
      const { section } = await api('PUT', `/sections/${state.current}`, { eyebrow, title, subtitle, is_visible, content });
      replaceSection(section);
      state.draft = clone(section);
    }
    state.dirty = false;
    renderSidebar();
    renderEditor();
    reloadPreview();
    toast('Saved — the homepage is updated');
  } catch (e) {
    toast(e.message, true);
    if (btn) btn.disabled = false;
  }
}

function discard() {
  if (state.dirty && !confirm('Discard your unsaved changes?')) return;
  state.draft = state.current === 'settings' ? clone(state.settings) : clone(sectionByKey(state.current));
  state.dirty = false;
  renderEditor();
}

async function toggleHistory(wrap) {
  const existing = wrap.querySelector('.history-menu');
  if (existing) return existing.remove();
  const menu = h('div', { class: 'history-menu' }, h('p', { class: 'muted small', style: 'padding:6px 8px' }, 'Loading…'));
  wrap.append(menu);
  try {
    const { revisions } = await api('GET', `/sections/${state.current}/revisions`);
    menu.replaceChildren(
      h('p', { class: 'muted small', style: 'padding:6px 8px' }, 'Versions saved before each change'),
      ...(revisions.length ? revisions.map(r => h('div', {},
        h('span', {}, new Date(r.created_at).toLocaleString(), h('br'), h('small', { class: 'muted' }, 'by ' + (r.username || 'unknown'))),
        h('button', { class: 'btn sm', onclick: () => restore(r.id) }, 'Restore')
      )) : [h('p', { class: 'muted', style: 'padding:6px 8px' }, 'No earlier versions yet.')])
    );
  } catch (e) { menu.replaceChildren(h('p', { class: 'form-error', style: 'padding:6px 8px' }, e.message)); }
}

async function restore(id) {
  if (state.dirty && !confirm('Restoring will replace your unsaved changes. Continue?')) return;
  try {
    const { section } = await api('POST', `/sections/${state.current}/revisions/${id}/restore`);
    replaceSection(section);
    state.draft = clone(section);
    state.dirty = false;
    renderSidebar();
    renderEditor();
    reloadPreview();
    toast('Version restored');
  } catch (e) { toast(e.message, true); }
}

// ---------- Login history ----------
const fmtTime = t => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const REASONS = { ok: 'Signed in', wrong_password: 'Wrong password', unknown_user: 'Unknown username', locked: 'Blocked (too many attempts)' };

// Short, readable browser + OS from a user-agent string.
function describeUA(ua = '') {
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /node|curl|undici/i.test(ua) ? 'Script' : 'Unknown browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} on ${os}` : browser;
}

function showLastLogin(prev, failed) {
  const el = $('#lastLogin');
  if (!prev) {
    el.textContent = 'First login recorded';
  } else {
    el.textContent = `Last login: ${fmtTime(prev.at)} · ${describeUA(prev.user_agent)}`;
  }
  if (failed > 0) {
    el.textContent += ` · ⚠ ${failed} failed attempt${failed > 1 ? 's' : ''} ${prev ? 'since then' : 'in the last 30 days'}`;
    el.classList.add('warn');
  }
}

async function loginsView(onlyFailed = false) {
  const tbody = h('tbody', {}, h('tr', {}, h('td', { colspan: 5, class: 'muted' }, 'Loading…')));
  const stats = h('div', { class: 'stat-row' });
  const filter = h('label', { class: 'field check', style: 'margin:0' },
    h('input', { type: 'checkbox', checked: onlyFailed, onchange: e => loginsView(e.target.checked) }),
    h('span', {}, 'Show failed attempts only'));

  editor.replaceChildren(h('div', {},
    head('Login history', null),
    h('p', { class: 'muted', style: 'margin:-8px 0 16px' }, 'Every sign-in attempt to this admin, newest first. Times are shown in your local time zone. Kept for 180 days.'),
    stats,
    h('div', { class: 'toolbar' }, filter, h('button', { class: 'btn sm', onclick: () => loginsView(onlyFailed) }, '↻ Refresh')),
    h('div', { class: 'table-scroll' },
      h('table', { class: 'log-table' },
        h('thead', {}, h('tr', {}, ...['Time', 'Result', 'Username', 'IP address', 'Device'].map(t => h('th', {}, t)))),
        tbody))
  ));
  // The editor head shows a "Saved" badge meant for forms; it doesn't apply here.
  $('#dirtyBadge')?.remove();

  try {
    const { logins, stats: s } = await api('GET', '/logins?limit=200' + (onlyFailed ? '&failed=1' : ''));
    if (state.current !== 'logins') return;
    stats.replaceChildren(
      h('div', { class: 'stat-card' }, h('b', {}, s.total), h('span', {}, 'Attempts recorded')),
      h('div', { class: 'stat-card' }, h('b', {}, s.ok), h('span', {}, 'Successful logins')),
      h('div', { class: 'stat-card' + (s.failed24h > 0 ? ' bad' : '') }, h('b', {}, s.failed24h), h('span', {}, 'Failed in last 24 hours'))
    );
    tbody.replaceChildren(...(logins.length ? logins.map(l => h('tr', { class: l.success ? '' : 'fail' },
      h('td', {}, fmtTime(l.created_at)),
      h('td', {}, h('span', { class: 'pill ' + (l.success ? 'ok' : 'bad') }, REASONS[l.reason] || l.reason)),
      h('td', {}, l.username || '—'),
      h('td', {}, l.ip || '—'),
      h('td', {}, describeUA(l.user_agent), h('div', { class: 'ua', title: l.user_agent }, (l.user_agent || '').slice(0, 60) + ((l.user_agent || '').length > 60 ? '…' : '')))
    )) : [h('tr', {}, h('td', { colspan: 5, class: 'muted' }, onlyFailed ? 'No failed attempts. 👍' : 'No logins recorded yet.'))]));
  } catch (e) {
    tbody.replaceChildren(h('tr', {}, h('td', { colspan: 5, class: 'form-error' }, e.message)));
  }
}

// ---------- Boot ----------
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openItem(b.dataset.open)));
$('#sideToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

const layout = $('#layout');
const applyPreviewPref = hide => {
  layout.classList.toggle('no-preview', hide);
  $('#togglePreview').textContent = hide ? 'Show preview' : 'Hide preview';
};
try { applyPreviewPref(localStorage.getItem('arena33.hidePreview') === '1'); } catch { /* storage blocked */ }
$('#togglePreview').addEventListener('click', () => {
  const hide = !layout.classList.contains('no-preview');
  applyPreviewPref(hide);
  try { localStorage.setItem('arena33.hidePreview', hide ? '1' : '0'); } catch { /* storage blocked */ }
});

const pwDialog = $('#pwDialog');
$('#pwBtn').addEventListener('click', () => { $('#pwForm').reset(); $('#pwError').textContent = ''; pwDialog.showModal(); });
$('#pwCancel').addEventListener('click', () => pwDialog.close());
$('#pwForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await api('PUT', '/password', { current: f.get('current'), next: f.get('next') });
    pwDialog.close();
    toast('Password updated');
  } catch (err) { $('#pwError').textContent = err.message; }
});

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    save();
  }
});
window.addEventListener('beforeunload', e => {
  if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
});

(async () => {
  try {
    const data = await api('GET', '/bootstrap');
    Object.assign(state, { admin: data.admin, settings: data.settings, sections: data.sections, defaults: data.defaults });
    showLastLogin(data.previousLogin, data.failedSincePrevious);
    const wanted = location.hash.slice(1);
    openItem(wanted === 'settings' || wanted === 'logins' || sectionByKey(wanted) ? wanted : 'hero');
  } catch (e) {
    editor.replaceChildren(h('div', { class: 'empty' }, 'Could not load content: ' + e.message));
  }
})();
