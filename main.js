/* ==================================================================
   Spain Silicon Valley Summit — behaviour
   ------------------------------------------------------------------
     A. i18n dictionary (EN / ES)
     B. Language toggle (remembered in localStorage)
     C. Mobile menu
     D. Accordion
     E. Scroll motion: fade-up, staggered children, headline masks
     F. Hero parallax (subtle, skipped if reduced-motion)
   No magnetic hover, no gimmicks. Motion eases on real spring curves.
   ================================================================== */

/* ---------- A. TRANSLATIONS ---------- */
const I18N = {
  en: {
    'nav.venue':'The venue','nav.speakers':'Speakers','nav.format':'The format','nav.cta':'Request an invite',

    'hero.meta':'Spring 2027 · Google HQ, Mountain View',
    'hero.title1':'Spain at','hero.titleAI':' Silicon Valley',
    'hero.event':'Spring 2027 Summit',
    'hero.sub':"An invitation-only summit that brings Spanish founders, investors and leaders together with the Bay Area, inside Google's headquarters.",
    'hero.scroll':'SCROLL',
    'stat.speakers':'Speakers','stat.days':'Days','stat.curated':'Curated',

    'cta.request':'Request an invite','cta.sponsor':'Sponsor inquiry',
    'cta.title':'See you in Mountain View, Spring 2027.',
    'cta.lead':'Invitations are limited. Tell us who you are and we will be in touch.',

    'why.title':'The reference summit for Spanish talent. Quality over quantity.',
    'why.lead':'What the summit opens up for you, depending on where you sit.',
    'why.tab.founders':'For founders','why.tab.investors':'For investors','why.tab.leaders':'For leaders',
    'why.founders.1':'Direct access to Bay Area investors already backing companies founded by Spaniards.',
    'why.founders.2':'Introductions that are matched on purpose, never left to a badge in a crowd.',
    'why.founders.3':'A stage to present your company to the partners and press who move things.',
    'why.founders.4':'Time with founders a few steps ahead on the same road, from Spain to the Valley.',
    'why.investors.1':'A first look at the Spanish founders building for the AI era.',
    'why.investors.2':'Two days with the deal flow that usually costs a dozen flights to Madrid and Barcelona.',
    'why.investors.3':'Room to invest alongside the Bay Area funds already active in Spain.',
    'why.investors.4':"A direct line to the people shaping Spain's investment climate.",
    'why.leaders.1':"A seat among the executives and policymakers setting Spain's technology agenda.",
    'why.leaders.2':'Frank, off the record conversation with Silicon Valley counterparts inside Google HQ.',
    'why.leaders.3':'A place to align public and private strategy on AI and talent.',
    'why.leaders.4':'A lasting relationship with the Bay Area, not a single visit.',

    'summit.title':'Two days, by invitation, built around three ideas.',
    'summit.lead':"A small, deliberate gathering for the people writing Spain's next chapter. Not a conference floor.",
    'summit.p1.title':'Connect','summit.p1.body':'Spanish CEOs, founders, policymakers and investors, in the same room as the Bay Area ecosystem building AI.',
    'summit.p2.title':'Showcase','summit.p2.body':'A stage for Spanish companies and talent to show their work to the investors and partners who matter.',
    'summit.p3.title':'Inspire','summit.p3.body':"We carry these role models back to Spain's universities, so the next generation grows up knowing what is possible.",
    'summit.when':'WHEN','summit.whenVal':'Spring 2027',
    'summit.where':'WHERE','summit.whereVal':'Google HQ, Mountain View, California',
    'summit.format':'FORMAT','summit.formatVal':'Two days, by invitation',

    'speakers.title':"More than 20 leaders shaping Spain's next chapter.",
    'speakers.lead':'The full lineup is announced soon. Tap any card for the profile.',
    'tbd.name':'To be announced','tbd.speaker':'Speaker','tbd.organizer':'Organizer',
    'tbd.bio':'A short profile appears here once the lineup is confirmed.',

    'team.title':'The organizers behind the summit.',
    'team.lead':'Drag to browse. Tap a card for the detail.',

    'partners.title':'Partners',
    'card.exit.open':'Back to the bridge','card.exit.flipped':'Back to the speakers',
    'card.linkedin':'View LinkedIn','credits.label':'Credits',
    'form.kicker.invite':'Request an invite','form.kicker.sponsor':'Sponsor inquiry',
    'form.title':'Tell us who you are','form.name':'Name','form.email':'Email',
    'form.org':'Company or organisation','form.note':'Anything else','form.send':'Send',
    'form.done':'Thank you — we will be in touch.',
    'partners.note':'Convening with the institutions building the bridge between both ecosystems.',
    'partners.lead':'Institutions, funds and companies bridging Spain and the Bay Area. A small circle, curated with care.',
    'partners.joinA':'A place for a small number of ','partners.joinB':'founding partners.',
    'partners.joinCta':'Explore partnership',
    'footer.legal':'© 2027 Spain Silicon Valley. All rights reserved.'
  },

  es: {
    'nav.venue':'La sede','nav.speakers':'Ponentes','nav.format':'El formato','nav.cta':'Solicitar invitación',

    'hero.meta':'Primavera 2027 · Sede de Google, Mountain View',
    /* The event's name stays in English in both languages, the way
       "Brazil at Silicon Valley" does; only the descriptor translates. */
    'hero.title1':'Spain at','hero.titleAI':' Silicon Valley',
    'hero.event':'Cumbre Primavera 2027',
    'hero.sub':'Una cumbre exclusiva que reúne a fundadores, inversores y líderes españoles con Bay Area, dentro de la sede de Google.',
    'hero.scroll':'Baja',
    'stat.speakers':'Ponentes','stat.days':'Días','stat.curated':'Seleccionado',

    'cta.request':'Solicitar invitación','cta.sponsor':'Quiero patrocinar',
    'cta.title':'Nos vemos en Mountain View, primavera de 2027.',
    'cta.lead':'Las invitaciones son limitadas. Cuéntanos quién eres y nos pondremos en contacto.',

    'why.title':'La cumbre de referencia para el talento español. Calidad antes que cantidad.',
    'why.lead':'Lo que la cumbre te abre, según el lugar desde el que llegas.',
    'why.tab.founders':'Para fundadores','why.tab.investors':'Para inversores','why.tab.leaders':'Para directivos',
    'why.founders.1':'Acceso directo a inversores de Bay Area que ya respaldan a empresas fundadas por españoles.',
    'why.founders.2':'Presentaciones pensadas una a una, nunca una acreditación más entre la multitud.',
    'why.founders.3':'Un escenario para presentar tu empresa ante los socios y medios que mueven las cosas.',
    'why.founders.4':'Tiempo con fundadores unos pasos por delante en el mismo camino, de España al Valley.',
    'why.investors.1':'Una primera mirada a los fundadores españoles que construyen para la era de la IA.',
    'why.investors.2':'Dos días con el flujo de oportunidades que suele costar una decena de vuelos a Madrid y Barcelona.',
    'why.investors.3':'Espacio para invertir junto a los fondos de Bay Area que ya operan en España.',
    'why.investors.4':'Una línea directa con quienes definen el clima de inversión en España.',
    'why.leaders.1':'Un lugar entre los directivos y responsables públicos que marcan la agenda tecnológica de España.',
    'why.leaders.2':'Conversaciones francas y privadas con homólogos de Silicon Valley dentro de la sede de Google.',
    'why.leaders.3':'Un espacio para alinear la estrategia pública y privada en IA y talento.',
    'why.leaders.4':'Una relación duradera con Bay Area, no una única visita.',

    'summit.title':'Dos días, con invitación, en torno a tres ideas.',
    'summit.lead':'Un encuentro reducido y deliberado para quienes escriben el próximo capítulo de España. No una feria de congresos.',
    'summit.p1.title':'Conectar','summit.p1.body':'Directivos, fundadores, responsables públicos e inversores españoles, en la misma sala que el ecosistema de Bay Area que construye la IA.',
    'summit.p2.title':'Mostrar','summit.p2.body':'Un escenario para que las empresas y el talento español muestren su trabajo ante los inversores y socios que importan.',
    'summit.p3.title':'Inspirar','summit.p3.body':'Llevamos estos referentes de vuelta a las universidades españolas, para que la próxima generación crezca sabiendo lo que es posible.',
    'summit.when':'CUÁNDO','summit.whenVal':'Primavera de 2027',
    'summit.where':'DÓNDE','summit.whereVal':'Sede de Google, Mountain View, California',
    'summit.format':'FORMATO','summit.formatVal':'Dos días, con invitación',

    'speakers.title':'Más de 20 líderes que definen el próximo capítulo de España.',
    'speakers.lead':'El programa completo se anunciará pronto. Toca cualquier tarjeta para ver el perfil.',
    'tbd.name':'Por confirmar','tbd.speaker':'Ponente','tbd.organizer':'Organización',
    'tbd.bio':'Aquí aparecerá un perfil breve cuando se confirme el programa.',

    'team.title':'Las personas que organizan la cumbre.',
    'team.lead':'Arrastra para explorar. Toca una tarjeta para ver el detalle.',

    'partners.title':'Colaboradores',
    'card.exit.open':'Volver al puente','card.exit.flipped':'Volver a los ponentes',
    'card.linkedin':'Ver LinkedIn','credits.label':'Créditos',
    'form.kicker.invite':'Solicitar invitación','form.kicker.sponsor':'Quiero patrocinar',
    'form.title':'Cuéntanos quién eres','form.name':'Nombre','form.email':'Email',
    'form.org':'Empresa u organización','form.note':'Algo más','form.send':'Enviar',
    'form.done':'Gracias — nos pondremos en contacto.',
    'partners.note':'Reunimos a las instituciones que están construyendo el puente entre ambos ecosistemas.',
    'partners.lead':'Instituciones, fondos y empresas que tienden puentes entre España y Bay Area. Un círculo reducido, cuidado con criterio.',
    'partners.joinA':'Un lugar para un grupo reducido de ','partners.joinB':'socios fundadores.',
    'partners.joinCta':'Explorar el patrocinio',
    'footer.legal':'© 2027 Spain Silicon Valley. Todos los derechos reservados.'
  }
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- B. LANGUAGE ---------- */
function setLanguage(lang) {
  if (!I18N[lang]) lang = 'en';
  const dict = I18N[lang];
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = dict[el.getAttribute('data-i18n')];
    if (v !== undefined) el.textContent = v;
  });
  /* Per-element copy, for content that is data rather than interface — the
     speaker roster. Cheaper than twenty dictionary keys a side, and it keeps
     each person's two languages next to each other in the markup. */
  document.querySelectorAll('[data-en]').forEach((el) => {
    const v = el.getAttribute('data-' + lang);
    if (v !== null) el.textContent = v;
  });
  document.documentElement.lang = lang;
  try { localStorage.setItem('ssv-lang', lang); } catch (e) {}
  document.querySelectorAll('.langtoggle__btn').forEach((b) => b.classList.toggle('is-active', b.dataset.lang === lang));
  refreshOpenPanels();
}

