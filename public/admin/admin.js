// LV55 admin dashboard.
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
  const res = await fetch('/api/admin' + url + (url.includes('?') ? '&' : '?') + 'locale=' + state.locale, opts);
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
const LONG = new Set(['description', 'card_description', 'banner_text', 'answer', 'quote', 'about_text', 'card_note', 'note', 'copyright', 'seo_description', 'collection_description', 'cta_description', 'notice']);
const humanize = k => (LABELS[k] || k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()));
const itemTitle = (item, i) => {
  if (typeof item !== 'object' || !item) return `Item ${i + 1}`;
  const t = item.title || item.name || item.label || item.question || item.offer || item.feature || item.heading || item.text || (item.home && item.away ? item.home+' vs '+item.away : item.league);
  return t || `Item ${i + 1}`;
};

// ---------- App state ----------
const state = {
  admin: null, settings: {}, sections: [], pages: [], defaults: {},
  locale: 'en',
  sectionTemplates: [],
  contentBlocks: [],
  layoutDefaults: {}, blockStyleDefaults: {},
  pageSlug: 'home',
  current: null,  // 'settings' or a section_key
  draft: null,    // editable copy of the current item
  dirty: false,
  open: new Set() // expanded list items (by path) so re-renders keep them open
};

const editor = $('#editor');
const sectionByKey = key => state.sections.find(s => s.section_key === key);
const selectedPage = () => state.pages.find(p => p.slug === state.pageSlug);
const pageSections = () => state.sections.filter(s => !s.is_fixed && s.page_slug === state.pageSlug);
const sectionApi = key => { const section = sectionByKey(key); return section?.is_fixed ? '/sections/' + key : '/pages/' + section.page_slug + '/sections/' + key; };
function selectPage(slug) {
  if (state.dirty && !confirm('You have unsaved changes. Discard them?')) { $('#pageSelect').value = state.pageSlug; return; }
  state.pageSlug = slug; state.current = null; state.dirty = false;
  openItem(pageSections()[0]?.section_key || 'page-settings');
}

function replaceSection(sec) {
  const i = state.sections.findIndex(s => s.section_key === sec.section_key);
  if (i >= 0) state.sections[i] = sec;
}

let previewSequence = 0;
function reloadPreview() {
  const f = $('#preview');
  const target = '/en/' + (state.pageSlug === 'home' ? '' : state.pageSlug) + '?preview=1&preview_version=' + Date.now() + '-' + (++previewSequence);
  const current = sectionByKey(state.current);
  f.onload = () => {
    if (!current?.template.startsWith('builder_')) return;
    try {
      const previewWindow = f.contentWindow;
      const scrollToSection = () => previewWindow.requestAnimationFrame(() => {
        f.contentDocument.getElementById(current.section_key)?.scrollIntoView({block:'start',behavior:'instant'});
      });
      scrollToSection();
      f.contentDocument.fonts?.ready.then(scrollToSection);
    } catch { /* Preview may have navigated to an external button destination. */ }
  };
  f.src = target + (current?.template.startsWith('builder_') ? '#' + current.section_key : '');
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
function pagesInHeaderOrder() {
  return NavLinks.headerPages(sectionByKey('header')?.content.nav||[],state.pages,location.origin);
}
function renderSidebar() {
  const headerPages=pagesInHeaderOrder();
  if(!headerPages.some(page=>page.slug===state.pageSlug))state.pageSlug=headerPages[0]?.slug||'home';
  $('#pageSelect').replaceChildren(...headerPages.map(p => h('option', { value:p.slug, selected:p.slug===state.pageSlug?'selected':null }, p.name)));
  $('#sectionLabel').textContent = selectedPage().name + ' sections';
  $('#builderActions').hidden = false;
  $('#viewSite').href = '/en/' + (state.pageSlug === 'home' ? '' : state.pageSlug);
  const fixed = state.sections.filter(s => s.is_fixed);
  const body = pageSections();

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
    const { sections } = await api('PUT', '/pages/' + state.pageSlug + '/sections-order', { order });
    state.sections = sections;
    renderSidebar();
    reloadPreview();
    toast('Order saved');
  } catch (e) { toast(e.message, true); }
}

function moveSection(i, dir) {
  const order = pageSections().map(s => s.section_key);
  [order[i], order[i + dir]] = [order[i + dir], order[i]];
  saveOrder(order);
}

