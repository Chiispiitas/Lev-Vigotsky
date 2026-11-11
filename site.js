'use strict';

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
document.documentElement.classList.add('js-ready');
menuButton.hidden = false;

function closeMenu(returnFocus = false) {
  nav.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.textContent = 'Menú';
  if (returnFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.textContent = open ? 'Cerrar' : 'Menú';
  nav.classList.toggle('is-open', open);
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.site-header')) closeMenu();
});
const desktop = matchMedia('(min-width: 901px)');
desktop.addEventListener('change', event => { if (event.matches) closeMenu(); });
document.querySelector('#current-year').textContent = new Date().getFullYear();

const dialog = document.querySelector('.photo-dialog');
const dialogImage = document.querySelector('#dialog-image');
const caption = document.querySelector('#photo-caption');
const source = document.querySelector('#dialog-source');
let lastPhotoButton;
document.querySelectorAll('[data-photo]').forEach(button => {
  button.addEventListener('click', () => {
    if (!dialog.showModal) {
      window.open(button.dataset.photo, '_blank', 'noopener,noreferrer');
      return;
    }
    lastPhotoButton = button;
    dialogImage.src = button.dataset.photo;
    dialogImage.alt = button.querySelector('img').alt;
    caption.textContent = button.dataset.caption;
    source.href = button.dataset.source;
    dialog.showModal();
    document.body.classList.add('dialog-open');
  });
});
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('dialog-open');
  lastPhotoButton?.focus();
});

if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const reveal = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.section-heading, .about-main, .principles article, .offer-card, .gallery-item, .learning-note').forEach(element => {
    element.dataset.reveal = '';
    element.classList.add('reveal-ready');
    reveal.observe(element);
  });
}


// Keep entire decorative owl motifs inside evenly spaced cells, without stretching a wallpaper.
const offerSection = document.querySelector('.offer-section');
const motifGrid = document.createElement('div');
motifGrid.className = 'owl-motifs';
motifGrid.setAttribute('aria-hidden', 'true');
offerSection.prepend(motifGrid);
let motifLayout = '';
function fitOwlMotifs() {
  const columns = Math.max(1, Math.floor((offerSection.clientWidth - 40) / 125));
  const rows = Math.max(1, Math.floor((offerSection.clientHeight - 40) / 125));
  const layout = `${columns}:${rows}`;
  if (layout === motifLayout) return;
  motifLayout = layout;
  motifGrid.style.setProperty('--motif-cols', columns);
  motifGrid.style.setProperty('--motif-rows', rows);
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < columns * rows; i++) {
    const image = document.createElement('img');
    image.src = 'assets/site/patterns/owl-motif-v5.webp';
    image.alt = ''; image.width = 90; image.height = 90;
    fragment.append(image);
  }
  motifGrid.replaceChildren(fragment);
}
fitOwlMotifs();
if ('ResizeObserver' in window) new ResizeObserver(fitOwlMotifs).observe(offerSection);
else window.addEventListener('resize', fitOwlMotifs);

// The title stays complete for screen readers and when motion is disabled.
const heroTitle = document.querySelector('#hero-title');
const loveWord = heroTitle.querySelector('.slogan-love');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function writeTitle() {
  heroTitle.classList.remove('is-writing');
  if (reducedMotion.matches) return;
  void heroTitle.offsetWidth;
  heroTitle.classList.add('is-writing');
}
writeTitle();
loveWord.addEventListener('click', writeTitle);
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) heroTitle.classList.remove('is-writing');
});
