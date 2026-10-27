const publicLocale = document.documentElement.lang.startsWith('ms') ? 'ms' : document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
const publicLabels = { en: { game:'game', games:'games', won:'You won' }, ms: {game:'permainan',games:'permainan',won:'Anda menang'}, zh:{game:'款游戏',games:'款游戏',won:'你获得了'} }[publicLocale];
// Mobile menu
const nav = document.getElementById('nav');
const menuBtn = document.getElementById('menuBtn');
if (nav && menuBtn) {
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  nav.querySelectorAll('ul a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
}

// Scroll reveal + animated counters
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    if (e.target.dataset.count) countUp(e.target);
    io.unobserve(e.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal, [data-count]').forEach(el => io.observe(el));

function countUp(el) {
  const target = +el.dataset.count;
  const suffix = el.dataset.suffix || '';
  const start = performance.now(), dur = 1500;
  const tick = now => {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.floor(target * (1 - Math.pow(1 - p, 3))).toLocaleString('en-MY') + (p === 1 ? suffix : '');
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Countdown to the date set in the admin
document.querySelectorAll('.timer[data-target]').forEach(timer => {
  const end = Date.parse(timer.dataset.target);
  if (Number.isNaN(end)) return;
  const unit = u => timer.querySelector(`[data-unit="${u}"]`);
  const pad = n => String(n).padStart(2, '0');
  const update = () => {
    const t = Math.max(0, end - Date.now());
    unit('d').textContent = pad(Math.floor(t / 864e5));
    unit('h').textContent = pad(Math.floor(t / 36e5) % 24);
    unit('m').textContent = pad(Math.floor(t / 6e4) % 60);
    unit('s').textContent = pad(Math.floor(t / 1e3) % 60);
  };
  update();
  setInterval(update, 1000);
});

// Daily bonus wheel (prizes come from the database)
const wheel = document.getElementById('wheel');
const spinBtn = document.getElementById('spinBtn');
const spinOut = document.getElementById('spinResult');
if (wheel && spinBtn) {
  const prizes = JSON.parse(spinBtn.dataset.prizes || '[]');
  const seg = 360 / prizes.length;
  let rot = 0;
  spinBtn.addEventListener('click', () => {
    spinBtn.disabled = true;
    spinOut.textContent = '';
    const idx = Math.floor(Math.random() * prizes.length);
    // Rotate so the centre of segment `idx` ends under the top pointer.
    rot += 360 * 5 + (360 - (idx * seg + seg / 2)) - (rot % 360);
    wheel.style.transform = `rotate(${rot}deg)`;
    setTimeout(() => {
      spinOut.textContent = `🎉 ${publicLabels.won}: ${prizes[idx]}!`;
      spinBtn.disabled = false;
    }, 4100);
  });
}

// Popular Games: progressive enhancement keeps every card readable without JavaScript.
const gameFilters = document.querySelectorAll('[data-game-filter]');
const gameCards = document.querySelectorAll('[data-game-category]');
gameFilters.forEach(button => button.addEventListener('click', () => {
  const category = button.dataset.gameFilter;
  let count = 0;
  gameCards.forEach(card => { card.hidden = !!category && card.dataset.gameCategory !== category; if (!card.hidden) count++; });
  gameFilters.forEach(filter => { const active = filter === button; filter.classList.toggle('active', active); filter.setAttribute('aria-pressed', String(active)); });
  const status = document.getElementById('gamesCount');
  if (status) status.textContent = count + ' ' + (count === 1 ? publicLabels.game : publicLabels.games);
}));