/* ---------- C. MOBILE MENU ---------- */
function initMenu() {
  const nav = document.getElementById('nav');
  const burger = document.getElementById('navBurger');
  const links = document.getElementById('navLinks');
  if (!burger || !links) return;
  const setOpen = (open) => {
    burger.classList.toggle('is-open', open);
    links.classList.toggle('is-open', open);
    nav.classList.toggle('menu-open', open);        // forces dark nav text over the ivory overlay
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setOpen(!burger.classList.contains('is-open')));
  links.querySelectorAll('.navlink, .btn').forEach((a) => a.addEventListener('click', () => setOpen(false)));
}

/* ---------- PEOPLE: click any card to flip; carousels also drag-scroll ---------- */
function initPeople() {
  // flip on click / keyboard for EVERY card (grid or carousel)
  document.querySelectorAll('.person').forEach((p) => {
    p.addEventListener('click', (e) => {
      const car = p.closest('.carousel');
      if (car && car.__moved) return;          // it was a drag, not a tap
      if (e.target.closest('a')) return;        // let the LinkedIn link through
      p.classList.toggle('is-flipped');
    });
    p.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.classList.toggle('is-flipped'); }
    });
  });
  // drag-to-scroll for carousels only
  document.querySelectorAll('.carousel').forEach((c) => {
    let down = false, startX = 0, startLeft = 0;
    c.addEventListener('pointerdown', (e) => { down = true; c.__moved = false; startX = e.clientX; startLeft = c.scrollLeft; });
    c.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 6) { c.__moved = true; c.classList.add('is-dragging'); }
      c.scrollLeft = startLeft - dx;
    });
    const end = () => { down = false; c.classList.remove('is-dragging'); };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end); c.addEventListener('pointerleave', end);
  });
}