async function toggleVisible(s) {
  try {
    const { section } = await api('PUT', sectionApi(s.section_key), {
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
  state.draft = target === 'settings' ? clone(state.settings) : target === 'page-settings' ? clone(selectedPage()) : clone(sectionByKey(target));
  state.dirty = false;
  state.open.clear();
  history.replaceState(null, '', '#' + state.pageSlug + ':' + target);
  $('#sidebar').classList.remove('open');
  renderSidebar();
  renderEditor();
  editor.scrollTop = 0;
  reloadPreview();
}

function renderEditor() {
  const scroll = editor.scrollTop;
  editor.replaceChildren(state.current === 'settings' ? settingsView() : state.current === 'page-settings' ? pageSettingsView() : sectionView());
  if (state.current === 'page-settings') updateSerp();
  editor.scrollTop = scroll;
}

// ---------- Settings view ----------
function settingsView() {
  const d = state.draft;
  const set = (k, value) => { d[k] = value; markDirty(); };
  return h('div', {}, head('Shared site settings', null),
    h('div', { class: 'panel' }, h('h2', {}, 'Site & branding'),
      h('div', { class: 'grid2' },
        plainInput('Site name', d.site_name, v => set('site_name', v)),
        h('p', {class:'muted small'}, 'Public languages: English, Bahasa Melayu and Simplified Chinese. Edit in English. Malay and Chinese are translated automatically on save.'),
        colorField('accent_color', 'Accent colour', d.accent_color, v => set('accent_color', v)),
        colorField('secondary_color', 'Secondary colour', d.secondary_color, v => set('secondary_color', v)),
        plainInput('Google Analytics ID', d.ga_id, v => set('ga_id', v)),
        plainInput('Site canonical URL', d.canonical_url, v => set('canonical_url', v))
      ),
      h('label', { class:'field check' }, h('input', { type:'checkbox', checked:d.robots_index === '1', onchange:e => set('robots_index', e.target.checked ? '1' : '0') }), h('span', {}, 'Allow search engines to index this site')),
      h('p', { class:'muted small' }, 'Branding, navigation, footer and language are shared across all pages. Edit SEO for each page in Page settings.')
    ), saveBar(false));
}

function pageSettingsView() {
  const d = state.draft;
  const seoField = (key, label, max, long = false) => {
    const field = plainInput(label, d.content[key], value => { d.content[key] = value; updateSerp(); }, '', long);
    const counter = h('div', { class: 'counter' });
    const update = () => { counter.textContent = d.content[key].length + ' / ' + max + ' characters'; counter.classList.toggle('over', d.content[key].length > max); };
    field.querySelector('input, textarea').addEventListener('input', update);
    update(); field.append(counter); return field;
  };
  return h('div', {}, head(selectedPage().name + ' — Page settings', null),
    h('div', { class: 'panel' }, h('h2', {}, 'Google search preview'),
      h('div', { class: 'serp', id: 'serp' }, h('div', { class: 'url' }), h('div', { class: 't' }), h('div', { class: 'd' }))),
    h('div', { class:'panel' }, h('h2', {}, 'Publishing & SEO'),
      h('p', { class:'muted small' }, 'Page URL: /' + state.locale + '/' + (d.slug === 'home' ? '' : d.slug)),
      h('p', { class:'muted small' }, 'Edit SEO and content in English. Malay and Chinese are generated automatically. The admin editor and preview use English.'),
      h('label', { class:'field check' }, h('input', { type:'checkbox', checked:d.is_visible, onchange:e => { d.is_visible = e.target.checked; markDirty(); } }), h('span', {}, 'Publish this page')),
      seoField('seo_title', 'SEO title', 60),
      seoField('seo_description', 'Meta description', 160, true),
      plainInput('Keywords', d.content.seo_keywords, v => d.content.seo_keywords = v),
      imageField('og_image', 'Social share image', d.content.og_image, v => { d.content.og_image = v; markDirty(); }),
      h('label', { class:'field check' }, h('input', { type:'checkbox', checked:d.content.robots_index === '1', onchange:e => { d.content.robots_index = e.target.checked ? '1' : '0'; markDirty(); } }), h('span', {}, 'Allow search engines to index this page'))
    ), saveBar(false));
}

function updateSerp() {
  const serp = $('#serp');
  if (!serp || state.current !== 'page-settings') return;
  const d = state.draft.content;
  const base = (state.settings.canonical_url || 'https://example.com/').replace(/\/?$/, '/');
  serp.querySelector('.url').textContent = (base + state.locale + '/' + (state.pageSlug === 'home' ? '' : state.pageSlug)).replace(/^https?:\/\//, '');
  serp.querySelector('.t').textContent = d.seo_title || 'Page title';
  const desc = d.seo_description || '';
  serp.querySelector('.d').textContent = desc.length > 160 ? desc.slice(0, 157) + '…' : desc;
}

// ---------- Section view ----------
function sectionView() {
  const d = state.draft;
  const isHero = ['hero', 'games_hero', 'bonus_hero', 'sports_hero'].includes(d.template);
  const itemHeading = d.template==='builder_section' && !d.title && !d.eyebrow && !d.subtitle;

  const headingPanel = d.is_fixed || itemHeading ? null : h('div', { class: 'panel' },
    h('h2', {}, 'Section heading'),
    h('label', { class: 'field check' },
      h('input', { type: 'checkbox', checked: d.is_visible, onchange: e => { d.is_visible = e.target.checked; markDirty(); } }),
      h('span', {}, 'Show this section on this page')
    ),
    h('div', { class: 'grid2' },
      plainInput('Small label above title', d.eyebrow, v => (d.eyebrow = v)),
      plainInput(isHero ? 'Headline (H1 — the main SEO heading)' : 'Title (H2)', d.title, v => (d.title = v), 'wide'),
      plainInput('Subtitle', d.subtitle, v => (d.subtitle = v), 'wide', true)
    )
  );

  return h('div', {},
    head(d.name, d),
    d.translation_exists === false ? h('p', {class:'translation-note'}, 'English fallback is shown. Save this section to create its translation.') : null,
    d.page_slug !== 'shared' && !d.is_fixed ? h('div', {class:'section-tools panel'},
      itemHeading ? h('label',{class:'field check'},h('input',{type:'checkbox',checked:d.is_visible,onchange:event=>{d.is_visible=event.target.checked;markDirty();}}),h('span',{},'Show this section on this page')) : null,
      plainInput('Section name (admin only)', d.name, value => (d.name = value)),
      h('div', {class:'section-tool-buttons'},
        d.template.startsWith('builder_') ? h('button', {class:'btn',onclick:()=>duplicateSection(d)}, 'Duplicate section') : null,
        h('button', {class:'btn danger',onclick:()=>removeSection(d)}, 'Delete section')
      ),
      !d.is_visible ? h('p', {class:'muted small'}, 'This section is hidden from visitors and the preview. Enable “Show this section on this page” and save to display it.') : null
    ) : null,
    headingPanel,
    d.section_key==='header'?h('p',{class:'translation-note'},'Saving a new internal header link automatically creates a published page with a blank section. Leave its URL empty to generate it from the label, or enter /your-page. External links and #anchors do not create pages.'):null,
    d.template === 'builder_section' ? sectionLayoutEditor(d.content) : null,
    h('div', { class: 'panel' }, h('h2', {}, 'Content'), d.template === 'builder_section' ? blocksEditor(d.content) : d.template === 'builder_table' ? tableEditor(d.content) : h('div', { class: 'grid2' }, buildFields(d.content, []))),
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
  if(state.draft.template==='builder_section' && path[0]==='blocks') {
    let sample=state.contentBlocks.find(item=>item.type===state.draft.content.blocks[path[1]]?.type)?.content;
    for(const key of path.slice(3))sample=Array.isArray(sample)?sample[0]:sample?.[key];
    return Array.isArray(sample) && sample[0]!==undefined ? blank(sample[0]) : undefined;
  }
  let node = state.defaults[state.current] || state.sectionTemplates.find(item => item.template === state.draft.template)?.content;
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
  if(key==='variant' && path[0]==='blocks') return choiceInput('Button style',val,[['primary','Primary'],['outline','Outline']],onChange);
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
  return h('label', { class: 'field' + (long || key === 'question' ? ' wide' : '') }, h('span', {}, humanize(key)), input, HINTS[key] ? h('small', {}, HINTS[key]) : null);
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
function updateBrand({ logo_text = '', logo_accent = '' } = {}) {
  const el = $('#adminBrand');
  if (!el || !(logo_text || logo_accent)) return;
  el.replaceChildren(logo_text, h('span', {}, logo_accent), ' ', h('small', {}, 'Admin'));
}

async function save() {
  if (!state.dirty) return;
  if(state.current==='header') {
    const conflict=NavLinks.duplicate(state.draft.content.nav,location.origin);
    if(conflict){conflict.indexes.forEach(index=>state.open.add('nav.'+index));renderEditor();toast(conflict.message,true);return;}
  }
  const btn = $('#saveBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving & translating…'; }
  let translation;
  try {
    if (state.current === 'settings') {
      const { settings } = await api('PUT', '/settings', { settings: state.draft });
      state.settings = settings;
      state.draft = clone(settings);
    } else if (state.current === 'page-settings') {
      const result = await api('PUT', '/pages/' + state.pageSlug, state.draft);
      const { page } = result; translation = result.translation;
      state.pages = state.pages.map(p => p.slug === page.slug ? page : p);
      state.draft = clone(page);
    } else {
      const { eyebrow, title, subtitle, is_visible, content } = state.draft;
      const result = await api('PUT', sectionApi(state.current), { name:state.draft.name, eyebrow, title, subtitle, is_visible, content });
      const { section } = result; translation = result.translation;
      if(result.pages)state.pages=result.pages;
      if(result.sections)state.sections=result.sections;
      replaceSection(section);
      state.draft = clone(section);
      if (section.section_key === 'header') updateBrand(section.content);
    }
    state.dirty = false;
    renderSidebar();
    renderEditor();
    reloadPreview();
    toast(translation?.status === 'pending' ? 'English saved. Translation is pending: ' + translation.message : 'Saved — translations are up to date', translation?.status === 'pending');
  } catch (e) {
    toast(e.message, true);
    if (btn) { btn.disabled = false; btn.textContent = 'Save changes'; }
  }
}

function discard() {
  if (state.dirty && !confirm('Discard your unsaved changes?')) return;
  state.draft = state.current === 'settings' ? clone(state.settings) : state.current === 'page-settings' ? clone(selectedPage()) : clone(sectionByKey(state.current));
  state.dirty = false;
  renderEditor();
}

async function toggleHistory(wrap) {
  const existing = wrap.querySelector('.history-menu');
  if (existing) return existing.remove();
  const menu = h('div', { class: 'history-menu' }, h('p', { class: 'muted small', style: 'padding:6px 8px' }, 'Loading…'));
  wrap.append(menu);
  try {
    const { revisions } = await api('GET', sectionApi(state.current) + '/revisions');
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
    const { section, translation } = await api('POST', sectionApi(state.current) + '/revisions/' + id + '/restore');
    replaceSection(section);
    state.draft = clone(section);
    state.dirty = false;
    renderSidebar();
    renderEditor();
    reloadPreview();
    toast(translation?.status === 'pending' ? 'Version restored. Translation is pending: ' + translation.message : 'Version restored — translations are up to date', translation?.status === 'pending');
  } catch (e) { toast(e.message, true); }
}

// ---------- Boot ----------
$('#pageSelect').addEventListener('change', e => selectPage(e.target.value));
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openItem(b.dataset.open)));
$('#sideToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

const layout = $('#layout');
const applyPreviewPref = hide => {
  layout.classList.toggle('no-preview', hide);
  $('#togglePreview').textContent = hide ? 'Show preview' : 'Hide preview';
};
try { applyPreviewPref(localStorage.getItem('lv55.hidePreview') === '1'); } catch { /* storage blocked */ }
$('#togglePreview').addEventListener('click', () => {
  const hide = !layout.classList.contains('no-preview');
  applyPreviewPref(hide);
  try { localStorage.setItem('lv55.hidePreview', hide ? '1' : '0'); } catch { /* storage blocked */ }
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
    Object.assign(state, { admin: data.admin, settings: data.settings, sections: data.sections, pages: data.pages || [], defaults: data.defaults, sectionTemplates:data.section_templates || [], contentBlocks:data.content_blocks || [], layoutDefaults:data.section_layout || {}, blockStyleDefaults:data.block_style || {} });
    const parts = location.hash.slice(1).split(':');
    const wanted = parts.length > 1 ? parts[1] : parts[0];
    const inferredSlug = sectionByKey(wanted)?.page_slug;
    const headerPages=pagesInHeaderOrder();
    state.pageSlug = headerPages.some(p => p.slug === parts[0]) ? parts[0] : headerPages.some(p => p.slug === inferredSlug) ? inferredSlug : headerPages[0]?.slug || 'home';
    openItem(['settings', 'page-settings'].includes(wanted) || (sectionByKey(wanted)?.is_fixed||sectionByKey(wanted)?.page_slug===state.pageSlug) ? wanted : pageSections()[0]?.section_key || 'page-settings');
  } catch (e) {
    editor.replaceChildren(h('div', { class: 'empty' }, 'Could not load content: ' + e.message));
  }
})();

// ---------- Homepage section builder ----------
const builderDialog = $('#sectionBuilderDialog');
$('#closeSectionBuilder').addEventListener('click',()=>builderDialog.close());
$('#addSectionBtn').addEventListener('click',()=>createHomeSection({template:'builder_section'}));
$('#sectionTemplatesBtn').addEventListener('click',()=>showSectionLibrary(false));
$('#removedSectionsBtn').addEventListener('click',()=>showSectionLibrary(true));
async function showSectionLibrary(removed) {
  builderDialog.classList.remove('content-picker-dialog');
  $('#sectionBuilderTitle').textContent = removed ? 'Removed sections' : 'Add a section';
  const container = $('#sectionBuilderContent');
  container.replaceChildren(h('p',{class:'muted'},'Loading…'));
  builderDialog.showModal();
  try {
    const data = await api('GET','/pages/'+state.pageSlug+'/section-builder');
    if (removed) {
      container.replaceChildren(h('p',{class:'muted small'},'Restore a section as hidden, then review it before showing it to visitors.'),
        ...(data.archived.length ? data.archived.map(section=>h('div',{class:'builder-removed'},h('strong',{},section.name),h('button',{class:'btn',onclick:()=>restoreRemovedSection(section)},'Restore'))) : [h('p',{class:'muted'},'No removed sections.')]) );
    } else {
      const icons={builder_text:'¶',builder_image:'▧',builder_cards:'▦',builder_faq:'?',builder_table:'☷',builder_cta:'→'};
      container.replaceChildren(h('p',{class:'muted small',style:'margin-bottom:16px'},'Choose a layout. Edit its content and preview it before making it visible.'),
        h('div',{class:'builder-template-grid'},...data.templates.map(template=>h('button',{class:'btn builder-template',onclick:()=>createHomeSection({template:template.template})},h('span',{class:'builder-template-art','aria-hidden':'true'},icons[template.template]),h('strong',{},template.name),h('small',{},template.description)))));
    }
  } catch(error) { container.replaceChildren(h('p',{class:'form-error'},error.message)); }
}
function canLeaveDraft() { return !state.dirty || confirm('Discard unsaved changes before continuing?'); }
function selectBuilderResult(section) {
  const index=state.sections.findIndex(item=>item.section_key===section.section_key);
  if(index<0)state.sections.push(section); else state.sections[index]=section;
  state.sections.sort((a,b)=>a.sort_order-b.sort_order);
  state.pageSlug=section.page_slug;state.dirty=false;state.current=null;
  builderDialog.close();
  openItem(section.section_key);
  $('#layout').classList.remove('no-preview');$('#togglePreview').textContent='Hide preview';
  try { localStorage.setItem('lv55.hidePreview','0'); } catch { /* storage unavailable */ }
}
async function createHomeSection(body) {
  if(!canLeaveDraft())return;
  const buttons=[...builderDialog.querySelectorAll('button')];buttons.forEach(button=>button.disabled=true);
  try {
    const result=await api('POST','/pages/'+state.pageSlug+'/sections',body);
    selectBuilderResult(result.section);
    toast(result.translation?.status==='pending' ? 'Section created. Translation is pending.' : 'Section created as hidden. Enable “Show this section on this page” and save to display it.');
  } catch(error) {toast(error.message,true);} finally {buttons.forEach(button=>button.disabled=false);}
}
async function duplicateSection(section) {
  if(!canLeaveDraft())return;
  try {const result=await api('POST','/pages/'+state.pageSlug+'/sections',{source_key:section.section_key});selectBuilderResult(result.section);toast('Section duplicated as hidden.');}catch(error){toast(error.message,true);}
}
async function removeSection(section) {
  if(!confirm('Delete “'+section.name+'” from this page? You can restore it from Removed sections. Unsaved changes to this section will be discarded.'))return;
  try {const result=await api('DELETE','/pages/'+state.pageSlug+'/sections/'+section.section_key);state.sections=result.sections;state.dirty=false;state.current=null;openItem(pageSections()[0]?.section_key || 'page-settings');toast('Section removed. You can restore it from Removed sections.');}catch(error){toast(error.message,true);}
}
async function restoreRemovedSection(section) {
  if(!canLeaveDraft())return;
  try {const result=await api('POST','/pages/'+state.pageSlug+'/sections/'+section.section_key+'/unarchive');selectBuilderResult(result.section);toast('Section restored as hidden.');}catch(error){toast(error.message,true);}
}

// Spreadsheet-style editor: column changes always keep every row aligned.
function tableEditor(content) {
  const redraw=()=>{markDirty();renderEditor();};
  function moveColumn(index,direction) {
    const target=index+direction;
    [content.columns[index],content.columns[target]]=[content.columns[target],content.columns[index]];
    for(const row of content.rows)[row[index],row[target]]=[row[target],row[index]];
    redraw();
  }
  return h('div',{class:'table-editor'},
    h('p',{class:'muted small'},'Edit headings and cells directly. Add, remove or move columns and rows. Maximum 12 columns and 200 rows.'),
    h('div',{class:'table-editor-scroll'},h('table',{},
      h('thead',{},h('tr',{},h('th',{},'Row'),...content.columns.map((column,index)=>h('th',{},
        h('input',{type:'text',value:column,'aria-label':'Column '+(index+1)+' heading',oninput:event=>{content.columns[index]=event.target.value;markDirty();}}),
        h('div',{class:'table-cell-actions'},
          h('button',{class:'icon-btn',title:'Move column left','aria-label':'Move column '+(index+1)+' left',disabled:index===0,onclick:()=>moveColumn(index,-1)},'←'),
          h('button',{class:'icon-btn',title:'Move column right','aria-label':'Move column '+(index+1)+' right',disabled:index===content.columns.length-1,onclick:()=>moveColumn(index,1)},'→'),
          h('button',{class:'icon-btn danger',title:'Delete column','aria-label':'Delete column '+(index+1),disabled:content.columns.length===1,onclick:()=>{if(!confirm('Delete this column and all its cells? You can discard before saving or restore an earlier version from History.'))return;content.columns.splice(index,1);content.rows.forEach(row=>row.splice(index,1));redraw();}},'×')
        )
      )),h('th',{},'Actions'))),
      h('tbody',{},...content.rows.map((row,rowIndex)=>h('tr',{},h('th',{scope:'row'},String(rowIndex+1)),...row.map((cell,columnIndex)=>h('td',{},h('textarea',{rows:'2',value:cell,'aria-label':'Row '+(rowIndex+1)+', column '+(columnIndex+1),oninput:event=>{content.rows[rowIndex][columnIndex]=event.target.value;markDirty();}}))),h('td',{},h('div',{class:'table-cell-actions'},
        h('button',{class:'icon-btn','aria-label':'Move row '+(rowIndex+1)+' up',disabled:rowIndex===0,onclick:()=>{[content.rows[rowIndex],content.rows[rowIndex-1]]=[content.rows[rowIndex-1],content.rows[rowIndex]];redraw();}},'↑'),
        h('button',{class:'icon-btn','aria-label':'Move row '+(rowIndex+1)+' down',disabled:rowIndex===content.rows.length-1,onclick:()=>{[content.rows[rowIndex],content.rows[rowIndex+1]]=[content.rows[rowIndex+1],content.rows[rowIndex]];redraw();}},'↓'),
        h('button',{class:'icon-btn danger','aria-label':'Delete row '+(rowIndex+1),onclick:()=>{content.rows.splice(rowIndex,1);redraw();}},'×')
      )))))
    )),
    h('div',{class:'table-editor-actions'},
      h('button',{class:'btn',disabled:content.columns.length>=12,onclick:()=>{content.columns.push('New column');content.rows.forEach(row=>row.push(''));redraw();}},'+ Add column'),
      h('button',{class:'btn',disabled:content.rows.length>=200,onclick:()=>{content.rows.push(content.columns.map(()=>''));redraw();}},'+ Add row')
    )
  );
}

// A blank section holds an ordered list of independent content blocks.
function blocksEditor(content) {
  const redraw=()=>{markDirty();renderEditor();};
  return h('div',{class:'blocks-editor'},
    content.blocks.length ? null : h('div',{class:'blocks-empty'},h('strong',{},'Your section is blank'),h('p',{class:'muted'},'Add a heading, text, an image, cards, a table, FAQ or a button.')),
    ...content.blocks.map((block,index)=>{
      const definition=state.contentBlocks.find(item=>item.type===block.type);
      return h('div',{class:'content-block-editor'},h('div',{class:'content-block-toolbar'},h('h3',{},(index+1)+'. '+definition.name),
        h('div',{class:'section-tool-buttons'},
          h('button',{class:'btn sm','aria-label':'Move content '+(index+1)+' up',disabled:index===0,onclick:()=>{[content.blocks[index],content.blocks[index-1]]=[content.blocks[index-1],content.blocks[index]];redraw();}},'↑'),
          h('button',{class:'btn sm','aria-label':'Move content '+(index+1)+' down',disabled:index===content.blocks.length-1,onclick:()=>{[content.blocks[index],content.blocks[index+1]]=[content.blocks[index+1],content.blocks[index]];redraw();}},'↓'),
          h('button',{class:'btn sm','aria-label':'Duplicate content '+(index+1),onclick:()=>{content.blocks.splice(index+1,0,{...clone(block),id:crypto.randomUUID()});redraw();}},'Duplicate'),
          h('button',{class:'btn sm danger','aria-label':'Delete content '+(index+1),onclick:()=>{content.blocks.splice(index,1);redraw();}},'Delete')
        )),blockStyleEditor(block,index,content),block.type==='hero_visual'?heroVisualEditor(block,index):block.type==='table'?tableEditor(block.content):block.type==='heading'?h('div',{class:'grid2'},plainInput('Heading text',block.content.text,value=>{block.content.text=value;}),choiceInput('Heading level',block.content.level,[['h1','H1 — main page heading'],['h2','H2'],['h3','H3'],['h4','H4']],value=>{block.content.level=value;}),plainInput('Highlighted words',block.content.highlight||'',value=>{block.content.highlight=value;})):h('div',{class:'grid2'},buildFields(block.content,['blocks',index,'content'])));
    }),
    h('button',{class:'btn primary',disabled:content.blocks.length>=50,onclick:()=>showContentPicker(content,redraw)},'+ Add content')
  );
}

function showContentPicker(content,redraw) {
  $('#sectionBuilderTitle').textContent='Add content to this section';
  builderDialog.classList.add('content-picker-dialog');
  const search=h('input',{type:'search',placeholder:'Search content types…','aria-label':'Search content types','aria-controls':'contentTypeResults'});
  const results=h('div',{id:'contentTypeResults',class:'builder-template-grid content-type-results'});
  const status=h('p',{class:'muted small',role:'status','aria-live':'polite'});
  const definitions=[...state.contentBlocks].sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'}));
  const filter=()=>{
    const query=search.value.trim().toLowerCase();
    const matches=definitions.filter(definition=>(definition.name+' '+definition.type.replaceAll('_',' ')).toLowerCase().includes(query));
    status.textContent=matches.length+' content type'+(matches.length===1?'':'s')+' · A–Z';
    results.replaceChildren(...(matches.length?matches.map(definition=>h('button',{type:'button',class:'btn builder-template',onclick:()=>{
      content.blocks.push({id:crypto.randomUUID(),type:definition.type,content:clone(definition.content)});builderDialog.close();redraw();
    }},h('strong',{},definition.name))):[h('p',{class:'muted'},'No content types match your search.')]));
    results.scrollTop=0;
  };
  search.addEventListener('input',filter);
  $('#sectionBuilderContent').replaceChildren(h('label',{class:'field'},h('span',{},'Search content'),search),status,results);
  filter();builderDialog.showModal();search.focus();
}

function choiceInput(label,value,options,onChange) {
  return h('label',{class:'field'},h('span',{},label),h('select',{value,onchange:event=>{markDirty();onChange(event.target.value);}},...options.map(([key,text])=>h('option',{value:key,selected:String(value)===String(key)?'selected':null},text))));
}
function layoutColor(label,value,onChange) {
  return h('label',{class:'field'},h('span',{},label),h('div',{class:'layout-color'},h('input',{type:'color',value:value||'#0b1640','aria-label':label,oninput:event=>{onChange(event.target.value);markDirty();}}),h('button',{class:'btn sm',onclick:()=>{onChange('');markDirty();renderEditor();}},'Reset')));
}
function sectionLayoutEditor(content) {
  content.layout={...state.layoutDefaults,...content.layout};
  const settings=content.layout;
  const change=(key,value)=>{settings[key]=value;};
  return h('div',{class:'panel'},h('h2',{},'Section layout & appearance'),h('div',{class:'grid2'},
    choiceInput('Background style',settings.variant,[['plain','Plain'],['hero','Hero gradient']],value=>change('variant',value)),
    choiceInput('Columns',settings.columns,[[1,'1 column'],[2,'2 columns'],[3,'3 columns']],value=>{change('columns',Number(value));renderEditor();}),
    choiceInput('Content width',settings.width,[['narrow','Narrow'],['standard','Standard'],['wide','Wide']],value=>change('width',value)),
    choiceInput('Section spacing',settings.padding,[['small','Small'],['normal','Normal'],['large','Large']],value=>change('padding',value)),
    choiceInput('Space between blocks',settings.gap,[['small','Small'],['normal','Normal'],['large','Large']],value=>change('gap',value)),
    choiceInput('Section heading alignment',settings.align,[['left','Left'],['center','Center'],['right','Right']],value=>change('align',value)),
    choiceInput('Column vertical alignment',settings.vertical_align,[['start','Top'],['center','Middle'],['end','Bottom']],value=>change('vertical_align',value)),
    layoutColor('Section background colour',settings.background_color,value=>change('background_color',value)),
    layoutColor('Section text colour',settings.text_color,value=>change('text_color',value)),
    h('div',{class:'wide'},buildFields({background_image:settings.background_image},['layout']))
  ));
}
function blockStyleEditor(block,index,content) {
  const style={...state.blockStyleDefaults,...block.style};
  const change=(key,value)=>{style[key]=value;block.style=style;};
  const columns=Number(content.layout?.columns||1);
  return h('details',{class:'block-style-settings'},h('summary',{},'Layout & style'),h('div',{class:'grid2'},
    choiceInput('Block '+(index+1)+' placement',style.column,[['auto','Automatic'],...Array.from({length:Math.max(columns,Number(style.column)||0)},(_,i)=>[String(i+1),'Column '+(i+1)+(i>=columns?' (when available)':'')]),['full','Full-width row']],value=>change('column',value)),
    choiceInput('Block alignment',style.align,[['left','Left'],['center','Center'],['right','Right']],value=>change('align',value)),
    choiceInput('Block width',style.width,[['full','Fill column'],['narrow','Narrow']],value=>change('width',value)),
    choiceInput('Text size',style.font_size,[['small','Small'],['normal','Normal'],['large','Large']],value=>change('font_size',value)),
    choiceInput('Block padding',style.padding,[['none','None'],['small','Small'],['normal','Normal'],['large','Large']],value=>change('padding',value)),
    choiceInput('Corner style',style.radius,[['none','Square'],['normal','Rounded'],['round','More rounded']],value=>change('radius',value)),
    layoutColor('Block text colour',style.color,value=>change('color',value)),layoutColor('Block background colour',style.background,value=>change('background',value))
  ));
}


function heroVisualEditor(block,blockIndex) {
  const value=block.content;
  value.tags=value.tags.map((tag,index)=>typeof tag==='string'?{text:tag,style:{position:index===0?'top':'bottom',align:index===0?'left':'right',size:'normal',color:'',background:''}}:{text:tag.text,style:{position:index===0?'top':'bottom',align:index===0?'left':'right',size:'normal',color:'',background:'',...tag.style}});
  const prefix='hero-tag:'+block.id+':';
  const redraw=openIndex=>{
    for(const key of state.open)if(key.startsWith(prefix))state.open.delete(key);
    if(Number.isInteger(openIndex)&&openIndex>=0)state.open.add(prefix+openIndex);
    markDirty();renderEditor();
  };
  const panels=value.tags.map((tag,index)=>{
    const title=h('strong',{class:'hero-tag-title'},tag.text||'Untitled tag');
    const panel=h('details',{class:'hero-tag-editor',name:'hero-tags-'+block.id,open:state.open.has(prefix+index),'aria-label':'Tag '+(index+1),ontoggle:event=>{
      const target=event.currentTarget;if(!target.isConnected)return;
      if(target.open){
        for(const key of state.open)if(key.startsWith(prefix))state.open.delete(key);
        state.open.add(prefix+index);
        target.parentElement.querySelectorAll(':scope > details.hero-tag-editor').forEach(other=>{if(other!==target)other.open=false;});
        requestAnimationFrame(()=>{if(target.isConnected&&target.open)target.querySelector('summary').scrollIntoView({block:'nearest'});});
      }else state.open.delete(prefix+index);
    }},
      h('summary',{},h('span',{class:'muted small'},'Tag '+(index+1)),title),
      h('div',{class:'hero-tag-body'},
        h('div',{class:'tag-action-row'},
          h('button',{class:'btn sm','aria-label':'Move tag '+(index+1)+' up',disabled:index===0,onclick:()=>{[value.tags[index],value.tags[index-1]]=[value.tags[index-1],value.tags[index]];redraw(index-1);}},'↑'),
          h('button',{class:'btn sm','aria-label':'Move tag '+(index+1)+' down',disabled:index===value.tags.length-1,onclick:()=>{[value.tags[index],value.tags[index+1]]=[value.tags[index+1],value.tags[index]];redraw(index+1);}},'↓'),
          h('button',{class:'btn sm',onclick:()=>{value.tags.splice(index+1,0,clone(tag));redraw(index+1);}},'Duplicate'),
          h('button',{class:'btn sm danger','aria-label':'Delete tag '+(index+1),onclick:()=>{value.tags.splice(index,1);redraw();}},'Delete')
        ),
        plainInput('Tag '+(index+1)+' text',tag.text,text=>{tag.text=text;title.textContent=text||'Untitled tag';},'wide'),
        h('div',{class:'grid2'},
          choiceInput('Tag '+(index+1)+' position',tag.style.position,[['top','Top'],['middle','Middle'],['bottom','Bottom']],setting=>{tag.style.position=setting;}),
          choiceInput('Tag '+(index+1)+' alignment',tag.style.align,[['left','Left'],['center','Center'],['right','Right']],setting=>{tag.style.align=setting;}),
          choiceInput('Tag '+(index+1)+' size',tag.style.size,[['small','Small'],['normal','Normal'],['large','Large']],setting=>{tag.style.size=setting;}),
          layoutColor('Tag '+(index+1)+' text colour',tag.style.color,setting=>{tag.style.color=setting;}),
          layoutColor('Tag '+(index+1)+' background colour',tag.style.background,setting=>{tag.style.background=setting;})
        )
      )
    );return panel;
  });
  return h('div',{},h('p',{class:'muted small'},'Click a tag to edit it. Only the selected tag opens.'),...panels,
    h('button',{class:'btn',disabled:value.tags.length>=200,onclick:()=>{value.tags.push({text:'',style:{position:'bottom',align:'right',size:'normal',color:'',background:''}});redraw(value.tags.length-1);}},'+ Add tag'),
    h('div',{class:'grid2',style:'margin-top:20px'},buildFields({emoji:value.emoji,image:value.image,image_alt:value.image_alt},['blocks',blockIndex,'content']))
  );
}
