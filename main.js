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
    'nav.why':'Why Spain','nav.summit':'The Summit','nav.speakers':'Speakers','nav.partners':'Partners','nav.cta':'Request an invite',

    'hero.meta':'Spring 2027 · Google HQ, Mountain View',
    'hero.title1':'Where Spain meets','hero.titleAI':' Silicon Valley',
    'hero.sub':"An invitation-only summit that brings Spanish founders, investors and leaders together with the Bay Area, inside Google's headquarters.",
    'hero.scroll':'SCROLL',

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
    'speakers.lead':'The lineup lands soon. Drag to browse. Tap a card for the detail.',
    'tbd.name':'To be announced','tbd.speaker':'Speaker','tbd.organizer':'Organizer',
    'tbd.bio':'A short profile appears here once the lineup is confirmed.',

    'team.title':'The organizers behind the summit.',
    'team.lead':'Drag to browse. Tap a card for the detail.',

    'partners.title':'Partners',
    'partners.lead':'Institutions, funds and companies bridging Spain and the Bay Area. A small circle, curated with care.',
    'partners.joinA':'A place for a small number of ','partners.joinB':'founding partners.',
    'partners.joinCta':'Explore partnership',

    'footer.contact':'CONTACT','footer.follow':'FOLLOW','footer.language':'LANGUAGE',
    'footer.legal':'© 2027 Spain Silicon Valley. All rights reserved.'
  },

  es: {
    'nav.why':'Por qué','nav.summit':'La Cumbre','nav.speakers':'Ponentes','nav.partners':'Colaboradores','nav.cta':'Solicitar invitación',

    'hero.meta':'Primavera 2027 · Sede de Google, Mountain View',
    'hero.title1':'Donde España se encuentra con','hero.titleAI':' Silicon Valley',
    'hero.sub':'Una cumbre exclusiva que reúne a fundadores, inversores y líderes españoles con Bay Area, dentro de la sede de Google.',
    'hero.scroll':'Baja',

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
    'speakers.lead':'El programa llega pronto. Arrastra para explorar. Toca una tarjeta para ver el detalle.',
    'tbd.name':'Por confirmar','tbd.speaker':'Ponente','tbd.organizer':'Organización',
    'tbd.bio':'Aquí aparecerá un perfil breve cuando se confirme el programa.',

    'team.title':'Las personas que organizan la cumbre.',
    'team.lead':'Arrastra para explorar. Toca una tarjeta para ver el detalle.',

    'partners.title':'Colaboradores',
    'partners.lead':'Instituciones, fondos y empresas que tienden puentes entre España y Bay Area. Un círculo reducido, cuidado con criterio.',
    'partners.joinA':'Un lugar para un grupo reducido de ','partners.joinB':'socios fundadores.',
    'partners.joinCta':'Explorar el patrocinio',

    'footer.contact':'CONTACTO','footer.follow':'SÍGUENOS','footer.language':'IDIOMA',
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

/* ---------- PEOPLE CAROUSEL: drag to scroll, click to flip ---------- */
function initPeople() {
  document.querySelectorAll('.carousel').forEach((c) => {
    let down = false, moved = false, startX = 0, startLeft = 0;
    c.addEventListener('pointerdown', (e) => {
      down = true; moved = false; startX = e.clientX; startLeft = c.scrollLeft;
    });
    c.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 6) { moved = true; c.classList.add('is-dragging'); }
      c.scrollLeft = startLeft - dx;
    });
    const end = () => { down = false; c.classList.remove('is-dragging'); };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', end);

    c.querySelectorAll('.person').forEach((p) => {
      p.addEventListener('click', (e) => {
        if (moved) return;                      // a drag, not a tap
        if (e.target.closest('a')) return;      // let the LinkedIn link work without flipping back
        p.classList.toggle('is-flipped');
      });
      p.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.classList.toggle('is-flipped'); }
      });
    });
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

/* ---------- F. NAV STATE + HERO PARALLAX ---------- */
function initNavState() {
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initParallax() {
  if (reduceMotion) return;
  const bg = document.querySelector('.hero__bg');
  const hero = document.querySelector('.hero');
  if (!bg || !hero) return;
  let ticking = false;
  const update = () => {
    const rect = hero.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight) bg.style.transform = 'translate3d(0,' + (-rect.top * 0.16) + 'px,0) scale(1.08)';
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
  update();
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  let saved; try { saved = localStorage.getItem('ssv-lang'); } catch (e) {}
  const initial = saved || (navigator.language && navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en');

  document.querySelectorAll('.langtoggle__btn').forEach((b) => b.addEventListener('click', () => setLanguage(b.dataset.lang)));

  initMenu();
  initAccordion();
  initMotion();
  initNavState();
  initParallax();
  initPeople();
  setLanguage(initial);
});
