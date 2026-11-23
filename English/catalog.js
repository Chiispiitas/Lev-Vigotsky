"use strict";
const catalog = document.getElementById("catalog");
for (const level of window.UEPLV_SITE_CONFIG.levels) {
  const card = document.createElement("article");
  card.className = "exam-level";
  const primary = `practice.html?exam=${level.id}-practice-a`;
  const variation = `practice.html?exam=${level.id}-practice-b`;
  card.innerHTML = `
    <div class="level-top"><div><h2>${level.grade}</h2><p>${level.book}</p></div><strong class="level-label">${level.level}</strong></div>
    <div class="exam-links">
      <div class="practice-link"><a class="button primary" href="${primary}">Main Practice Exam</a><button class="button outline copy-btn" type="button" aria-label="Copy ${level.level} main practice exam link" data-copy="${primary}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M15 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button></div>
      <a class="text-link" href="materials.html?level=${level.id}&amp;view=drills">Practice Exercises</a>
      <a class="text-link" href="materials.html?level=${level.id}&amp;view=study">Vocabulary and Grammar</a>
      <a class="text-link" href="materials.html?level=${level.id}&amp;view=speaking">Speaking Practice</a>
    </div>
    <div class="variation-row"><a href="${variation}">Variation B</a><button class="button outline copy-btn" type="button" aria-label="Copy ${level.level} Variation B link" data-copy="${variation}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M15 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button></div>`;
  catalog.append(card);
}
catalog.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  const url = new URL(button.dataset.copy, location.href).href;
  const status = document.getElementById("copyStatus");
  try {
    await navigator.clipboard.writeText(url);
    status.textContent = "Link copied.";
    button.setAttribute("title", "Link copied");
  } catch {
    status.textContent = url;
  }
});