/* ---------- D. ACCORDION ---------- */
function openPanel(item) { const p = item.querySelector('.accordion__panel'); if (p) p.style.maxHeight = p.scrollHeight + 'px'; }
function refreshOpenPanels() { document.querySelectorAll('.accordion__item.is-open').forEach(openPanel); }
function initAccordion() {
  const items = Array.from(document.querySelectorAll('.accordion__item'));
  items.forEach((item) => {
    const head = item.querySelector('.accordion__head');
    head.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      items.forEach((o) => { o.classList.remove('is-open'); o.querySelector('.accordion__panel').style.maxHeight = '0px'; o.querySelector('.accordion__head').setAttribute('aria-expanded','false'); });
      if (!isOpen) { item.classList.add('is-open'); head.setAttribute('aria-expanded','true'); openPanel(item); }
    });
  });
  refreshOpenPanels();
  window.addEventListener('resize', refreshOpenPanels);
}

/* ---------- E. SCROLL MOTION ---------- */
function initMotion() {
  // give staggered children an index so their transition-delay ramps
  document.querySelectorAll('[data-anim="stagger"]').forEach((c) => {
    Array.from(c.children).forEach((ch, i) => ch.style.setProperty('--i', i));
  });

  const targets = document.querySelectorAll('[data-anim], .mask');
  if (reduceMotion || !('IntersectionObserver' in window)) { targets.forEach((t) => t.classList.add('in')); return; }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -12% 0px' });
  targets.forEach((t) => io.observe(t));
}

