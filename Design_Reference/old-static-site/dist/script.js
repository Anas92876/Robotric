/* Robotrick public site — progressive enhancement only; every page works without JS. */
(() => {
  const body = document.body;
  const API = (body.dataset.apiBase || '').replace(/\/$/, '');
  const WA = body.dataset.wa;
  const ROOT = new URL(".", document.currentScript?.src || location.href).href; // site root (script.js lives there)
  const isAr = document.documentElement.lang === 'ar';
  const t = (en, ar) => (isAr ? ar : en);

  /* ---- Conversion tracking (GA4 when configured; no-op otherwise) ------- */
  const track = (event, params = {}) => {
    if (typeof window.gtag === 'function') window.gtag('event', event, params);
  };
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (el) track(el.dataset.track, { label: el.dataset.trackLabel || el.textContent.trim().slice(0, 60), page: location.pathname });
    const a = e.target.closest('a[href*="wa.me"]');
    if (a && !a.dataset.track) track('whatsapp_click', { label: 'inline', page: location.pathname });
  });

  /* ---- Current year + live "years of experience" (founded 2022) --------- */
  const year = new Date().getFullYear();
  document.querySelectorAll('[data-year]').forEach((n) => (n.textContent = year));
  document.querySelectorAll('[data-years-since]').forEach((n) => (n.textContent = Math.max(1, year - Number(n.dataset.yearsSince))));

  /* ---- Nav: scrolled state, mobile menu, dropdown ---------------------- */
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const toggle = nav.querySelector('.nav__toggle');
    toggle?.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('.dropdown > button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const open = btn.parentElement.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) nav.querySelectorAll('.dropdown.is-open').forEach((d) => {
        if (!nav.classList.contains('is-open')) { d.classList.remove('is-open'); d.querySelector('button')?.setAttribute('aria-expanded', 'false'); }
      });
    });
    nav.querySelectorAll('.nav__links a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('is-open')));
  }

  /* ---- Hero rotating sub-headline --------------------------------------- */
  document.querySelectorAll('[data-rotate]').forEach((el) => {
    const items = JSON.parse(el.dataset.rotate);
    const text = el.querySelector('.rotator__text');
    if (!text || items.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0;
    setInterval(() => {
      text.classList.add('is-out');
      setTimeout(() => { i = (i + 1) % items.length; text.textContent = items[i]; text.classList.remove('is-out'); }, 350);
    }, 3200);
  });

  /* =====================================================================
     MOTION
     ===================================================================== */
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  const onceVisible = (els, cb, margin = '0px 0px -10% 0px') => {
    if (!hasIO) { els.forEach(cb); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { cb(en.target); io.unobserve(en.target); }
    }), { rootMargin: margin });
    els.forEach((el) => io.observe(el));
  };

  /* ---- Staggered reveal: tag every card/section block on every page ----- */
  const REVEAL = [
    '.section-head__main', '.section-head__side', '.split > *', '.stats',
    '.card', '.feature', '.step', '.proof', '.faq details', '.map', '.footer__grid > *', '.footer__bottom',
    '.values__item', '.timeline__year', '.vtimeline__step', '.material', '.phase', '.option', '.lab-step',
    '.contact-card', '.masonry__item', '.dept', '.journey__step', '.track-tab', '.cap__list li',
    '.feature-list li', '.results__list li', '.space-slide', '.soon', '.pullquote', '.band',
  ].join(',');
  const SCALE = '.feature, .proof, .stats';
  document.querySelectorAll(REVEAL).forEach((el) => {
    if (el.closest('.hero, .page-hero .hero__split, .halo, .device')) return;
    if (el.parentElement.closest('.reveal') && !el.matches('.faq details, .funnel__item')) return; // avoid double-animating nested blocks
    el.classList.add('reveal');
    // Two-column grids slide in from alternating sides; others scale up
    if (el.parentElement.matches('.grid--2, .split')) {
      const idx = [...el.parentElement.children].indexOf(el);
      el.classList.add(idx % 2 ? 'reveal--right' : 'reveal--left');
    } else if (el.matches(SCALE)) el.classList.add('reveal--scale');
  });
  // Stagger siblings that sit in the same group (~0.15s apart, capped)
  const groups = new Map();
  document.querySelectorAll('.reveal').forEach((el) => {
    const key = el.parentElement;
    const i = groups.get(key) ?? 0;
    el.style.setProperty('--i', String(i % 6));
    groups.set(key, i + 1);
  });
  const reveals = [...document.querySelectorAll('.reveal')];
  if (calm) reveals.forEach((r) => r.classList.add('is-in', 'is-settled'));
  else onceVisible(reveals, (el) => {
    el.classList.add('is-in');
    // After the entrance finishes, switch to the snappy hover transition
    const delay = (parseFloat(getComputedStyle(el).transitionDelay) || 0) * 1000;
    setTimeout(() => el.classList.add('is-settled'), delay + 850);
  });

  /* ---- Highlight markers draw in when their heading appears ----------- */
  onceVisible([...document.querySelectorAll('em.hl')], (el) => el.classList.add('is-drawn'), '0px 0px -15% 0px');

  /* ---- Stats count up --------------------------------------------------- */
  const countUp = (el) => {
    const raw = el.textContent.trim();
    const m = raw.match(/^([\d,]+)(.*)$/);
    if (!m || calm) return;
    const target = Number(m[1].replace(/,/g, ''));
    const suffix = m[2];
    const useComma = m[1].includes(',');
    const dur = 1600 + Math.min(target, 12000) / 20;
    const t0 = performance.now();
    const fmt = (n) => (useComma ? n.toLocaleString('en-US') : String(n)) + suffix;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    el.textContent = fmt(0);
    requestAnimationFrame(tick);
  };
  onceVisible([...document.querySelectorAll('.stat b')], (el) => setTimeout(() => countUp(el), 250));

  /* ---- Tool strip → infinite marquee ------------------------------------ */
  document.querySelectorAll('.strip__row').forEach((row) => {
    if (calm) return;
    const track = document.createElement('div');
    track.className = 'strip__track';
    track.append(...row.childNodes);
    const clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    row.append(track, clone);
    row.classList.add('is-marquee');
  });

  /* ---- Scroll progress bar ---------------------------------------------- */
  const bar = document.createElement('div');
  bar.className = 'progress';
  bar.setAttribute('aria-hidden', 'true');
  body.prepend(bar);
  let ticking = false;
  const updateBar = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? String(Math.min(1, scrollY / max)) : '0');
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateBar); } }, { passive: true });
  updateBar();

  /* ---- Hero: the halo light starts breathing once it has risen in ------- */
  const halo = document.querySelector('.halo');
  if (halo && !calm) setTimeout(() => halo.classList.add('is-live'), 1700);

  /* ---- Closer banners get a second drifting glow ----------------------- */
  document.querySelectorAll('.closer').forEach((c) => {
    const orb = document.createElement('span');
    orb.className = 'orb orb--c';
    orb.setAttribute('aria-hidden', 'true');
    c.prepend(orb);
  });

  /* ---- FAQ: smooth open / close ---------------------------------------- */
  document.querySelectorAll('.faq details').forEach((d) => {
    const summary = d.querySelector('summary');
    let anim = null;
    summary.addEventListener('click', (e) => {
      if (calm || !d.animate) return;
      e.preventDefault();
      anim?.cancel();
      const start = d.offsetHeight;
      if (!d.open) {
        d.open = true;
        const end = d.offsetHeight;
        anim = d.animate({ height: [`${start}px`, `${end}px`] }, { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
      } else {
        const end = summary.offsetHeight;
        anim = d.animate({ height: [`${start}px`, `${end}px`] }, { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
        anim.onfinish = () => { d.open = false; };
      }
    });
  });

  /* ---- Carousel dots ---------------------------------------------------- */
  document.querySelectorAll('.carousel').forEach((c) => {
    const track = c.querySelector('.carousel__track');
    const dots = c.querySelector('.carousel__dots');
    if (!track || !dots) return;
    const items = [...track.children];
    const pages = () => Math.max(1, Math.ceil(track.scrollWidth / track.clientWidth - 0.05));
    const build = () => {
      dots.innerHTML = '';
      const n = pages();
      dots.hidden = n < 2;
      for (let i = 0; i < n; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', t(`Go to slide ${i + 1}`, `الانتقال إلى الشريحة ${i + 1}`));
        b.addEventListener('click', () => {
          const target = items[Math.min(items.length - 1, Math.round((i * items.length) / n))];
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        });
        dots.appendChild(b);
      }
      sync();
    };
    const sync = () => {
      const n = dots.children.length;
      const max = track.scrollWidth - track.clientWidth;
      const ratio = max > 0 ? Math.abs(track.scrollLeft) / max : 0;
      const active = Math.round(ratio * (n - 1));
      [...dots.children].forEach((d, i) => d.classList.toggle('is-active', i === active));
    };
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', build);
    build();

    // Autoplay: advance one page every 4.5s; pause while the visitor interacts
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      let paused = false;
      ['mouseenter', 'focusin', 'touchstart'].forEach((ev) => c.addEventListener(ev, () => (paused = true), { passive: true }));
      ['mouseleave', 'focusout'].forEach((ev) => c.addEventListener(ev, () => (paused = false)));
      c.addEventListener('touchend', () => setTimeout(() => (paused = false), 4000), { passive: true });
      setInterval(() => {
        if (paused || document.hidden || dots.hidden) return;
        const max = track.scrollWidth - track.clientWidth;
        const cur = Math.abs(track.scrollLeft);
        const next = cur >= max - 4 ? 0 : Math.min(max, cur + track.clientWidth);
        track.scrollTo({ left: isAr ? -next : next, behavior: 'smooth' });
      }, 4500);
    }
  });

  /* =====================================================================
     MOTION II — scroll-linked effects, words, tilt, cursor, transitions
     ===================================================================== */
  const root = document.documentElement;
  const motion = root.classList.contains('motion');

  /* ---- Split headlines into words ------------------------------------- */
  const splitWords = (el) => {
    let wi = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.append(document.createTextNode(p)); return; }
            const w = document.createElement('span'); w.className = 'w';
            const inner = document.createElement('span'); inner.textContent = p;
            inner.style.setProperty('--wi', String(wi++));
            w.append(inner); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
      });
    };
    walk(el);
    el.classList.add('split-words');
  };
  if (motion) {
    document.querySelectorAll('.hero h1, .page-hero h1').forEach((h) => {
      splitWords(h);
      void h.offsetWidth; // commit the hidden state so the words transition in
      setTimeout(() => h.classList.add('words-in'), 60);
    });
    const heads = [...document.querySelectorAll('.section-head h2, .split h2, .closer h2, .feature h3[style]')];
    heads.forEach(splitWords);
    onceVisible(heads, (h) => h.classList.add('words-in'), '0px 0px -12% 0px');
  }

  /* ---- Children cascade (lists inside cards) --------------------------- */
  document.querySelectorAll('.checks, .feature__meta, .vtimeline__items, .facts').forEach((list) => {
    if (list.closest('.halo')) return;
    list.classList.add('kids');
    [...list.children].forEach((c, k) => c.style.setProperty('--k', String(k)));
    if (!list.closest('.reveal')) onceVisible([list], (l) => l.classList.add('is-in'));
  });

  /* ---- Scroll-linked engine: --hero, --y on :root; --enter per element -- */
  if (motion) {
    const linked = [...document.querySelectorAll('.closer, .photo, .funnel')];
    const visible = new Set();
    if (hasIO) {
      const vio = new IntersectionObserver((ents) => ents.forEach((en) => (en.isIntersecting ? visible.add(en.target) : visible.delete(en.target))), { rootMargin: '10% 0px 10% 0px' });
      linked.forEach((el) => vio.observe(el));
    } else linked.forEach((el) => visible.add(el));

    const clamp = (v) => Math.max(0, Math.min(1, v));
    let lastY = scrollY, vel = 0, queued = false;
    const frame = () => {
      queued = false;
      const y = scrollY, vh = innerHeight;
      root.style.setProperty('--y', y.toFixed(1));
      root.style.setProperty('--hero', clamp(y / (vh * 0.8)).toFixed(3));
      visible.forEach((el) => {
        const r = el.getBoundingClientRect();
        // 0 when the top touches the bottom of the screen, 1 when it reaches 55% up
        el.style.setProperty('--enter', clamp((vh - r.top) / (vh * 0.55)).toFixed(3));
      });
      // Marquee speeds up with scroll velocity, then eases back
      vel = vel * 0.85 + Math.abs(y - lastY) * 0.15;
      lastY = y;
      marquees.forEach((a) => { a.playbackRate = 1 + Math.min(vel / 6, 5); });
      if (vel > 0.2) queue();
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    const marquees = [...document.querySelectorAll('.strip__track')].flatMap((t) => (t.getAnimations ? t.getAnimations() : []));
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    frame();
  }

  /* ---- Nav hides while scrolling down, returns when scrolling up ------ */
  if (nav && motion) {
    let prev = scrollY;
    addEventListener('scroll', () => {
      const y = scrollY;
      const busy = nav.classList.contains('is-open') || nav.querySelector('.dropdown.is-open, .dropdown:hover');
      if (!busy && y > 480 && y > prev + 4) nav.classList.add('is-hidden');
      else if (y < prev - 4 || y < 480) nav.classList.remove('is-hidden');
      prev = y;
    }, { passive: true });
  }

  /* ---- Back-to-top button with a progress ring ------------------------ */
  const top = document.createElement('button');
  top.type = 'button';
  top.className = 'to-top';
  top.setAttribute('aria-label', t('Back to top', 'العودة إلى الأعلى'));
  top.innerHTML = '<svg class="ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22"/></svg><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  top.addEventListener('click', () => scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' }));
  body.append(top);
  const syncTop = () => {
    const max = root.scrollHeight - innerHeight;
    top.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(3) : '0');
    top.classList.toggle('is-shown', scrollY > 700);
  };
  addEventListener('scroll', syncTop, { passive: true });
  syncTop();

  /* ---- Pointer effects: tilt, spotlight, magnetic buttons, robot eyes -- */
  if (motion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const MAX = 6; // degrees
    document.querySelectorAll('a.feature, .proof, .card:not(.form)').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, yy = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(yy * 100).toFixed(1)}%`);
        const dx = x - 0.5, dy = yy - 0.5;
        const mag = Math.min(1, Math.hypot(dx, dy) * 2);
        el.style.setProperty('--tx', (-dy).toFixed(3));
        el.style.setProperty('--ty', dx.toFixed(3));
        el.style.setProperty('--ta', `${(mag * MAX).toFixed(2)}deg`);
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--ta', '0deg'); });
    });

    document.querySelectorAll('.btn--lg, .nav .btn--primary').forEach((b) => {
      b.classList.add('is-magnet');
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--bx', `${((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1)}px`);
        b.style.setProperty('--by', `${((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1)}px`);
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
    });
  }

  /* ---- Decorative gears that turn with the scroll ---------------------- */
  if (motion) {
    const gear = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
    document.querySelectorAll('.hero, .page-hero').forEach((h) => {
      h.insertAdjacentHTML('afterbegin', `<span class="gear-deco gear-deco--1" aria-hidden="true">${gear}</span><span class="gear-deco gear-deco--2" aria-hidden="true">${gear}</span>`);
    });
  }

  /* ---- Page transitions between internal pages ------------------------- */
  if (motion) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.hash) return; // same-page anchor
      e.preventDefault();
      body.classList.add('is-leaving');
      setTimeout(() => { location.href = url.href; }, 260);
    });
    // Coming back via the back button: make sure the page is visible again
    addEventListener('pageshow', (e) => { if (e.persisted) body.classList.remove('is-leaving'); });
  }

  /* =====================================================================
     PAGE FEATURES
     API base already ends in /api (e.g. https://…railway.app/api), so paths below start after it.
     ===================================================================== */
  const params = new URLSearchParams(location.search);
  const escHTML = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const setStatus = (form, ok, html) => {
    const s = form.querySelector('.form__status');
    if (!s) return;
    s.className = `form__status ${ok ? 'is-ok' : 'is-err'}`;
    s.innerHTML = html;
  };
  const waLink = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;

  /* ---- Training: program-map tabs ---------------------------------------- */
  document.querySelectorAll('.track-tabs').forEach((tabs) => {
    const panelsWrap = tabs.nextElementSibling;
    if (!panelsWrap?.classList.contains('track-panels')) return;
    const btns = [...tabs.querySelectorAll('[role="tab"]')];
    const select = (btn, focus = false) => {
      btns.forEach((b) => {
        const on = b === btn;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        document.getElementById(b.getAttribute('aria-controls'))?.classList.toggle('is-active', on);
      });
      if (focus) btn.focus();
    };
    panelsWrap.classList.add('is-tabbed');
    btns.forEach((b, i) => {
      b.addEventListener('click', () => select(b));
      b.addEventListener('keydown', (e) => {
        const dir = { ArrowRight: isAr ? -1 : 1, ArrowLeft: isAr ? 1 : -1, ArrowDown: 1, ArrowUp: -1 }[e.key];
        if (dir) { e.preventDefault(); select(btns[(i + dir + btns.length) % btns.length], true); }
      });
    });
    // #track-yearRound style links open the right tab
    const fromHash = btns.find((b) => `#${b.getAttribute('aria-controls')}` === location.hash);
    select(fromHash || btns[0]);
  });

  /* ---- Gallery: filters (+ #category links) and lightbox ------------------ */
  const gallery = document.querySelector('[data-gallery]');
  if (gallery) {
    const items = [...gallery.querySelectorAll('.masonry__item')];
    const filters = [...document.querySelectorAll('.filter')];
    const empty = document.querySelector('[data-gallery-empty]');
    const apply = (cat) => {
      let shown = 0;
      items.forEach((it) => { const on = cat === 'all' || it.dataset.category === cat; it.classList.toggle('is-hidden', !on); if (on) shown++; });
      filters.forEach((f) => { const on = f.dataset.filter === cat; f.classList.toggle('is-active', on); f.setAttribute('aria-pressed', String(on)); });
      if (empty) empty.hidden = shown > 0;
    };
    filters.forEach((f) => f.addEventListener('click', () => { apply(f.dataset.filter); history.replaceState(null, '', f.dataset.filter === 'all' ? location.pathname : `#${f.dataset.filter}`); }));
    const hashCat = location.hash.slice(1);
    if (filters.some((f) => f.dataset.filter === hashCat)) apply(hashCat);

    const lb = document.querySelector('[data-lightbox]');
    const lbImg = lb.querySelector('[data-lb-img]');
    const lbCap = lb.querySelector('[data-lb-caption]');
    let cur = 0, lastFocus = null;
    const visibleItems = () => items.filter((it) => !it.classList.contains('is-hidden'));
    const show = (idx) => {
      const list = visibleItems();
      cur = (idx + list.length) % list.length;
      const btn = list[cur].querySelector('.masonry__btn');
      lbImg.src = btn.dataset.full;
      lbImg.alt = btn.getAttribute('aria-label');
      lbCap.textContent = btn.getAttribute('aria-label');
    };
    const open = (it) => { lastFocus = document.activeElement; show(visibleItems().indexOf(it)); lb.hidden = false; body.style.overflow = 'hidden'; lb.querySelector('[data-lb-close]').focus(); };
    const close = () => { lb.hidden = true; body.style.overflow = ''; lastFocus?.focus(); };
    items.forEach((it) => it.querySelector('.masonry__btn').addEventListener('click', () => open(it)));
    lb.querySelector('[data-lb-close]').addEventListener('click', close);
    lb.querySelector('[data-lb-prev]').addEventListener('click', () => show(cur - 1));
    lb.querySelector('[data-lb-next]').addEventListener('click', () => show(cur + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(cur + (isAr ? -1 : 1));
      if (e.key === 'ArrowLeft') show(cur + (isAr ? 1 : -1));
    });
  }

  /* ---- Contact form → POST /contact (same payload & rules as robotrick.net) -- */
  const SUBJECT_KEYS = ['inquiry', 'partnership', 'general', 'consultation', 'other'];
  document.querySelectorAll('form[data-contact]').forEach((form) => {
    const d = form.dataset;
    const sel = form.querySelector('select[name="subject"]');
    const otherWrap = form.querySelector('[data-subject-other]');
    const isOther = () => sel.selectedOptions[0]?.hasAttribute('data-other');
    const syncOther = () => { if (otherWrap) otherWrap.hidden = !isOther(); };
    sel.addEventListener('change', syncOther);
    // ?subject=inquiry|partnership|general|consultation preselects an option
    const want = SUBJECT_KEYS.indexOf(params.get('subject'));
    if (want >= 0 && sel.options[want]) sel.selectedIndex = want;
    syncOther();

    const fieldError = (input, msg) => {
      const f = input.closest('.field');
      const err = f?.querySelector('.field__error');
      f?.classList.toggle('has-error', !!msg);
      if (err) { err.textContent = msg || ''; err.hidden = !msg; }
      return !msg;
    };
    const validate = () => {
      const name = form.elements.name.value.trim();
      const phone = form.elements.phone.value.trim();
      const okName = fieldError(form.elements.name, !name ? d.msgNameRequired : name.length < 2 ? d.msgNameMin : '');
      const okPhone = fieldError(form.elements.phone, !phone ? d.msgPhoneRequired : !/^[0-9+\-\s()]{8,}$/.test(phone) ? d.msgPhoneInvalid : '');
      return okName && okPhone;
    };
    ['name', 'phone'].forEach((n) => form.elements[n].addEventListener('blur', () => { if (form.elements[n].value) validate(); }));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validate()) { setStatus(form, false, escHTML(d.msgFormError)); return; }
      const subject = isOther() ? form.elements.customSubject.value.trim() : sel.value;
      const payload = { name: form.elements.name.value.trim(), phone: form.elements.phone.value.trim(), subject };
      const message = form.elements.message.value.trim();
      if (message) payload.message = message;
      const btn = form.querySelector('[type="submit"]');
      const label = btn.textContent;
      btn.disabled = true; btn.textContent = d.msgSending;
      try {
        const res = await fetch(`${API}/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw Object.assign(new Error('http'), { detail: json.message });
        track('generate_lead', { form: body.dataset.page, subject });
        form.reset(); syncOther();
        setStatus(form, true, `<strong>${escHTML(d.msgSuccess)}</strong> ${escHTML(d.msgSuccessLead)}`);
      } catch (err) {
        const text = `${payload.name} — ${payload.subject}${message ? `\n${message}` : ''}`;
        setStatus(form, false, `${escHTML(err.detail || d.msgFormError)} <a href="${waLink(text)}" target="_blank" rel="noopener">WhatsApp →</a>`);
      } finally { btn.disabled = false; btn.textContent = label; }
    });
  });

  /* ---- Jobs: live list from GET /public/jobs -------------------------------- */
  const pick = (obj, base) => {
    // Bilingual API fields (titleEn/titleAr…): current language first, the other one if it's empty
    const a = obj?.[base + (isAr ? 'Ar' : 'En')], b = obj?.[base + (isAr ? 'En' : 'Ar')];
    return (a && String(a).trim()) || (b && String(b).trim()) || '';
  };
  const jobsBox = document.querySelector('[data-jobs]');
  if (jobsBox) {
    const L = jobsBox.dataset;
    const load = async () => {
      try {
        const res = await fetch(`${API}/public/jobs`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        const jobs = (json.data || []).filter((j) => !j.status || j.status === 'published').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        if (!jobs.length) { jobsBox.innerHTML = `<div class="soon" style="grid-column:1/-1"><strong>${escHTML(L.labelEmpty)}</strong><p>${escHTML(L.labelEmptyLead)}</p></div>`; return; }
        jobsBox.innerHTML = jobs.map((j) => `
          <a class="job-card" href="job.html?slug=${encodeURIComponent(j.slug)}">
            <div class="job-card__img" style="--img:url('${escHTML(j.imageSrc || '')}');--fallback:url('${ROOT}images/image-2.webp')">${j.badge ? `<span class="tag">${escHTML(L.labelNew)}</span>` : ''}</div>
            <div class="job-card__body">
              <h3>${escHTML(pick(j, 'title'))}</h3>
              ${pick(j, 'subtitle') ? `<span class="tag">${escHTML(pick(j, 'subtitle'))}</span>` : ''}
              <p>${escHTML(pick(j, 'description'))}</p>
              <div class="job-card__foot"><span class="chip chip--line">${escHTML(j.whatsapp ? L.labelWhatsapp : L.labelForm)}</span><span class="link-arrow">${escHTML(L.labelOpen)} <span class="arrow">→</span></span></div>
            </div>
          </a>`).join('');
      } catch {
        jobsBox.innerHTML = `<p class="jobs__status">${escHTML(L.labelError)} <button type="button" class="btn btn--sm btn--outline" data-retry>${escHTML(L.labelRetry)}</button></p>`;
        jobsBox.querySelector('[data-retry]').addEventListener('click', () => { jobsBox.innerHTML = ''; load(); });
      }
    };
    load();
  }

  /* ---- Job position page: GET /public/jobs/:slug + application form ------- */
  const jobBox = document.querySelector('[data-job]');
  if (jobBox) {
    const L = jobBox.dataset;
    const form = document.querySelector('[data-job-form]');
    const slug = params.get('slug') || location.pathname.match(/\/join-us\/([^/]+)/)?.[1];
    const ICON = { CheckSquare: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', Lightbulb: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2.3h6c0-1.1.4-1.8 1-2.3A7 7 0 0 0 12 2z', Heart: 'M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z', Bot: 'M4 8h16v11H4zM12 8V4M9 13h.01M15 13h.01', Award: 'M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM8.5 14 7 22l5-3 5 3-1.5-8', Clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2', MapPin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z' };
    const svg = (name) => `<span class="icon-dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[name] || ICON.CheckSquare}"/></svg></span>`;
    const notFound = () => { jobBox.innerHTML = `<div class="soon"><strong>${escHTML(L.labelNotFound)}</strong><p>${escHTML(L.labelNotFoundLead)}</p><a class="btn btn--primary" href="join-us.html">${escHTML(L.labelAll)}</a></div>`; };

    const render = (j) => {
      const title = pick(j, 'title');
      document.title = `${title} | Robotrick`;
      document.querySelector('[data-job-crumb]').textContent = title;
      const duties = (j.duties || []).map((x) => ({ icon: x.icon, title: pick(x, 'title'), text: pick(x, 'text') })).filter((x) => x.title || x.text);
      const reqs = (j.requirements || []).map((x) => ({ icon: x.icon, text: pick(x, 'text') })).filter((x) => x.text);
      const perks = (j.perks || []).map((x) => ({ icon: x.icon, text: pick(x, 'text') })).filter((x) => x.text);
      const details = (j.workDetails || []).map((x) => ({ label: pick(x, 'label'), value: pick(x, 'value') })).filter((x) => x.value);
      const waHref = waLink(`${L.waMessage} ${title}`);
      jobBox.innerHTML = `
        <div class="job-detail">
          <div class="job-detail__main">
            <div class="job-detail__title">
              ${j.badge ? `<span class="tag">${escHTML(L.labelNew)}</span>` : ''}
              <h1>${escHTML(title)}</h1>
              ${pick(j, 'subtitle') ? `<p class="job-detail__subtitle">${escHTML(pick(j, 'subtitle'))}</p>` : ''}
            </div>
            <p class="prose prose--lg" dir="auto">${escHTML(pick(j, 'description'))}</p>
            ${duties.length ? `<div class="job-block"><h2>${escHTML(L.labelDuties)}</h2>${duties.map((x) => `<div class="job-duty">${svg(x.icon)}<div>${x.title ? `<h3 dir="auto">${escHTML(x.title)}</h3>` : ''}${x.text ? `<p dir="auto">${escHTML(x.text)}</p>` : ''}</div></div>`).join('')}</div>` : ''}
            ${reqs.length ? `<div class="job-block"><h2>${escHTML(L.labelRequirements)}</h2><ul class="checks">${reqs.map((x) => `<li dir="auto">${escHTML(x.text)}</li>`).join('')}</ul></div>` : ''}
            ${perks.length ? `<div class="job-block"><h2>${escHTML(L.labelPerks)}</h2><ul class="checks">${perks.map((x) => `<li dir="auto">${escHTML(x.text)}</li>`).join('')}</ul></div>` : ''}
          </div>
          <aside class="job-detail__side">
            ${j.imageSrc ? `<div class="job-detail__img"><img src="${escHTML(j.imageSrc)}" alt="${escHTML(title)}" loading="lazy"></div>` : ''}
            <div class="card">
              ${details.length ? `<h2 class="form__title">${escHTML(L.labelDetails)}</h2><dl>${details.map((x) => `<div><dt>${escHTML(x.label)}</dt><dd>${escHTML(x.value)}</dd></div>`).join('')}</dl>` : ''}
              <div class="btn-row">
                ${j.whatsapp ? '' : `<a class="btn btn--primary" href="#apply">${escHTML(L.labelApplyNow)}</a>`}
                <a class="btn ${j.whatsapp ? 'btn--primary' : 'btn--outline'}" href="${waHref}" target="_blank" rel="noopener" data-track="job_whatsapp" data-track-label="${escHTML(j.slug)}">${escHTML(L.labelApplyWhatsapp)}</a>
              </div>
            </div>
          </aside>
        </div>`;
      if (form && !j.whatsapp) {
        form.hidden = false;
        form.elements.position.value = j.titleEn || title; // the live site sends the English title
      }
    };

    if (!slug) notFound();
    else fetch(`${API}/public/jobs/${encodeURIComponent(slug)}`)
      .then((r) => (r.status === 404 ? null : r.ok ? r.json() : Promise.reject()))
      .then((json) => { const j = json?.data?.job || json?.data || json; if (!j || !j.slug) notFound(); else render(j); })
      .catch(() => { jobBox.innerHTML = `<p class="jobs__status">${escHTML(document.querySelector('[data-jobs]')?.dataset.labelError || '')}</p>`; notFound(); });

    // Skills: type + Enter to add a tag, click a tag to remove it (sent as a JSON array, like the live form)
    const skills = [];
    const skillsBox = form?.querySelector('[data-skills]');
    const skillInput = skillsBox?.querySelector('input');
    const drawSkills = () => {
      skillsBox.querySelectorAll('.chip').forEach((c) => c.remove());
      skills.forEach((s, i) => {
        const c = document.createElement('button');
        c.type = 'button'; c.className = 'chip'; c.textContent = `${s} ×`;
        c.addEventListener('click', () => { skills.splice(i, 1); drawSkills(); });
        skillsBox.insertBefore(c, skillInput);
      });
    };
    skillInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const v = skillInput.value.trim().replace(/,$/, '');
        if (v && !skills.includes(v)) { skills.push(v); drawSkills(); }
        skillInput.value = '';
      }
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = form.dataset;
      const el = form.elements;
      const errs = [];
      if (!el.fullName.value.trim()) errs.push(d.msgName);
      if (!/^[0-9+\-\s()]{8,}$/.test(el.phone.value.trim())) errs.push(d.msgPhone);
      if (el.email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.email.value.trim())) errs.push(d.msgEmail);
      const cv = el.cv.files[0];
      if (cv && cv.size > 10 * 1024 * 1024) errs.push(d.msgCv);
      if (errs.length) { setStatus(form, false, errs.map(escHTML).join('<br>')); return; }

      const fd = new FormData();
      const add = (k, v) => { if (v != null && String(v).trim() !== '') fd.append(k, typeof v === 'string' ? v.trim() : v); };
      ['fullName', 'phone', 'email', 'age', 'location', 'gender', 'experienceLevel', 'experienceDetails', 'portfolioLink', 'availability', 'whyUs', 'additionalInfo', 'position'].forEach((k) => add(k, el[k].value));
      const pending = skillInput?.value.trim();
      if (pending && !skills.includes(pending)) skills.push(pending);
      if (skills.length) fd.append('skills', JSON.stringify(skills));
      if (cv) fd.append('cv', cv);

      const btn = form.querySelector('[type="submit"]');
      const label = btn.innerHTML;
      btn.disabled = true; btn.textContent = d.msgSending;
      try {
        const res = await fetch(`${API}/jobs/apply`, { method: 'POST', body: fd });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw Object.assign(new Error('http'), { detail: json.message });
        track('job_application', { position: el.position.value });
        form.reset(); skills.length = 0; if (skillsBox) drawSkills();
        setStatus(form, true, `<strong>${escHTML(d.msgSuccess)}</strong> ${escHTML(d.msgSuccessLead)}`);
      } catch (err) {
        setStatus(form, false, escHTML(err.detail || d.msgError));
      } finally { btn.disabled = false; btn.innerHTML = label; }
    });
  }

  /* ---- Certificate verification → GET /certificates/verify/:NUMBER --------- */
  const vForm = document.querySelector('form[data-verify]');
  if (vForm) {
    const L = vForm.dataset;
    const out = document.getElementById('certificate');
    const input = vForm.querySelector('input[name="cert"]');
    const fmtDate = (d) => { const x = new Date(d); return isNaN(x) ? d : x.toLocaleDateString(isAr ? 'ar-SY' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }); };

    const lookup = async (raw) => {
      const num = raw.trim().toUpperCase();
      if (!num) return;
      input.value = num;
      history.replaceState(null, '', `?cert=${encodeURIComponent(num)}`);
      setStatus(vForm, true, escHTML(L.labelChecking));
      out.classList.remove('is-visible');
      try {
        const res = await fetch(`${API}/certificates/verify/${encodeURIComponent(num)}`);
        if (res.status === 404) throw new Error('nf');
        if (!res.ok) throw new Error('err');
        const json = await res.json();
        const c = json.data || json.certificate || json;
        if (json.success === false || !c || !(c.studentName || c.displayName || c.courseName)) throw new Error('nf');
        const name = c.displayName || c.studentName;
        out.innerHTML = `
          <span class="tag" style="justify-self:center">${escHTML(L.labelVerified)}</span>
          <h3>${escHTML(name)}</h3>
          <p style="color:var(--color-text-2)">${escHTML(L.labelCompleted)} <strong>${escHTML(c.courseName || '')}${c.courseLevel ? ` — ${escHTML(c.courseLevel)}` : ''}</strong> ${escHTML(L.labelCourse)}${c.trainingHours ? `, ${escHTML(L.labelTotaling)} <strong class="ltr">${escHTML(c.trainingHours)}</strong> ${escHTML(L.labelHours)}` : ''}.</p>
          <dl>
            <div><dt>${escHTML(L.labelNumber)}</dt><dd class="ltr">${escHTML(c.certificateNumber || num)}</dd></div>
            ${c.issuedAt ? `<div><dt>${escHTML(L.labelIssued)}</dt><dd>${escHTML(fmtDate(c.issuedAt))}</dd></div>` : ''}
            <div><dt>${escHTML(L.labelIssuer)}</dt><dd>${escHTML(L.labelIssuerName)}</dd></div>
          </dl>`;
        out.classList.add('is-visible');
        setStatus(vForm, true, escHTML(L.labelVerified));
        track('certificate_verified');
      } catch (err) {
        setStatus(vForm, false, err.message === 'nf'
          ? `<strong>${escHTML(L.labelNotFound)}</strong> — ${escHTML(L.labelIdPrefix)} <span class="ltr">${escHTML(num)}</span> ${escHTML(L.labelNotFoundLead)}`
          : escHTML(L.labelError));
      }
    };
    vForm.addEventListener('submit', (e) => { e.preventDefault(); lookup(input.value); });
    const initial = params.get('cert') || location.pathname.match(/\/verify\/([^/]+)/)?.[1];
    if (initial) lookup(decodeURIComponent(initial));
  }
})();
