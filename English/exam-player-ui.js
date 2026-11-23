/* Shared shell and local persistence. Never changes exam answers or scoring. */
(() => {
  'use strict';
  const shell = document.getElementById('examShell');
  if (!shell) return;
  const stateReaders = new Map();
  const clearedKeys = new Set();
  const App = window.UEPLVApp || (window.UEPLVApp = {});
  const audioAttempts = new WeakMap();
  App.playExamAudio = async (audio, timeoutMs = 15000) => {
    const attempt = (audioAttempts.get(audio) || 0) + 1;
    audioAttempts.set(audio, attempt);
    let expired = false;
    let timer;
    try {
      await Promise.race([
        Promise.resolve(audio.play()).then(() => {
          if (expired && audioAttempts.get(audio) === attempt) audio.pause();
        }),
        new Promise((resolve, reject) => {timer = setTimeout(() => {
          expired = true;
          if (audioAttempts.get(audio) === attempt) audio.pause();
          reject(new Error('Audio did not start in time.'));
        }, timeoutMs);})
      ]);
    } finally {clearTimeout(timer);}
  };
  function storageNotice(show) {
    let warning = document.getElementById('localSaveWarning');
    if (show && !warning) {
      warning = document.createElement('div');
      warning.id = 'localSaveWarning';
      warning.className = 'local-save-warning';
      warning.setAttribute('role', 'status');
      warning.textContent = "Your browser cannot save answers on this device. Keep this page open until you submit your exam.";
      document.body.append(warning);
    }
    if (!show) warning?.remove();
    document.documentElement.style.setProperty('--storage-warning-h', show ? `${warning.getBoundingClientRect().height}px` : '0px');
  }
  App.saveLocalState = (key, state) => {
    if (clearedKeys.has(key)) return true;
    try {
      localStorage.setItem(key, JSON.stringify(state));
      storageNotice(false);
      return true;
    } catch {
      storageNotice(true);
      return false;
    }
  };
  App.registerLocalState = (key, read) => {clearedKeys.delete(key); stateReaders.set(key, read);};
  App.clearLocalState = key => {
    clearedKeys.add(key);
    stateReaders.delete(key);
    try { localStorage.removeItem(key); } catch { /* No persistent state to clear. */ }
    storageNotice(false);
  };
  const flush = () => {
    for (const [key, read] of stateReaders) {
      const state = read();
      if (state?.student?.name) App.saveLocalState(key, state);
    }
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {if (document.hidden) flush();});
  window.addEventListener('resize', () => {if (document.getElementById('localSaveWarning')) storageNotice(true);});
  shell.removeAttribute('aria-live');
  shell.setAttribute('aria-label', 'UEPLV practice exam');
  const menuButton = document.getElementById('menuBtn');
  const menu = document.getElementById('sideMenu');
  const modal = document.getElementById('modalRoot');
  const gate = document.getElementById('audioGate');
  const icons = {
    menuBtn: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    notesBtn: '<path d="M14 4H5v16h14v-9M12 12l1-4 6-6 3 3-6 6-4 1z"/>'
  };
  for (const [id, drawing] of Object.entries(icons)) {
    const button = document.getElementById(id);
    if (button) button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${drawing}</svg>`;
  }
  menuButton?.setAttribute('aria-controls', 'sideMenu');
  menu?.setAttribute('role', 'dialog');
  menu?.setAttribute('aria-label', 'Exam menu');
  menu?.setAttribute('aria-modal', 'true');
  const nav = document.getElementById('bottomNav');
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Exam parts and questions');
  const describeNavigation = () => {
    for (const button of nav.querySelectorAll('button.q-pill')) {
      button.setAttribute('aria-label', `Question ${button.textContent.trim()}${button.classList.contains('answered') ? ', answered' : ''}${button.classList.contains('flagged') ? ', flagged' : ''}`);
      if (button.classList.contains('active')) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    document.getElementById('flagBtn')?.setAttribute('aria-pressed', String(document.getElementById('flagBtn').classList.contains('flagged')));
  };
  new MutationObserver(describeNavigation).observe(nav, {childList:true});
  new MutationObserver(describeNavigation).observe(document.getElementById('flagBtn'), {attributes:true, attributeFilter:['class']});
  describeNavigation();
  // Answer popovers are appended to body by several legacy renderers. Keep
  // their choices inside the usable exam viewport, including in landscape.
  const fitPopover = popup => {
    popup.setAttribute('aria-label', 'Answer options');
    const content = document.getElementById('mainContent').getBoundingClientRect();
    const top = content.top + 8;
    const bottom = content.bottom - 8;
    popup.style.maxHeight = `${Math.max(40, bottom - top)}px`;
    popup.style.overflowY = 'auto';
    const box = popup.getBoundingClientRect();
    popup.style.top = `${Math.max(top, Math.min(box.top, bottom - box.height))}px`;
    popup.style.left = `${Math.max(8, Math.min(box.left, innerWidth - box.width - 8))}px`;
  };
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType === 1 && node.matches('.choice-popover')) fitPopover(node);
    }
  }).observe(document.body, {childList:true});
  window.addEventListener('resize', () => document.querySelectorAll('.choice-popover').forEach(fitPopover));
  // Opening a part means reading its instructions, not focusing an answer.
  // Legacy renderers also schedule focus/scroll after rendering, and image
  // decoding can adjust scroll anchoring. Keep the introduction stable until
  // the candidate deliberately scrolls, types or selects a question.
  const content = document.getElementById('mainContent');
  let introEpoch = 0;
  let introPending = false;
  App.isOpeningPart = () => introPending;
  const resetIntroScroll = () => {
    if (!introPending) return;
    // Explicitly stop an earlier question's smooth scroll. In WebKit a zero
    // scrollTop assignment can leave that animation running into the new part.
    content.scrollTo({top:0, left:0, behavior:'instant'});
  };
  // Reset after a renderer replaces the question DOM, before the next paint.
  // requestAnimationFrame alone can be deferred on a busy browser frame.
  new MutationObserver(resetIntroScroll).observe(content, {childList:true});
  const releaseIntro = () => {
    introEpoch += 1;
    introPending = false;
    content.classList.remove('part-intro-open');
  };
  const showPartIntro = () => {
    const epoch = ++introEpoch;
    introPending = true;
    content.classList.add('part-intro-open');
    const reset = () => {if (introEpoch === epoch) resetIntroScroll();};
    reset();
    requestAnimationFrame(() => {
      reset();
      Promise.allSettled([...content.querySelectorAll('img')].map(image => image.decode())).then(reset);
    });
    setTimeout(reset, 80);
  };
  const isPartNavigation = target => target.closest?.('.part-nav-card') && !target.closest?.('.q-pill');
  document.addEventListener('pointerdown', event => {if (!isPartNavigation(event.target)) releaseIntro();}, true);
  document.addEventListener('wheel', releaseIntro, {capture:true, passive:true});
  document.addEventListener('keydown', releaseIntro, true);
  document.addEventListener('focusin', event => {
    if (introPending && content.contains(event.target) && event.target.matches('input, textarea, select')) {
      releaseIntro();
    }
  }, true);
  document.getElementById('studentForm').addEventListener('submit', showPartIntro);
  document.addEventListener('click', event => {
    if (isPartNavigation(event.target)) showPartIntro();
    else releaseIntro();
  }, true);
  const focusable = root => [...root.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.disabled && el.getClientRects().length && !el.closest('[inert]'));
  let active = null;
  let returnFocus = null;
  let lastTrigger = null;
  // Safari does not necessarily focus a button when it is clicked.
  document.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    if (button && !button.closest('#modalRoot, #sideMenu, #audioGate, .choice-popover')) lastTrigger = button;
  }, true);
  function syncDialog() {
    const next = [modal, gate, menu].find(el => el && !el.classList.contains('hidden') && (el !== menu || el.classList.contains('open'))) || null;
    menuButton?.setAttribute('aria-expanded', String(Boolean(menu?.classList.contains('open'))));
    if (next === active) return;
    const previous = active;
    active = next;
    if (next) {
      const dialog = next.querySelector('.modal-card, .audio-gate-card') || next;
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      const heading = dialog.querySelector('.modal-head h2, .modal-head h3, h2');
      if (heading && !dialog.hasAttribute('aria-labelledby')) {
        heading.id ||= 'examDialogTitle';
        dialog.setAttribute('aria-labelledby', heading.id);
      }
      if (!previous) returnFocus = lastTrigger || document.activeElement;
      shell.inert = true;
      document.getElementById('startScreen').inert = true;
      requestAnimationFrame(() => {
        if (active === next && !next.contains(document.activeElement)) focusable(next)[0]?.focus({preventScroll: true});
      });
    } else {
      shell.inert = false;
      document.getElementById('startScreen').inert = false;
      if (returnFocus?.isConnected && returnFocus.getClientRects().length) returnFocus.focus({preventScroll: true});
      returnFocus = null;
    }
  }
  const observer = new MutationObserver(syncDialog);
  for (const el of [modal, gate, menu]) if (el) observer.observe(el, {attributes:true, attributeFilter:['class'], childList:true});
  document.addEventListener('keydown', event => {
    if (!active) return;
    // Legacy players bind left/right to question navigation on document.
    // Inside a dialog these keys must keep their native text/caret behaviour.
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) event.stopPropagation();
    if (event.key === 'Escape' && active !== gate) {
      const close = active === menu ? document.getElementById('closeMenuBtn') : active.querySelector('[data-close-modal], .modal-head .icon-btn');
      if (close) { event.preventDefault(); event.stopPropagation(); close.click(); }
    }
    if (event.key === 'Tab') {
      const items = focusable(active);
      if (!items.length) return;
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || !active.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !active.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
  }, true);
  syncDialog();
})();