/* ---------- F. NAV STATE ---------- */
function initNavState() {
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------- STAGE PROGRESS + NAV CONTEXT ----------
   One scroll handler owns everything that depends on how far we are
   through #zone (the run of sections floating on the 3D stage):
     · --zone-t  drives the CSS fallback sky, and is what scene.js's
       gradient stand-in cross-fades on when WebGL is unavailable.
     · .is-onlight flips the fixed nav from light to dark ink at the
       moment it stops floating over the sky and starts floating over
       the ivory page. */
function initStage() {
  const zone = document.getElementById('zone');
  const hero = document.getElementById('top');
  const nav = document.getElementById('nav');
  if (!zone) return;
  const root = document.documentElement;
  let ticking = false;

  const update = () => {
    const r = zone.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    const t = total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) : 0;
    root.style.setProperty('--zone-t', t.toFixed(4));
    /* --hero-p runs 0 -> 1 across the hero alone. The hero copy uses it to
       travel toward the viewer on the Z axis, so the headline reads as a plane
       standing in the scene that the camera flies through, rather than a
       caption pinned to the glass. */
    if (hero) {
      const h = hero.getBoundingClientRect();
      const p = h.height ? Math.min(Math.max(-h.top / h.height, 0), 1) : 0;
      root.style.setProperty('--hero-p', p.toFixed(4));
    }
    if (nav) nav.classList.toggle('is-onlight', r.bottom < 90);
    ticking = false;
  };
  const onScroll = () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

/* ---------- SCROLL ANIMATOR ----------
   One place that moves the page, shared by the step navigation and the calls to
   action. Driven frame by frame rather than handed to scrollTo({behavior:
   'smooth'}): the browser silently cancels a smooth scroll on any stray wheel
   event, and `html { scroll-behavior: smooth }` means even a plain
   scrollTo(x, y) is animated — so the "just jump there" path never jumped.
   Every seek here is explicitly instant. */
const glide = (() => {
  let raf = 0, onDone = null;
  const seek = (y) => {
    try { window.scrollTo({ top: y, behavior: 'instant' }); }
    catch (e) { window.scrollTo(0, y); }
  };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; onDone = null; };
  const to = (y, done) => {
    stop();
    const from = window.scrollY, dist = Math.round(y) - from;
    if (reduceMotion || Math.abs(dist) < 2) { seek(Math.round(y)); if (done) done(); return; }
    /* Long hops get more time, but not proportionally — the flight would crawl
       across the length of the bridge otherwise. */
    const T = Math.min(2600, 950 + Math.abs(dist) * 0.42);
    const t0 = performance.now();
    onDone = done;
    const tick = (now) => {
      const p = Math.min((now - t0) / T, 1);
      /* Smoothstep, not easeInOutCubic. Both start and end at a standstill, but
         the cubic's midpoint runs at THREE times the average speed where this
         runs at one and a half — that spike in the middle is what read as
         aggressive, and no amount of extra duration fixes it on its own. */
      const e = p * p * (3 - 2 * p);
      seek(Math.round(from + dist * e));
      if (p < 1) { raf = requestAnimationFrame(tick); return; }
      raf = 0;
      const f = onDone; onDone = null; if (f) f();
    };
    raf = requestAnimationFrame(tick);
  };
  return { to, seek, stop, get busy() { return raf !== 0; } };
})();

