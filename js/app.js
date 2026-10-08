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


  // ---------- 钓点详情页：从右侧推入，支持返回键 / 右滑返回（可以叠加打开）----------
  (() => {
    const stack = [];
    const root = document.documentElement;
    const top = () => stack[stack.length - 1];
    function openDetail(id, push = true) {
      const d = document.getElementById(id); if (!d || stack.includes(d)) return;
      clearTimeout(d._closeT);
      stack.push(d);
      d.style.zIndex = 34 + stack.length;
      d.hidden = false; d.offsetHeight;
      d.classList.add('open'); root.classList.add('lock');
      d.querySelector('.detail-scroll').scrollTop = 0; d.classList.remove('scrolled');
      if (push) history.pushState({ detail: id }, '');
      setTimeout(() => d.querySelector('.detail-back').focus({ preventScroll: true }), 350);
    }
    function closeDetail(fromPop = false) {
      const d = top(); if (!d) return;
      if (!fromPop && history.state && history.state.detail) { history.back(); return; }
      stack.pop();
      d.classList.remove('open', 'dragging'); d.style.transform = '';
      if (!stack.length) root.classList.remove('lock');
      d._closeT = setTimeout(() => { d.hidden = true; }, 360);
    }
    window.openDetail = openDetail;
    try { history.scrollRestoration = 'manual'; } catch (_) {}  // 返回时别让浏览器自己改滚动位置
    window.addEventListener('popstate', () => { if (stack.length) closeDetail(true); });
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
      d.addEventListener('touchstart', e => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; dx = 0; mode = e.target.closest('.fc-x, .fc-days') ? 'skip' : ''; }, { passive: true });
      d.addEventListener('touchmove', e => {
        const t = e.touches[0], mx = t.clientX - x0, my = t.clientY - y0;
        if (mode === 'skip') return;
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
      if (e.key === 'Escape' && stack.length && !document.getElementById('lightbox').classList.contains('open')
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

  // =====================================================================
  // 7 天天气 · 潮汐：温度、风（NWS）+ 潮汐（NOAA）+ 日出日落（本地计算）
  // 三行共用一条时间轴，一起左右滑动；点任一列看那个小时的全部信息
  // =====================================================================
  (() => {
    // 每个钓点用的坐标和最近的 NOAA 潮汐站
    const SPOTS = {
      '288new': { name: '288 新堤', lat: 28.944, lon: -95.293, st: '8772447', stName: 'Freeport' },
      '288old': { name: '288 旧堤', lat: 28.933, lon: -95.306, st: '8772447', stName: 'Freeport' },
      'seawolf': { name: '海狼公园', lat: 29.334, lon: -94.779, st: '8771450', stName: 'Galveston Pier 21' },
      '91':     { name: '91 街', lat: 29.262, lon: -94.84,  st: '8771510', stName: 'Galveston Pleasure Pier' },
      '61':     { name: '61 街', lat: 29.274, lon: -94.816, st: '8771510', stName: 'Galveston Pleasure Pier' },
      '17':     { name: '17 街', lat: 29.372, lon: -94.76,  st: '8771341', stName: 'Galveston Bay Entrance, North Jetty' },
      'tcd':    { name: 'TCD',   lat: 29.375, lon: -94.86,  st: '8771450', stName: 'Galveston Pier 21' },
    };
    const TZ = 'America/Chicago';
    const HOUR = 3600e3, DAYS = 7;
    const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const $ = id => document.getElementById(id);
    const page = $('detail-fc');

    // ---------- 时间工具：统一按休斯顿时间显示 ----------
    const fmtParts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: false, weekday: 'short' });
    function parts(t) {
      const o = {}; fmtParts.formatToParts(new Date(t)).forEach(p => o[p.type] = p.value);
      const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday);
      return { y: +o.year, m: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute, wd, key: o.year + '-' + o.month + '-' + o.day };
    }
    const hm = t => { const p = parts(t); const ap = p.h < 12 ? 'AM' : 'PM'; return ((p.h + 11) % 12 + 1) + ':' + String(p.mi).padStart(2, '0') + ' ' + ap; };
    const hLabel = h => ((h + 11) % 12 + 1) + (h < 12 ? ' AM' : ' PM');

    // ---------- localStorage 缓存（读写失败就当没缓存） ----------
    function cget(k, maxAge) {
      try { const o = JSON.parse(localStorage.getItem(k) || 'null'); if (o && Date.now() - o.t < maxAge) return o; } catch (_) {}
      return null;
    }
    function cset(k, d) { try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), d })); } catch (_) {} }
    async function getJSON(url, headers) {
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 12000);
      try {
        const r = await fetch(url, { headers, signal: ctl.signal });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
      } finally { clearTimeout(tm); }
    }
    const retry = async (fn) => { try { return await fn(); } catch (_) { await new Promise(r => setTimeout(r, 1200)); return fn(); } };

    // ---------- NWS：逐小时温度、天气 + 原始网格数据里的精确风速风向 ----------
    // 逐小时预报（forecastHourly）里的风速是给普通人看的，按 5 mph 取整，常写成「5 to 10 mph」；
    // 同一个网格点的原始数据（forecastGridData）是不取整的数值，所以风速、风向从那里取。
    const DUR = s => { const m = /P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/.exec(s) || []; return ((+m[1] || 0) * 24 + (+m[2] || 0) + (+m[3] || 0) / 60) * HOUR; };
    function gridHours(prop, conv) {           // 把「起始时间/持续多久」展开成每个整点一个值
      const out = {};
      ((prop && prop.values) || []).forEach(v => {
        if (v.value == null) return;
        const [st, du] = v.validTime.split('/');
        const t0 = Date.parse(st), t1 = t0 + DUR(du);
        for (let t = Math.ceil(t0 / HOUR) * HOUR; t < t1; t += HOUR) out[t] = conv(v.value);
      });
      return out;
    }
    const toMph = uom => /m_s/.test(uom || '') ? v => v * 2.23694 : /km_h/.test(uom || '') ? v => v * 0.621371 : v => v;
    const degToDir = d => DIRS[Math.round(((d % 360) + 360) % 360 / 22.5) % 16];

    async function loadNWS(sp) {
      const k = 'nws2:' + sp.lat + ',' + sp.lon;
      const fresh = cget(k, HOUR); if (fresh) return { periods: fresh.d, at: fresh.t };
      try {
        const H = { Accept: 'application/geo+json' };
        const pk = 'nwspt2:' + sp.lat + ',' + sp.lon;
        let urls = (cget(pk, 30 * 24 * HOUR) || {}).d;
        if (!urls) {
          const pt = await retry(() => getJSON('https://api.weather.gov/points/' + sp.lat + ',' + sp.lon, H));
          urls = { hourly: pt.properties.forecastHourly, grid: pt.properties.forecastGridData }; cset(pk, urls);
        }
        const [fc, grid] = await Promise.all([
          retry(() => getJSON(urls.hourly, H)),
          urls.grid ? retry(() => getJSON(urls.grid, H)).catch(() => null) : null,   // 网格数据失败就退回逐小时预报的风
        ]);
        const gp = grid && grid.properties;
        const ws = gp ? gridHours(gp.windSpeed, toMph(gp.windSpeed && gp.windSpeed.uom)) : {};
        const wd = gp ? gridHours(gp.windDirection, v => v) : {};
        const periods = fc.properties.periods.map(p => {
          const t = Date.parse(p.startTime);
          const fallback = (String(p.windSpeed).match(/\d+/g) || [0]).map(Number);
          return {
            t, temp: p.temperature, f: p.shortForecast, day: p.isDaytime,
            wind: ws[t] != null ? Math.round(ws[t]) : Math.round(fallback.reduce((a, b) => a + b, 0) / fallback.length),
            dir: wd[t] != null ? degToDir(wd[t]) : p.windDirection,
            pop: p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value,
          };
        });
        cset(k, periods);
        return { periods, at: Date.now() };
      } catch (e) {
        const stale = cget(k, 12 * HOUR);           // 联网失败：用 12 小时内的旧数据
        if (stale) return { periods: stale.d, at: stale.t, stale: true };
        throw e;
      }
    }

    // ---------- NOAA：高低潮时间，中间用余弦插值画曲线 ----------
    async function loadTide(sp) {
      const now = new Date(), y = new Date(now.getTime() - 24 * HOUR);
      const begin = y.getUTCFullYear() + String(y.getUTCMonth() + 1).padStart(2, '0') + String(y.getUTCDate()).padStart(2, '0');
      const k = 'tide:' + sp.st + ':' + begin;
      const c = cget(k, 12 * HOUR); if (c) return c.d;
      const url = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=houston_fishing'
        + '&begin_date=' + begin + '&range=240&datum=MLLW&station=' + sp.st + '&time_zone=gmt&units=english&interval=hilo&format=json';
      const j = await retry(() => getJSON(url));
      if (!j.predictions) throw new Error((j.error && j.error.message) || 'no tide data');
      const pts = j.predictions.map(p => ({ t: Date.parse(p.t.replace(' ', 'T') + ':00Z'), v: +p.v, type: p.type }));
      cset(k, pts);
      return pts;
    }
    function tideAt(pts, t) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        if (t >= a.t && t <= b.t) {
          const f = (t - a.t) / (b.t - a.t);
          return { v: a.v + (b.v - a.v) * (1 - Math.cos(Math.PI * f)) / 2, rising: b.v > a.v };
        }
      }
      return null;
    }

    // ---------- 日出日落（简化版 NOAA 太阳公式，误差约 1 分钟） ----------
    function sunTimes(y, m, d, lat, lon) {
      const rad = Math.PI / 180, J1970 = 2440588, J2000 = 2451545, dayMs = 864e5;
      const toJ = t => t / dayMs - 0.5 + J1970, fromJ = j => (j + 0.5 - J1970) * dayMs;
      const date = Date.UTC(y, m - 1, d, 12);
      const lw = rad * -lon, phi = rad * lat, e = rad * 23.4397;
      const n = Math.round(toJ(date) - J2000 - 0.0009 - lw / (2 * Math.PI));
      const ds = 0.0009 + lw / (2 * Math.PI) + n;
      const M = rad * (357.5291 + 0.98560028 * ds);
      const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
      const L = M + C + rad * 102.9372 + Math.PI;
      const dec = Math.asin(Math.sin(e) * Math.sin(L));
      const Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
      const w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
      const Jset = J2000 + 0.0009 + (w + lw) / (2 * Math.PI) + n + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
      return { rise: fromJ(Jnoon - (Jset - Jnoon)), set: fromJ(Jset) };
    }

    // ---------- 天气文字 / 图标 ----------
    function wxInfo(f, day) {
      const s = (f || '').toLowerCase();
      if (/thunder|t-storm/.test(s)) return ['⛈️', '雷雨'];
      if (/snow|sleet|ice/.test(s)) return ['🌨️', '雨雪'];
      if (/rain|shower|drizzle/.test(s)) return ['🌧️', /slight|chance/.test(s) ? '可能雨' : '雨'];
      if (/fog|haze|smoke|mist/.test(s)) return ['🌫️', '雾'];
      if (/mostly cloudy|overcast|^cloudy/.test(s)) return ['☁️', '阴'];
      if (/partly|mostly sunny|mostly clear/.test(s)) return [day ? '⛅' : '☁️', '多云'];
      if (/sunny|clear|fair/.test(s)) return [day ? '☀️' : '🌙', '晴'];
      return [day ? '🌤️' : '🌙', f || ''];
    }
    const DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const DIR_CN = { N: '北', NNE: '北偏东', NE: '东北', ENE: '东偏北', E: '东', ESE: '东偏南', SE: '东南', SSE: '南偏东', S: '南', SSW: '南偏西', SW: '西南', WSW: '西偏南', W: '西', WNW: '西偏北', NW: '西北', NNW: '北偏西' };

    // ---------- 渲染 ----------
    const X = $('fc-x'), track = $('fc-track');
    let state = null, COL = 52;

    function build(sp, nws, tide) {
      // 一屏正好 7 个小时
      COL = Math.max(34, Math.floor(X.clientWidth / 7));
      track.classList.toggle('narrow', COL < 46);
      track.style.setProperty('--col', COL + 'px');
      const start = Math.floor(Date.now() / HOUR) * HOUR;
      const cols = [];
      const today = parts(start);
      for (let t = start; ; t += HOUR) {
        const p = parts(t);
        const dayIdx = Math.round((Date.UTC(p.y, p.m - 1, p.d) - Date.UTC(today.y, today.m - 1, today.d)) / 864e5);
        if (dayIdx >= DAYS) break;
        cols.push({ t, p, dayIdx });
      }
      const byHour = {}; (nws ? nws.periods : []).forEach(x => byHour[x.t] = x);
      const days = [];
      cols.forEach((c, i) => {
        if (!days[c.dayIdx]) days[c.dayIdx] = { idx: c.dayIdx, p: c.p, first: i, sun: sunTimes(c.p.y, c.p.m, c.p.d, sp.lat, sp.lon) };
      });
      days.forEach(d => { d.hilo = (tide || []).filter(x => parts(x.t).key === d.p.key); });
      const isNight = t => { const d = days.find(x => x.p.key === parts(t).key); return d && (t + HOUR / 2 < d.sun.rise || t + HOUR / 2 > d.sun.set); };
      const cls = c => 'fc-c' + (c.p.h === 0 ? ' d0' : '') + (isNight(c.t) ? ' night' : '');

      state = { sp, cols, days, byHour, tide, nws, dayShown: -1 };
      track.style.width = cols.length * COL + 'px';

      $('fc-days').innerHTML = days.map(d => `<button type="button" role="tab" data-day="${d.idx}"><b>${dayName(d)}</b><small>${d.p.m}/${d.p.d}</small></button>`).join('');
      $('fc-days').querySelectorAll('button').forEach(b => b.onclick = () => {
        const d = days[+b.dataset.day];
        const six = cols.findIndex(c => c.dayIdx === d.idx && c.p.h === 6);
        state.lockUntil = Date.now() + 900;
        X.scrollTo({ left: d.idx === 0 ? 0 : (six >= 0 ? six : d.first) * COL, behavior: 'smooth' });
        showDay(d.idx);
      });

      $('fc-time').innerHTML = cols.map((c, i) => `<div class="${cls(c)}">${i === 0 ? '<b class="now">现在</b>' : c.p.h === 0 ? `<b>${c.dayIdx === 1 ? '明天' : c.p.m + '/' + c.p.d}</b>` : hLabel(c.p.h)}</div>`).join('');
      $('fc-wx').innerHTML = cols.map(c => {
        const w = byHour[c.t];
        if (!w) return `<div class="${cls(c)}"><span class="na">—</span></div>`;
        const [ic, tx] = wxInfo(w.f, w.day);
        return `<div class="${cls(c)}" title="${tx}"><span class="wi">${ic}</span><b class="tp">${w.temp}°</b></div>`;
      }).join('');
      $('fc-wind').innerHTML = cols.map(c => {
        const w = byHour[c.t];
        if (!w) return `<div class="${cls(c)}"><span class="na">—</span></div>`;
        const deg = DIRS.indexOf(w.dir) * 22.5;
        const strong = w.wind >= 15 ? ' strong' : w.wind >= 10 ? ' mid' : '';
        return `<div class="${cls(c)}${strong}"><b class="ws">${w.wind}<small>mph</small></b>`
          + (deg >= 0 ? `<svg class="wa" viewBox="0 0 24 24" style="transform:rotate(${deg + 180}deg)"><path d="M12 3l5 9h-3.5v9h-3v-9H7z" fill="currentColor"/></svg>` : '<span class="wa"></span>')
          + `<span class="wd">${w.dir || ''}</span></div>`;
      }).join('');
      drawTide();
      X.scrollLeft = 0;
      showDay(0);
    }

    function drawTide() {
      const box = $('fc-tide'), { cols, tide } = state;
      const W = cols.length * COL, Hh = box.clientHeight || 176, top = 24, bot = 22;
      if (!tide || !tide.length) { box.innerHTML = `<div class="fc-tide-na">${state.tideErr ? '潮汐数据暂时获取不到' : '潮汐加载中…'}</div>`; return; }
      const t0 = cols[0].t, tEnd = cols[cols.length - 1].t, xOf = t => (t - t0) / HOUR * COL + COL / 2;
      const inRange = tide.filter(p => p.t >= t0 - 12 * HOUR && p.t <= tEnd + 12 * HOUR);
      const vs = inRange.map(p => p.v);
      const lo = Math.floor(Math.min(...vs) * 2) / 2, hi = Math.ceil(Math.max(...vs) * 2) / 2;   // 刻度取 0.5 ft 的整数倍
      const yOf = v => top + (1 - (v - lo) / ((hi - lo) || 1)) * (Hh - top - bot);
      // 刻度：0.5 或 1 ft 一格
      const step = hi - lo > 3 ? 1 : 0.5, ticks = [];
      for (let v = lo; v <= hi + 1e-6; v += step) ticks.push(+v.toFixed(1));
      const grid = ticks.map(v => `<line x1="0" x2="${W}" y1="${yOf(v)}" y2="${yOf(v)}" class="gl"/>`).join('');
      let d = '';
      for (let t = t0 - HOUR / 2; t <= tEnd + HOUR / 2; t += HOUR / 4) {
        const v = tideAt(tide, t); if (!v) continue;
        d += (d ? 'L' : 'M') + xOf(t).toFixed(1) + ' ' + yOf(v.v).toFixed(1);
      }
      const area = d ? d + `L${W} ${Hh}L0 ${Hh}Z` : '';
      // 高低潮：空心点 + 数值 + 时间
      const ext = inRange.filter(p => p.t >= t0 - HOUR / 2 && p.t <= tEnd + HOUR / 2);
      const extMarks = ext.map(p => {
        const x = xOf(p.t), y = yOf(p.v), H = p.type === 'H';
        return `<circle cx="${x}" cy="${y}" r="4.5" class="${H ? 'hi' : 'lo'}"/><text x="${x}" y="${H ? y - 9 : y + 16}" class="tl ${H ? 'th' : 'tlo'}">${p.v.toFixed(1)} ft</text>`;
      }).join('');
      // 每 3 小时一个潮位（离高低潮太近的跳过，免得挤在一起）
      const every = cols.filter(c => c.p.h % 3 === 0).map(c => {
        if (ext.some(p => Math.abs(p.t - c.t) < 1.25 * HOUR)) return '';
        const v = tideAt(tide, c.t); if (!v) return '';
        const x = xOf(c.t), y = yOf(v.v);
        return `<circle cx="${x}" cy="${y}" r="3" class="mid"/><text x="${x}" y="${y - 8}" class="tl tm">${v.v.toFixed(1)} ft</text>`;
      }).join('');
      const axis = ticks.map(v => `<span style="top:${yOf(v)}px">${v % 1 ? v.toFixed(1) : v}</span>`).join('');
      box.innerHTML = `<div class="fc-axis" aria-hidden="true">${axis}</div><svg width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}">
        <defs><linearGradient id="fcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".30"/><stop offset="1" stop-color="var(--primary)" stop-opacity=".04"/></linearGradient></defs>
        ${grid}<path d="${area}" fill="url(#fcg)"/><path d="${d}" fill="none" stroke="var(--primary)" stroke-width="2.4" stroke-linejoin="round"/>
        <line x1="${COL / 2}" x2="${COL / 2}" y1="0" y2="${Hh}" class="nowline"/>
        ${every}${extMarks}</svg>`;
    }

    const dayName = d => d.idx === 0 ? '今天' : d.idx === 1 ? '明天' : WEEK[d.p.wd];
    function showDay(idx) {
      if (!state || state.dayShown === idx) return; state.dayShown = idx;
      const d = state.days[idx]; if (!d) return;
      $('fc-days').querySelectorAll('button').forEach(b => { const on = +b.dataset.day === idx; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); if (on) b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); });
      $('fc-day').innerHTML = `<div class="dy-sun">
          <div><span>🌅 ${dayName(d)}日出</span><b>${hm(d.sun.rise)}</b></div>
          <div><span>🌇 ${dayName(d)}日落</span><b>${hm(d.sun.set)}</b></div>
        </div>`;
    }

    // 滑动时：日期标签和下面的日出日落、高低潮跟着换
    let raf = 0;
    function onScroll() {
      if (!state || Date.now() < (state.lockUntil || 0)) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.min(state.cols.length - 1, Math.floor((X.scrollLeft + X.clientWidth / 2) / COL));
        showDay(state.cols[i].dayIdx);
      });
    }
    X.addEventListener('scroll', onScroll, { passive: true });

    // ---------- 打开页面 ----------
    async function open(key) {
      const sp = SPOTS[key]; if (!sp) return;
      $('fc-title').textContent = sp.name + ' · 天气潮汐';
      state = null;
      ['fc-time', 'fc-wx', 'fc-wind', 'fc-tide', 'fc-days'].forEach(id => $(id).innerHTML = '');
      $('fc-day').innerHTML = '<div class="ro-loading">正在获取天气和潮汐…</div>';
      window.openDetail('detail-fc');
      const myKey = key; page.dataset.spot = key;
      const [n, t] = await Promise.allSettled([loadNWS(sp), loadTide(sp)]);
      if (page.dataset.spot !== myKey) return;          // 用户已经切到别的钓点
      const nws = n.status === 'fulfilled' ? n.value : null;
      const tide = t.status === 'fulfilled' ? t.value : null;
      build(sp, nws, tide);
      state.tideErr = !tide; if (!tide) { drawTide(); state.dayShown = -1; showDay(0); }
      const ago = nws ? Math.round((Date.now() - nws.at) / 60000) : null;
      $('fc-src').innerHTML = `天气：NWS 美国国家气象局${nws ? (ago < 1 ? '（刚刚更新）' : `（${ago} 分钟前更新${nws.stale ? '，联网失败，显示的是旧数据' : ''}）`) : '（暂时获取不到）'}<br>`
        + `潮汐：NOAA ${sp.stName} 潮汐站（${sp.st}），潮位以 MLLW 为基准${tide ? '' : '（暂时获取不到）'}<br>日出日落：按钓点经纬度计算`;
    }
    document.querySelectorAll('.fc-btn[data-spot]').forEach(b => b.addEventListener('click', () => open(b.dataset.spot)));
    // 卡片和详情页右上角的天气小标签，也打开同一个页面
    document.querySelectorAll('button.wx[data-lat]').forEach(b => b.addEventListener('click', () => {
      const k = Object.keys(SPOTS).find(k => SPOTS[k].lat === +b.dataset.lat && SPOTS[k].lon === +b.dataset.lon);
      if (k) open(k);
    }));
  })();
