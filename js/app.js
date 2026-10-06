// ---------- Tab 切换（用 #hash，手机返回键也能用）----------
  const tabs = document.querySelectorAll('.tabbar a');
  const views = document.querySelectorAll('.view');

  function show(id) {
    if (!document.getElementById(id)) id = 'fish';
    views.forEach(v => v.classList.toggle('active', v.id === id));
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === id));
    window.scrollTo(0, 0);
  }
  // 直接监听点击切换，不依赖 #hash（有些手机预览/内嵌浏览器会拦截 hash 跳转）
  tabs.forEach(t => t.addEventListener('click', e => {
    e.preventDefault();
    show(t.dataset.tab);
    try { history.replaceState(null, '', '#' + t.dataset.tab); } catch (_) {}
  }));
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  let start = 'fish';
  try { start = location.hash.slice(1) || 'fish'; } catch (_) {}
  show(start);


  // ---------- 下拉：平滑展开 / 收起 ----------
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  document.querySelectorAll('details.method').forEach(d => {
    const sum = d.querySelector('summary');
    const dc = document.createElement('div'); dc.className = 'dc';
    while (sum.nextSibling) dc.appendChild(sum.nextSibling);
    d.appendChild(dc);
    let anim = null;
    sum.addEventListener('click', e => {
      e.preventDefault();
      if (anim) anim.cancel();
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!d.open) {
        d.open = true;
        const h = dc.scrollHeight;
        if (reduce) return;
        anim = dc.animate([{ height: '0px', opacity: 0, transform: 'translateY(-4px)' },
                           { height: h + 'px', opacity: 1, transform: 'none' }],
                          { duration: Math.min(380, 200 + h / 4), easing: EASE });
        anim.onfinish = () => anim = null;
      } else {
        if (reduce) { d.open = false; return; }
        const h = dc.offsetHeight;
        d.classList.add('closing');
        anim = dc.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
                          { duration: Math.min(300, 160 + h / 5), easing: EASE });
        anim.onfinish = () => { d.open = false; d.classList.remove('closing'); anim = null; };
        anim.oncancel = () => d.classList.remove('closing');
      }
    });
  });

  // ---------- 鱼种：排序 / 筛选 + 搜索 ----------
  const fishCards = [...document.querySelectorAll('#fish-list .fish')];
  const fishGroups = document.querySelectorAll('#fish-list .group');
  const sortedBox = document.getElementById('fish-sorted');
  const sortChip = document.getElementById('sort-chip');
  const searchBox = document.getElementById('fish-search');
  fishCards.forEach(c => { c._home = c.parentNode; c._next = null; });
  fishCards.forEach((c, i) => { c._order = i; });
  const SORTS = {
    default: { label: '默认分组' },
    rare:    { label: '稀有度排行', note: '岸边越难钓到的排越前面', key: 'rare', dir: -1 },
    taste:   { label: '好吃程度',   note: '越好吃的排越前面',       key: 'taste', dir: 1 },
    limited: { label: '有尺寸限制', group: 'limited' },
    free:    { label: '无尺寸限制', group: 'free' },
  };
  let curSort = 'default';
  function applyFish() {
    const q = searchBox.value.trim().toLowerCase();
    const S = SORTS[curSort];
    // 排序时把卡片平铺到一个列表里；其他情况放回原来的分组
    if (S.key) {
      fishCards.slice().sort((a, b) => S.dir * (a.dataset[S.key] - b.dataset[S.key]))
               .forEach(c => sortedBox.appendChild(c));
    } else {
      fishCards.forEach(c => c._home.appendChild(c));
    }
    sortedBox.hidden = !S.key;
    let shown = 0;
    fishCards.forEach(c => {
      const ok = (!S.group || c.dataset.group === S.group) && (!q || c.dataset.name.toLowerCase().includes(q));
      c.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });
    fishGroups.forEach(g => { g.style.display = g.querySelector('.fish:not([style*="none"])') ? '' : 'none'; });
    sortChip.hidden = curSort === 'default';
    document.getElementById('sort-label').textContent = S.note ? S.label + ' · ' + S.note : S.label;
    document.getElementById('fish-empty').hidden = shown > 0;
  }
  searchBox.addEventListener('input', applyFish);

  // 下拉菜单
  const sortBtn = document.getElementById('sort-btn');
  const sortMenu = document.getElementById('sort-menu');
  const sortOpts = sortMenu.querySelectorAll('.sort-opt');
  function setMenu(open) {
    sortMenu.hidden = !open;
    sortBtn.setAttribute('aria-expanded', open);
    sortBtn.classList.toggle('open', open);
    if (open) (sortMenu.querySelector('.sort-opt.on') || sortOpts[0]).focus({ preventScroll: true });
  }
  sortBtn.addEventListener('click', e => { e.stopPropagation(); setMenu(sortMenu.hidden); });
  function pickSort(k) {
    curSort = k;
    sortOpts.forEach(x => { const on = x.dataset.sort === k; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    sortBtn.classList.toggle('active', k !== 'default');
    setMenu(false);
    applyFish();
    const top = document.getElementById('fish-list').getBoundingClientRect().top + scrollY - 140;
    if (scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  }
  sortOpts.forEach(o => o.addEventListener('click', () => pickSort(o.dataset.sort)));
  sortChip.addEventListener('click', () => pickSort('default'));
  document.addEventListener('click', e => { if (!sortMenu.hidden && !e.target.closest('.sort-wrap')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sortMenu.hidden) { setMenu(false); sortBtn.focus(); } });

  // 每张卡片唯一的「详情」按钮：平滑展开 / 收起，默认全部展开
  const EASE2 = 'cubic-bezier(.2,.8,.2,1)';
  function setCard(c, open, animate = true) {
    const btn = c.querySelector('.fish-toggle'), more = c.querySelector('.fish-more');
    if (c.classList.contains('is-open') === open) return;
    btn.setAttribute('aria-expanded', open);
    btn.setAttribute('aria-label', open ? '收起详情' : '展开详情');
    if (more._anim) more._anim.cancel();
    const reduce = !animate || matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (open) {
      c.classList.add('is-open');
      if (reduce) return;
      const h = more.scrollHeight;
      more._anim = more.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }],
                                { duration: Math.min(360, 180 + h / 4), easing: EASE2 });
      more._anim.onfinish = () => more._anim = null;
    } else {
      if (reduce) { c.classList.remove('is-open'); return; }
      const h = more.offsetHeight;
      c.classList.add('closing');
      more._anim = more.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
                                { duration: Math.min(300, 160 + h / 5), easing: EASE2 });
      more._anim.onfinish = () => { c.classList.remove('is-open', 'closing'); more._anim = null; };
      more._anim.oncancel = () => c.classList.remove('closing');
    }
  }
  // 右上角「展开 / 收起」：一次操作所有卡片
  const allBtn = document.getElementById('all-toggle');
  function syncAll() {
    const anyOpen = fishCards.some(c => c.classList.contains('is-open'));
    allBtn.querySelector('.eb-text').textContent = anyOpen ? '收起' : '展开';
    allBtn.classList.toggle('is-open', anyOpen);
    allBtn.setAttribute('aria-pressed', anyOpen);
    allBtn.setAttribute('aria-label', anyOpen ? '全部收起' : '全部展开');
  }
  fishCards.forEach(c => c.querySelector('.fish-toggle').addEventListener('click', () => {
    setCard(c, !c.classList.contains('is-open')); syncAll();
  }));
  allBtn.addEventListener('click', () => {
    const open = !allBtn.classList.contains('is-open');
    fishCards.forEach(c => setCard(c, open, false));
    syncAll();
  });
  syncAll();


  // ---------- 鱼照片：Wikimedia Commons 免费授权图片，直接用图片地址加载 ----------
  const FP = 'https://en.wikipedia.org/wiki/Special:FilePath/';
  const photoCards = [...document.querySelectorAll('.fish[data-photo]')];
  const photos = {};
  photoCards.forEach(c => {
    const f = encodeURIComponent(c.dataset.photo);
    photos[c.dataset.wiki] = c.dataset.local
      ? { thumb: c.dataset.localThumb || c.dataset.local, big: c.dataset.local, local: true, catchBy: c.dataset.catch }   // 自己的照片，放在 images/
      : c.dataset.url
      ? { thumb: c.dataset.url, big: c.dataset.url, credit: c.dataset.credit, creditLink: c.dataset.creditLink }   // 其他网站的图片，注明来源
      : { thumb: FP + f + '?width=240', big: FP + f + '?width=1200', file: c.dataset.photo, page: c.dataset.wiki };
    const btn = c.querySelector('.avatar');
    const img = new Image();
    img.alt = c.querySelector('h3').textContent;
    img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
    if (c.dataset.pos) img.style.objectPosition = c.dataset.pos;   // 小图裁切位置
    if (c.dataset.fit === 'contain') {   // 横长的网络图：整条鱼缩进框里，空白处用同一张图模糊填满
      btn.classList.add('fit-contain'); btn.style.setProperty('--thumb', 'url("' + photos[c.dataset.wiki].thumb + '")');
    }
    img.onload = () => { const p = btn.querySelector('.ph'); if (p) p.remove(); btn.classList.add('has-img'); };
    img.onerror = () => img.remove();   // 加载失败就保留 🐟
    img.src = photos[c.dataset.wiki].thumb;
    btn.prepend(img);
  });
  // 没有照片的鱼：不能点
  document.querySelectorAll('.fish:not([data-photo]) .avatar').forEach(b => { b.disabled = true; b.style.cursor = 'default'; });

  // ---------- 点击看大图 ----------
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  function openLB(card) {
    const ph = photos[card.dataset.wiki];
    if (!ph) return;
    document.getElementById('lb-title').innerHTML =
      card.querySelector('h3').textContent + '<small>' + card.querySelector('.en').textContent + '</small>';
    lbImg.innerHTML = '<div class="lb-loading">加载大图中…</div>';
    const img = new Image();
    img.alt = card.querySelector('h3').textContent;
    img.referrerPolicy = 'no-referrer';
    img.onload = () => { lbImg.innerHTML = ''; lbImg.appendChild(img); };
    img.onerror = () => { lbImg.innerHTML = '<div class="lb-loading">大图加载失败，请检查网络</div>'; };
    img.src = ph.big;
    if (ph.local) document.getElementById('lb-credit').textContent = ph.catchBy ? '图片来源：' + ph.catchBy : '';
    else if (ph.credit) {
      const cr = document.getElementById('lb-credit'); cr.textContent = '图片来源：';
      const a = document.createElement('a'); a.href = ph.creditLink || ph.big; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = ph.credit; cr.appendChild(a);
    }
    else {
      const fileLink = 'https://en.wikipedia.org/wiki/File:' + encodeURIComponent(ph.file);
      document.getElementById('lb-credit').innerHTML =
        '图片来源：<a href="' + fileLink + '" target="_blank" rel="noopener">Wikimedia Commons</a>（作者与授权见原页）';
    }
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLB() { lb.classList.remove('open'); document.body.style.overflow = ''; }
  photoCards.forEach(c => c.querySelector('.avatar').addEventListener('click', () => { if (c.querySelector('.avatar').classList.contains('has-img')) openLB(c); }));
  document.getElementById('lb-close').onclick = closeLB;
  lbImg.addEventListener('click', e => { if (e.target === lbImg) closeLB(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLB(); });

  // ---------- 钓点右上角天气（Open-Meteo 免费，一次请求所有钓点）----------
  (async () => {
    const tags = [...document.querySelectorAll('.wx[data-lat]')];
    if (!tags.length) return;
    const icon = c => c === 0 ? '☀️' : c <= 2 ? '🌤️' : c === 3 ? '☁️' : c <= 48 ? '🌫️'
                   : c <= 67 || (c >= 80 && c <= 82) ? '🌧️' : c <= 77 ? '🌨️' : '⛈️';
    const url = 'https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code'
      + '&temperature_unit=fahrenheit&latitude=' + tags.map(t => t.dataset.lat).join(',')
      + '&longitude=' + tags.map(t => t.dataset.lon).join(',');
    const paint = d => tags.forEach((t, i) => {
      const c = d[i] && d[i].current; if (!c) return;
      t.querySelector('.wx-i').textContent = icon(c.weather_code);
      t.querySelector('.wx-t').textContent = Math.round(c.temperature_2m) + '°';
    });
    // 先显示上次的气温（3 小时内），避免一直显示「天气」
    const KEY = 'wx-cache:' + url;
    try {
      const old = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (old && Date.now() - old.t < 3 * 3600e3) paint(old.d);
    } catch (_) {}
    async function load() {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 8000);
      try {
        const r = await fetch(url, { signal: ctl.signal });
        if (!r.ok) throw new Error(r.status);
        let d = await r.json();
        if (!Array.isArray(d)) d = [d];
        return d;
      } finally { clearTimeout(timer); }
    }
    try {
      let d;
      try { d = await load(); } catch (_) { await new Promise(r => setTimeout(r, 1500)); d = await load(); }
      paint(d);
      try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d })); } catch (_) {}
    } catch (_) { /* 没网就显示「天气」，点了照样能看 */ }
  })();

  // ---------- 导航 / 鱼饵店：底部弹出选择 Apple 或 Google 地图 ----------
  const sheet = document.getElementById('sheet'), mask = document.getElementById('sheet-mask');
  let sheetBtn = null;
  function openSheet(btn) {
    sheetBtn = btn;
    const d = btn.dataset, $ = id => document.getElementById(id);
    $('sheet-title').textContent = d.title;
    $('sheet-addr').textContent = d.addr || '';
    $('sheet-apple').href = d.apple;
    $('sheet-google').href = d.google;
    $('sheet-bait').href = d.baitGoogle && /iPhone|iPad|Mac/.test(navigator.userAgent) ? d.baitApple : d.baitGoogle;
    const ferry = $('sheet-ferry');
    ferry.hidden = !d.ferryGoogle;
    if (d.ferryGoogle) ferry.href = /iPhone|iPad|Mac/.test(navigator.userAgent) ? d.ferryApple : d.ferryGoogle;
    clearTimeout(sheetT);
    sheet.hidden = false; mask.hidden = false;
    sheet.offsetHeight;   // 先显示，再触发滑入动画
    sheet.classList.add('open'); mask.classList.add('open');
  }
  let sheetT;
  function closeSheet() {
    sheet.classList.remove('open'); mask.classList.remove('open');
    clearTimeout(sheetT);
    sheetT = setTimeout(() => { sheet.hidden = true; mask.hidden = true; }, 340);
  }
  document.querySelectorAll('.sheet-btn').forEach(b => b.addEventListener('click', () => openSheet(b)));
  mask.onclick = closeSheet;
  document.getElementById('sheet-cancel').onclick = closeSheet;
  document.querySelectorAll('a.sheet-opt').forEach(a => a.addEventListener('click', () => setTimeout(closeSheet, 300)));

  // ---------- 复制地址 + 提示 ----------
  const toastEl = document.getElementById('toast');
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false; toastEl.offsetHeight; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => {
      toastEl.classList.remove('show'); toastT = setTimeout(() => toastEl.hidden = true, 250);
    }, 1600);
  }
  document.getElementById('sheet-copy').onclick = async () => {
    const text = sheetBtn ? sheetBtn.dataset.addr : '';
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (_) {
      const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', '');
      t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
      try { ok = document.execCommand('copy'); } catch (_) {} t.remove();
    }
    closeSheet(); toast(ok ? '已复制地址' : '复制失败，请长按地址手动复制');
  };


  // ---------- 钓点详情页：从右侧推入，支持返回键 / 右滑返回 ----------
  (() => {
    let cur = null, closeT;
    const root = document.documentElement;
    function openDetail(id, push = true) {
      const d = document.getElementById(id); if (!d || cur === d) return;
      clearTimeout(closeT);
      cur = d; d.hidden = false; d.offsetHeight;
      d.classList.add('open'); root.classList.add('lock');
      d.querySelector('.detail-scroll').scrollTop = 0; d.classList.remove('scrolled');
      if (push) history.pushState({ detail: id }, '');
      setTimeout(() => d.querySelector('.detail-back').focus({ preventScroll: true }), 350);
    }
    function closeDetail(fromPop = false) {
      if (!cur) return;
      if (!fromPop && history.state && history.state.detail) { history.back(); return; }
      const d = cur; cur = null;
      d.classList.remove('open', 'dragging'); d.style.transform = '';
      root.classList.remove('lock');
      closeT = setTimeout(() => { d.hidden = true; }, 360);
    }
    try { history.scrollRestoration = 'manual'; } catch (_) {}  // 返回时别让浏览器自己改滚动位置
    window.addEventListener('popstate', () => { if (cur) closeDetail(true); });
    document.querySelectorAll('[data-detail]').forEach(b => {
      b.addEventListener('click', e => { if (e.target.closest('a, button')) return; openDetail(b.dataset.detail); });
      b.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === b) { e.preventDefault(); openDetail(b.dataset.detail); } });
    });
    document.querySelectorAll('.detail').forEach(d => {
      d.querySelector('.detail-back').addEventListener('click', () => closeDetail());
      const sc = d.querySelector('.detail-scroll');
      sc.addEventListener('scroll', () => d.classList.toggle('scrolled', sc.scrollTop > 40), { passive: true });


      // 手指往右拖：跟手滑出，松手超过 1/3 就返回
      let x0 = 0, y0 = 0, dx = 0, mode = '';
      d.addEventListener('touchstart', e => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; dx = 0; mode = ''; }, { passive: true });
      d.addEventListener('touchmove', e => {
        const t = e.touches[0], mx = t.clientX - x0, my = t.clientY - y0;
        if (!mode) { if (Math.abs(mx) < 10 && Math.abs(my) < 10) return; mode = (mx > 0 && Math.abs(mx) > Math.abs(my) * 1.5 && x0 < innerWidth * .5) ? 'x' : 'y'; }
        if (mode !== 'x') return;
        dx = Math.max(0, mx); d.classList.add('dragging'); d.style.transform = 'translateX(' + dx + 'px)';
      }, { passive: true });
      d.addEventListener('touchend', () => {
        if (mode !== 'x') return;
        d.classList.remove('dragging'); d.style.transform = '';
        if (dx > innerWidth / 3) closeDetail();
      });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && cur && !document.getElementById('lightbox').classList.contains('open')
          && !document.getElementById('sheet').classList.contains('open')) closeDetail();
    });
  })();

  // ---------- 图解点击放大（复用大图查看器）----------
  document.querySelectorAll('.zoomable').forEach(b => b.addEventListener('click', () => {
    const lbImg = document.getElementById('lb-img');
    document.getElementById('lb-title').innerHTML = b.dataset.title + '<small>' + (b.dataset.sub || '') + '</small>';
    lbImg.innerHTML = '';
    const img = new Image(); img.src = b.querySelector('img').src; img.alt = b.dataset.title;
    lbImg.appendChild(img);
    document.getElementById('lb-credit').textContent = '';
    document.getElementById('lightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
  }));

  // ---------- 钓法页筛选 ----------
  const howBtns = document.querySelectorAll('#how-filters button');
  howBtns.forEach(btn => btn.onclick = () => {
    howBtns.forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const k = btn.dataset.k;
    document.querySelectorAll('.how-card, .how-group').forEach(el => {
      const kk = el.dataset.kind || el.dataset.k;
      el.style.display = (k === 'all' || kk === k) ? '' : 'none';
    });
  });
  const howOn = document.querySelector('#how-filters button.on'); if (howOn) howOn.click();