/* ---------- STEP NAVIGATION ----------
   The page is a flight, not a document: scrolling it freely means one trackpad
   flick can carry the camera past three sections before it settles, which is
   what "too sensitive" actually was — not speed, but that nothing ever landed
   anywhere. Each gesture now advances exactly one station (scene.js publishes
   where they are, by searching its own camera path for the frames worth
   stopping on), and the page eases there.

   Only while the 3D stage is running. Without WebGL this is an ordinary
   document and hijacking the wheel on it would be indefensible. */
function initSteps() {
  const zone = document.getElementById('zone');
  if (!zone) return;

  /* Two different questions, which were one before and should not have been.
     `staged` is whether this page is a flight at all — without WebGL it is an
     ordinary document and hijacking the wheel on one is indefensible. `busyUI`
     is whether something in front of the flight owns the input right now. The
     difference matters: while the form is open or a card is focused we still
     swallow the wheel, we just do not step. Letting it through scrolled the
     flight out from under them. */
  const staged = () => document.documentElement.classList.contains('stage-on');
  const busyUI = () => document.body.classList.contains('form-open')
    || document.body.classList.contains('card-open');
  /* Only things that genuinely scroll themselves. This used to list `.nav`,
     which is `position: fixed; inset: 0 0 auto 0` — a strip across the FULL
     WIDTH of the top of the viewport. Any wheel with the pointer in the top
     ~70px bailed before preventDefault, so the page free-scrolled a little and
     no step fired, and the next gesture then snapped from wherever it had
     drifted to. That is the "sometimes it fails" — it was positional. */
  const OWNS_SCROLL = '.reqform__panel, .nav__links.is-open';

  const stops = () => {
    const end = Math.max(zone.offsetHeight - window.innerHeight, 1);
    const st = (window.__stations && window.__stations.length > 1)
      ? window.__stations : [0, 0.25, 0.5, 0.75, 1];
    return st.map((u) => Math.round(u * end));
  };
  const nearest = (y, list) => {
    let best = 0;
    for (let i = 1; i < list.length; i++) {
      if (Math.abs(list[i] - y) < Math.abs(list[best] - y)) best = i;
    }
    return best;
  };

  /* Every stop is addressable. replaceState, not location.hash — assigning the
     hash makes the browser jump to any element with that id, and #speakers is
     also a section in the markup for the no-WebGL page. */
  /* 'on-stage', not 'speakers': #speakers is also a section id in the markup,
     and a fresh load of that URL would make the browser jump to the element
     before this could correct it. */
  const HASH = ['', 'venue', 'on-stage', 'lineup', 'format', 'attend'];
  const setHash = () => {
    const want = HASH[idx] ? '#' + HASH[idx] : '';
    if (want === (window.location.hash || '')) return;
    try { history.replaceState(null, '', want || window.location.pathname); } catch (e) {}
  };

  let idx = -1;                      // the station we are on, or heading for
  const navlinks = Array.prototype.slice.call(document.querySelectorAll('.navlink[data-station]'));
  /* A link can own more than one stop: "Speakers" covers both the sign that
     announces them and the wall itself, so standing at either lights it. */
  const mark = () => {
    for (let i = 0; i < navlinks.length; i++) {
      const to = Number(navlinks[i].dataset.station);
      const from = navlinks[i].dataset.from !== undefined ? Number(navlinks[i].dataset.from) : to;
      navlinks[i].classList.toggle('is-here', idx >= from && idx <= to);
    }
  };
  const settle = () => { const l = stops(); idx = nearest(window.scrollY, l); mark(); setHash(); return l; };

  const go = (i, list) => {
    const l = list || stops();
    idx = Math.max(0, Math.min(l.length - 1, i));
    mark();
    setHash();
    glide.to(l[idx]);
  };
  let userMoved = false;
  const step = (dir) => { userMoved = true; const l = idx < 0 ? settle() : stops(); go(idx + dir, l); };

  /* One step per gesture. A trackpad flick fires wheel events for the best part
     of a second after the fingers lift, so a burst counts once: the next step
     needs a fresh burst, which is what makes the page feel deliberate rather
     than twitchy. */
  let lastWheel = 0, armed = true, travel = 0;
  window.addEventListener('wheel', (e) => {
    if (!staged()) return;
    if (e.target.closest && e.target.closest(OWNS_SCROLL)) return;
    e.preventDefault();                            // the flight never scrolls freely
    if (busyUI()) return;
    /* Normalise: a mouse reporting DOM_DELTA_LINE sends ~3 per click where a
       trackpad sends pixels, and the travel budget below has to compare like
       with like. */
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
    if (Math.abs(e.deltaX) > Math.abs(dy)) return;   // a sideways swipe is not a step
    const now = performance.now();
    /* Re-arm on a pause OR on distance. The pause alone was the whole test, so
       a mouse wheel spun steadily — events closer together than the gap — armed
       once and then went dead until the reader stopped. */
    if (now - lastWheel > 170) { armed = true; travel = 0; }
    lastWheel = now;
    travel += Math.abs(dy);
    if (!armed && travel > 900) { armed = true; travel = 0; }
    if (!armed || Math.abs(dy) < 1.5) return;
    armed = false; travel = 0;
    step(dy > 0 ? 1 : -1);
  }, { passive: false });

  let touchY = null;
  window.addEventListener('touchstart', (e) => {
    const own = e.target.closest && e.target.closest(OWNS_SCROLL);
    touchY = (staged() && !busyUI() && !own && e.touches.length === 1)
      ? e.touches[0].clientY : null;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (touchY === null) return;
    if (e.cancelable) e.preventDefault();          // no native scroll underneath
  }, { passive: false });
  window.addEventListener('touchend', (e) => {
    if (touchY === null) return;
    const dy = touchY - e.changedTouches[0].clientY;
    touchY = null;
    if (Math.abs(dy) > 34) step(dy > 0 ? 1 : -1);
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (!staged() || busyUI()) return;
    const el = document.activeElement;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    const l = stops();
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0, l); }
    else if (e.key === 'End') { e.preventDefault(); go(l.length - 1, l); }
  });

  /* Each link names its own station. It used to send them to whichever station
     sat nearest the DOM section they pointed at, which was a guess — and the
     labels it was guessing from ("Why Spain", "Partners") had no counterpart in
     the flight at all. The href stays for the no-WebGL page. */
  navlinks.forEach((a) => {
    a.addEventListener('click', (e) => {
      if (!staged()) return;
      e.preventDefault();
      userMoved = true;
      go(Number(a.dataset.station));
    });
  });

  /* Anything that moves the page by other means — a hash on load, the CTA
     flight, the reader dragging the scrollbar — leaves idx stale. */
  window.addEventListener('scroll', () => { if (!glide.busy) settle(); }, { passive: true });
  window.addEventListener('resize', () => { idx = -1; });

  /* A stop named in the address bar wins over wherever the browser restored to.
     Instant, not a glide: this is an arrival, not a step. */
  const fromHash = () => {
    const name = (window.location.hash || '').replace('#', '');
    const i = HASH.indexOf(name);
    if (i > 0) { const l = stops(); idx = i; mark(); glide.seek(l[i]); return true; }
    return false;
  };
  window.addEventListener('hashchange', () => { if (staged()) fromHash(); });
  /* scene.js is a module and publishes the stations well after this runs — it
     has three.js to fetch and parse first. It says when they are ready rather
     than this guessing at a delay. */
  window.addEventListener('stations', () => { if (!userMoved && !fromHash()) settle(); });
  if (!fromHash()) settle();
  window.__goStation = (i) => go(i);
  window.__lastStation = () => stops().length - 1;
}

