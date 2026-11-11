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

// Centerline masks follow each letter's pen strokes, clipped to the original font.
const heroTitle = document.querySelector('#hero-title');
const loveWord = heroTitle.querySelector('.slogan-love');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const penStrokes = {
  E:['M .12 .02 V .98','M .12 .1 H .95','M .12 .5 H .82','M .12 .9 H .95'],
  d:['M .85 .48 C .15 .2,-.12 1,.5 .9 C 1 .9,1 .35,.5 .35','M .88 .02 V .98'],
  u:['M .12 .02 V .65 C .12 1.15,.88 1.1,.88 .6 V .02','M .88 .55 V .98'],
  c:['M .92 .22 C .45 -.18,.08 .12,.1 .55 C .08 1,.65 1.2,.92 .78'],
  a:['M .86 .25 C .48 -.2,.08 .1,.1 .53 C .08 1.08,.88 1.14,.88 .55 C .88 .1,.6 .04,.4 .1','M .89 .02 V .98'],
  r:['M .13 .02 V .98','M .13 .45 Q .35 -.05,.95 .14'],
  e:['M .12 .52 H .9 C 1 -.1,.08 -.1,.1 .52 C .08 1.15,.7 1.15,.95 .8'],
  s:['M .9 .2 C .5 -.18,-.15 .1,.2 .43 C .4 .6,1 .5,.88 .83 C .72 1.12,.13 1,.08 .78'],
  m:['M .1 .02 V .98','M .1 .4 C .1 -.05,.5 -.05,.5 .4 V .98','M .5 .4 C .5 -.05,.9 -.05,.9 .4 V .98'],
  o:['M .55 .1 C -.08 .05,-.08 .94,.5 .91 C 1.1 .95,1.1 .05,.55 .1'],
  n:['M .12 .02 V .98','M .12 .4 C .12 -.05,.88 -.05,.88 .4 V .98'],
  l:['M .5 .02 V .98'],
  G:['M .9 .22 C .5 -.2,.1 .1,.1 .5 C .1 1.05,.8 1.15,.9 .55 H .55'],
  i:['M .5 .02 V .12','M .5 .35 V .98'],
  D:['M .12 .02 V .98','M .12 .1 C 1.15 -.05,1.15 1.05,.12 .9']
};
let inkId = 0;
function prepareInk() {
  if (!window.titleGlyphs || heroTitle.dataset.inkReady) return;
  let clock = .15;
  const ns = 'http://www.w3.org/2000/svg';
  function svgNode(name, attributes) {
    const node = document.createElementNS(ns, name);
    for (const [key,value] of Object.entries(attributes)) node.setAttribute(key,value);
    return node;
  }
  for (const line of heroTitle.querySelectorAll('.title-opening,.slogan-love,.slogan-tail')) {
    const font = titleGlyphs[line.classList.contains('slogan-tail') ? 'regular' : 'bold'];
    const style = getComputedStyle(line);
    const size = parseFloat(style.fontSize);
    const height = parseFloat(style.lineHeight) / size * font.units;
    const baseline = (height - (font.asc - font.desc)) / 2 + font.asc;
    const fragment = document.createDocumentFragment();
    for (const char of line.textContent) {
      if (char === ' ') { fragment.append(document.createTextNode(' ')); clock += .035; continue; }
      const glyph = font.glyphs[char];
      const strokes = penStrokes[char];
      if (!glyph || !strokes) { fragment.append(document.createTextNode(char)); continue; }
      const span = document.createElement('span');
      span.className = 'ink-letter'; span.textContent = char; span.setAttribute('aria-hidden','true');
      line.append(span);
      const width = span.getBoundingClientRect().width / size * font.units;
      const svg = svgNode('svg', {viewBox:`0 ${-baseline} ${width} ${height}`, 'aria-hidden':'true',focusable:'false'});
      const id = `letter-ink-${++inkId}`;
      const defs = svgNode('defs', {});
      const mask = svgNode('mask', {id,maskUnits:'userSpaceOnUse',x:-100,y:-baseline-100,width:width+200,height:height+200,style:'mask-type:alpha'});
      const [left,bottom,right,top] = glyph.bounds;
      const duration = line === loveWord ? .33 : line.classList.contains('slogan-tail') ? .16 : .24;
      for (const [index,path] of strokes.entries()) {
        const stroke = svgNode('path',{d:path,fill:'none',stroke:'white','stroke-width':Math.max(.32,Math.min(1.2,(top-bottom)/(right-left)*.22)),'stroke-linecap':'round','stroke-linejoin':'round',pathLength:1,transform:`translate(${left},${-top}) scale(${right-left},${top-bottom})`,class:'ink-stroke'});
        stroke.style.setProperty('--ink-delay',`${clock + index * duration / strokes.length}s`);
        stroke.style.setProperty('--ink-duration',`${duration / strokes.length}s`);
        mask.append(stroke);
      }
      const finish = svgNode('rect',{x:-100,y:-baseline-100,width:width+200,height:height+200,fill:'white',class:'ink-finish'});
      finish.style.setProperty('--ink-end',`${clock+duration}s`); mask.append(finish);
      defs.append(mask);svg.append(defs);
      const group = svgNode('g',{mask:`url(#${id})`});
      group.append(svgNode('path',{d:glyph.path,transform:'scale(1,-1)',fill:'#24365F'}));svg.append(group);span.append(svg);
      fragment.append(span); clock += duration + .025;
    }
    line.replaceChildren(fragment);
    if (line === loveWord) { heroTitle.style.setProperty('--paint-delay',`${clock}s`); clock += .6; }
    else clock += .1;
  }
  heroTitle.dataset.inkReady = 'true';
}
function writeTitle() {
  heroTitle.classList.remove('is-writing');
  if (reducedMotion.matches) return;
  prepareInk();
  void heroTitle.offsetWidth;
  heroTitle.classList.add('is-writing');
}
document.fonts.ready.then(writeTitle);
loveWord.addEventListener('click',writeTitle);
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)heroTitle.classList.remove('is-writing');});
