"use strict";
/* ==============================================
     UEPLV App Core
     Made by: David Santana
============================================== */

(() => {
  const UEPLVApp = {
    $,
    $$,
    clamp,
    countWords,
    debounce,
    escapeHtml,
    escapeAttr,
    formatDate,
    csvCell,
    safeJson,
    normalizeClassCode,
    makeSlug,
    getApiBase,
    buildApiUrl,
    renderEndSubmitCard,
    bindEndSubmitCard
  };

  /* ----------------------------------------------
  SELECT ONE
  ---------------------------------------------- */
  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  /* ----------------------------------------------
  SELECT ALL
  ---------------------------------------------- */
  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  /* ----------------------------------------------
  CLAMP
  ---------------------------------------------- */
  function clamp(value, min, max) {
    return Math.min(Math.max(Number(value) || 0, min), max);
  }

  /* ----------------------------------------------
  COUNT WORDS
  ---------------------------------------------- */
  function countWords(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean).length;
  }

  /* ----------------------------------------------
  DEBOUNCE
  ---------------------------------------------- */
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), delay);
    };
  }

  /* ----------------------------------------------
  ESCAPE HTML
  ---------------------------------------------- */
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"]/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[char]));
  }

  /* ----------------------------------------------
  ESCAPE ATTR
  ---------------------------------------------- */
  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  /* ----------------------------------------------
  FORMAT DATE
  ---------------------------------------------- */
  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString() : String(value);
  }

  /* ----------------------------------------------
  CSV CELL
  ---------------------------------------------- */
  function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  /* ----------------------------------------------
  SAFE JSON
  ---------------------------------------------- */
  function safeJson(value, fallback = null) {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  /* ----------------------------------------------
  NORMALIZE CLASS CODE
  ---------------------------------------------- */
  function normalizeClassCode(value) {
    const raw = String(value || "").trim().toUpperCase();
    const compact = raw.replace(/[^A-Z0-9]+/g, "");
    const exact = compact.match(/^([A-Z])(\d+)$/);
    if (exact) return `${exact[1]}-${exact[2]}`;
    const loose = raw.match(/([A-Z])\D*(\d+)/);
    if (loose) return `${loose[1]}-${loose[2]}`;
    return raw;
  }

  /* ----------------------------------------------
  MAKE SLUG
  ---------------------------------------------- */
  function makeSlug(value, limit = 120) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, limit);
  }

  /* ----------------------------------------------
  GET API BASE
  ---------------------------------------------- */
  function getApiBase() {
    const config = window.UEPLV_SITE_CONFIG || {};
    return String(config.API_BASE_URL || "").replace(/\/$/, "");
  }

  /* ----------------------------------------------
  BUILD API URL
  ---------------------------------------------- */
  function buildApiUrl(path, params = {}) {
    const base = getApiBase();
    const url = new URL(`${base}/${String(path || "").replace(/^\/+/, "")}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    });
    return url.toString();
  }

  /* ----------------------------------------------
  RENDER END SUBMIT CARD
  ---------------------------------------------- */
  function renderEndSubmitCard(options = {}) {
    const label = options.label || "Submit exam";
    const title = options.title || "Ready to submit?";
    const body = options.body || "You can submit from here at any time. Review your answers first, then send your exam to UEPLV Database.";
    const buttonText = options.buttonText || label;
    const dataAttr = options.dataAttr || "data-submit-exam";
    return `
      <section class="end-submit-card" aria-label="${escapeAttr(label)}">
        <p class="eyebrow">${escapeHtml(label)}</p>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
        <button class="primary-btn end-submit-btn" type="button" ${dataAttr}>${escapeHtml(buttonText)}</button>
      </section>
    `;
  }

  /* ----------------------------------------------
  BIND END SUBMIT CARD
  ---------------------------------------------- */
  function bindEndSubmitCard(root, callback, selector = "[data-submit-exam]") {
    const button = $(selector, root || document);
    if (!button || typeof callback !== "function") return;
    button.addEventListener("click", callback);
  }

  window.UEPLVApp = UEPLVApp;
})();

/* ----------------------------------------------
   Mobile/touch assessment choice activation bridge
   ---------------------------------------------- */
(() => {
  if (window.__UEPLV_MOBILE_CHOICE_BRIDGE__) return;
  window.__UEPLV_MOBILE_CHOICE_BRIDGE__ = true;

  /*
    Cross-browser strategy:
    1. Let the browser's native click/change activation happen first.
    2. Observe click/change and cancel any fallback when native activation works.
    3. Independently observe BOTH Pointer Events and Touch Events.
       Do not assume that merely having PointerEvent means that path is reliable.
    4. If a valid tap finishes but no native activation arrives, call .click()
       after a short compatibility grace period.

    This avoids depending on browser-specific ordering between touch, pointer,
    compatibility-mouse and label/radio activation events.
  */
  const FALLBACK_DELAY_MS = 360;
  const MAX_TAP_MOVE = 48;
  const activePointers = new Map();
  const fallbackTimers = new WeakMap();
  let activeTouch = null;

  function asElement(target) {
    if (!target) return null;
    if (target.nodeType === 1) return target;
    return target.parentElement || null;
  }

  function findChoiceElement(target) {
    const element = asElement(target);
    if (!element) return null;

    if (element.matches?.('input[type="radio"]:not(:disabled)')) {
      return element;
    }

    const label = element.closest?.("label");
    const labelRadio = label?.querySelector?.('input[type="radio"]:not(:disabled)');
    if (labelRadio) return labelRadio;

    const button = element.closest?.(
      'button[data-answer-question][data-answer-value]:not(:disabled), ' +
      'button[data-popover-choice]:not(:disabled), ' +
      'button.option-btn[data-choice]:not(:disabled)'
    );
    return button || null;
  }

  function isRadio(element) {
    return Boolean(element?.matches?.('input[type="radio"]'));
  }

  function cancelFallback(element) {
    const timer = element ? fallbackTimers.get(element) : null;
    if (!timer) return;
    window.clearTimeout(timer);
    fallbackTimers.delete(element);
  }

  function scheduleFallback(element) {
    if (!element || element.disabled || !element.isConnected) return;
    if (fallbackTimers.has(element)) return;

    const timer = window.setTimeout(() => {
      fallbackTimers.delete(element);
      if (!element.isConnected || element.disabled) return;

      /*
        HTMLElement.click() is the compatibility endpoint here. It triggers the
        control's standard click/default activation behavior, including radio
        input/change events, without manufacturing a browser-specific event
        sequence ourselves.
      */
      element.click();
    }, FALLBACK_DELAY_MS);

    fallbackTimers.set(element, timer);
  }

  function movedTooFar(startX, startY, endX, endY) {
    return Math.hypot(endX - startX, endY - startY) > MAX_TAP_MOVE;
  }

  function endedOnSameChoice(choice, x, y) {
    if (!choice || typeof document.elementFromPoint !== "function") return true;
    const endTarget = document.elementFromPoint(x, y);
    return findChoiceElement(endTarget) === choice;
  }

  /*
    Buttons are successfully activated by a click event. Radios are considered
    successfully activated by their input/change event (or a direct click on
    the radio itself). This distinction matters for Safari/WebKit label taps:
    a click on the label is not enough proof that the radio was actually
    activated.
  */
  document.addEventListener("click", event => {
    const direct = asElement(event.target);
    const choice = findChoiceElement(event.target);
    if (!choice) return;

    if (!isRadio(choice) || direct === choice) {
      cancelFallback(choice);
    }
  }, true);

  document.addEventListener("input", event => {
    const target = asElement(event.target);
    if (target?.matches?.('input[type="radio"]')) cancelFallback(target);
  }, true);

  document.addEventListener("change", event => {
    const target = asElement(event.target);
    if (target?.matches?.('input[type="radio"]')) cancelFallback(target);
  }, true);

  /*
    Pointer Events path. Kept even when Touch Events are also available.
    Some Android browsers/WebViews expose PointerEvent but differ in how they
    synthesize/cancel compatibility clicks.
  */
  if ("PointerEvent" in window) {
    document.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse") return;
      const choice = findChoiceElement(event.target);
      if (!choice) return;

      activePointers.set(event.pointerId, {
        choice,
        x: event.clientX,
        y: event.clientY
      });
    }, true);

    document.addEventListener("pointerup", event => {
      if (event.pointerType === "mouse") return;
      const startState = activePointers.get(event.pointerId);
      activePointers.delete(event.pointerId);
      if (!startState) return;
      if (movedTooFar(startState.x, startState.y, event.clientX, event.clientY)) return;
      if (!endedOnSameChoice(startState.choice, event.clientX, event.clientY)) return;
      scheduleFallback(startState.choice);
    }, true);

    document.addEventListener("pointercancel", event => {
      activePointers.delete(event.pointerId);
    }, true);
  }

  /*
    Touch Events path is ALSO installed instead of being an "else" fallback.
    That gives iOS Safari and Android WebView a second independent route when
    Pointer Events are present but their compatibility click is unreliable.
  */
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
    document.addEventListener("touchstart", event => {
      const touch = event.changedTouches?.[0];
      const choice = findChoiceElement(event.target);
      activeTouch = touch && choice ? {
        choice,
        identifier: touch.identifier,
        x: touch.clientX,
        y: touch.clientY
      } : null;
    }, { capture: true, passive: true });

    document.addEventListener("touchend", event => {
      if (!activeTouch) return;

      const touch = Array.from(event.changedTouches || [])
        .find(item => item.identifier === activeTouch.identifier);
      const startState = activeTouch;
      activeTouch = null;

      if (!touch) return;
      if (movedTooFar(startState.x, startState.y, touch.clientX, touch.clientY)) return;
      if (!endedOnSameChoice(startState.choice, touch.clientX, touch.clientY)) return;
      scheduleFallback(startState.choice);
    }, { capture: true, passive: true });

    document.addEventListener("touchcancel", () => {
      activeTouch = null;
    }, { capture: true, passive: true });
  }

  /*
    Mobile CSS compatibility:
    - remove sticky desktop hover movement on coarse/no-hover devices;
    - keep scrolling/zooming browser-controlled;
    - stop WebKit text selection/callout from stealing an answer tap;
    - keep the whole label/card as an obvious interactive target.
  */
  const style = document.createElement("style");
  style.id = "ueplvMobileChoiceStyles";
  style.textContent = `
    @media (hover: none), (pointer: coarse) {
      .choice-button,
      .option-btn,
      .radio-row,
      .match-row,
      .visual-option-card {
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }

      .choice-button:hover,
      .option-btn:hover,
      .radio-row:hover,
      .match-row:hover,
      .visual-option-card:hover {
        transform: none !important;
      }
    }
  `;
  document.head.appendChild(style);
})();