/* ---------- REQUEST FORM ----------
   Either call to action runs the flight to the end first, then opens the form,
   so the journey always resolves at the tunnel rather than being skipped. */
function initRequestForm() {
  const panel = document.getElementById('reqForm');
  const zone = document.getElementById('zone');
  if (!panel || !zone) return;
  const kicker = document.getElementById('reqKicker');
  const fields = document.getElementById('reqFields');
  const done = document.getElementById('reqDone');
  let opening = false;

  const open = (kind) => {
    if (kicker) kicker.setAttribute('data-i18n', 'form.kicker.' + kind);
    setLanguage(document.documentElement.lang === 'es' ? 'es' : 'en');
    panel.hidden = false;
    document.body.classList.add('form-open');
    const first = fields && fields.querySelector('input');
    if (first) first.focus({ preventScroll: true });
  };
  const close = () => {
    panel.hidden = true;
    document.body.classList.remove('form-open');
    if (done) done.hidden = true;
    if (fields) fields.querySelectorAll('input, textarea, button').forEach((el) => { el.hidden = false; });
  };

  /* Fly the rest of the trip rather than jumping, then open the form — so the
     journey always resolves at the tunnel instead of being skipped. */
  const runToEnd = (kind) => {
    if (opening) return;
    const end = zone.offsetHeight - window.innerHeight;
    if (reduceMotion || window.scrollY >= end - 40) {
      glide.seek(end); open(kind); return;
    }
    opening = true;
    glide.to(end, () => { opening = false; open(kind); });
  };

  document.querySelectorAll('[data-cta]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); runToEnd(el.getAttribute('data-cta')); });
  });
  const closeBtn = document.getElementById('reqClose');
  if (closeBtn) closeBtn.addEventListener('click', close);
  panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });

  if (fields) fields.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!fields.checkValidity()) { fields.reportValidity(); return; }
    /* No endpoint is wired yet — this only acknowledges. Point it at your form
       handler when there is one. */
    fields.querySelectorAll('label, button[type="submit"]').forEach((el) => { el.hidden = true; });
    if (done) done.hidden = false;
  });
}

/* ---------- INIT ---------- */
/* ---------- COUNT-UP STATS ---------- */
function initStats() {
  const nums = document.querySelectorAll('.stat__num[data-count]');
  if (!nums.length) return;
  const run = (el) => {
    const target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduceMotion) { el.textContent = String(target); return; }
    const dur = 1200; let start = null;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (ts) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      el.textContent = String(Math.round(ease(p) * target));
      if (p < 1) requestAnimationFrame(step); else el.textContent = String(target);
    };
    requestAnimationFrame(step);
  };
  if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.6 });
  nums.forEach((n) => io.observe(n));
}

/* ---------- HERO HEADLINE 3D PARALLAX ----------
   The headline shifts and tilts with the mouse in the same direction as the
   3D camera, so the copy reads as part of the scene rather than an overlay. */
function initHeroText() {
  const title = document.querySelector('.hero__title');
  if (!title || reduceMotion || !window.matchMedia('(hover: hover)').matches) return;
  window.addEventListener('pointermove', (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    title.style.transform = 'translate3d(' + (x * -14).toFixed(1) + 'px,' + (y * -8).toFixed(1) + 'px,0) rotateY(' + (x * 3.5).toFixed(1) + 'deg) rotateX(' + (-y * 2.2).toFixed(1) + 'deg)';
  }, { passive: true });
}

/* Which language to open in.
   Browser preference, not IP geolocation. Accept-Language is the visitor's own
   declared preference: it needs no network call, no consent banner, and it is
   right for the two cases geolocation gets most wrong here — a Spaniard reading
   this from Mountain View, and a Spanish speaker anywhere in the Americas.
   Priority: an explicit choice they made before > browser preference > English.

   navigator.languages, not navigator.language: the latter is only the top entry,
   so a visitor whose order is [ca, es, en] would have been served English. Walk
   the list and take the first that resolves. Catalan, Galician and Basque
   resolve to Spanish — closer to right than English for this audience. */
function preferredLanguage() {
  let saved; try { saved = localStorage.getItem('ssv-lang'); } catch (e) {}
  if (saved === 'es' || saved === 'en') return saved;
  const list = (navigator.languages && navigator.languages.length)
    ? navigator.languages : [navigator.language || ''];
  const ES = ['es', 'ca', 'gl', 'eu'];
  for (const tag of list) {
    const primary = String(tag).toLowerCase().split('-')[0];
    if (ES.indexOf(primary) >= 0) return 'es';
    if (primary === 'en') return 'en';
  }
  return 'en';
}

/* Swap a monogram for a headshot if one has been supplied. Speculative: a 404
   simply leaves the monogram, so adding images/speaker-<slug>.webp is the whole
   of the work — the same convention scene.js uses for the 3D cards. */
function initPortraits() {
  document.querySelectorAll('.person__mono[data-photo]').forEach((el) => {
    const src = el.getAttribute('data-photo');
    const probe = new Image();
    probe.onload = () => {
      const img = document.createElement('img');
      img.src = src; img.alt = ''; img.loading = 'lazy';
      img.width = 560; img.height = 746;
      el.parentNode.insertBefore(img, el);
      el.remove();
    };
    probe.src = src;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const initial = preferredLanguage();
  initPortraits();

  document.querySelectorAll('.langtoggle__btn').forEach((b) => b.addEventListener('click', () => setLanguage(b.dataset.lang)));

  initMenu();
  initAccordion();
  initMotion();
  initNavState();
  initStage();
  /* The 3D speaker cards are opened from scene.js; this only wires the way out. */
  const cardBack = document.getElementById('cardBack');
  if (cardBack) cardBack.addEventListener('click', () => window.__closeCard && window.__closeCard());
  /* Four ways, because the wall is a grid. scene.js reports which of them lead
     anywhere so the ones at the edge grey out rather than silently doing
     nothing. */
  const DIRS = [['cardPrev', -1, 0, 'l'], ['cardNext', 1, 0, 'r'],
                ['cardUp', 0, -1, 'u'], ['cardDown', 0, 1, 'd']];
  const dirBtns = DIRS.map(([id, dx, dy, key]) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => window.__stepCard && window.__stepCard(dx, dy));
    return { el, key };
  });
  /* scene.js calls this whenever the focused card changes or turns over. The
     exit label follows the state: from the profile side it goes back to the
     speakers, from the gallery it goes back to the trip. */
  window.__cardChrome = (state) => {
    const back = document.getElementById('cardBack');
    if (back) back.setAttribute('data-i18n', state.flipped ? 'card.exit.flipped' : 'card.exit.open');
    const li = document.getElementById('cardLinkedin');
    if (li && state.url) li.href = state.url;   // scene.js owns whether it is shown
    for (let i = 0; i < dirBtns.length; i++) {
      if (dirBtns[i].el) dirBtns[i].el.disabled = !(state.can && state.can[dirBtns[i].key]);
    }
    setLanguage(document.documentElement.lang === 'es' ? 'es' : 'en');
  };
  initSteps();
  initRequestForm();
  initPeople();
  initStats();
  initHeroText();
  setLanguage(initial);
});
