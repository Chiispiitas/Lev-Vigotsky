/*
  Speaking workflow overrides
  - Keeps the visual report preview panel removed from the page.
  - Makes the highest rubric option the default whenever a class/student loads.
  - Fills only missing criteria, so previously adjusted lower scores are not overwritten.
*/
(function () {
  const SETTLE_DELAY = 90;
  let pendingFill = 0;

  function assessmentIsOpen() {
    const screen = document.getElementById("assessmentScreen");
    return Boolean(screen && screen.classList.contains("screen-active"));
  }

  function fillMissingHighestOptions() {
    if (!assessmentIsOpen()) return;

    const rubricCards = Array.from(document.querySelectorAll("#rubricList .rubric-card"));
    if (!rubricCards.length) return;

    rubricCards.forEach((card) => {
      const alreadySelected = card.querySelector(".option-button.selected");
      if (alreadySelected) return;

      const highestOption = card.querySelector('.option-button[data-index="0"]') || card.querySelector(".option-button");
      if (highestOption) highestOption.click();
    });
  }

  function scheduleDefaultScoreFill() {
    window.clearTimeout(pendingFill);
    pendingFill = window.setTimeout(fillMissingHighestOptions, SETTLE_DELAY);
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest(".class-card, #previousStudent, #nextStudent, #resetCurrent, #markExcellent")) {
      scheduleDefaultScoreFill();
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target && event.target.id === "studentSelect") scheduleDefaultScoreFill();
  });

  document.addEventListener("input", (event) => {
    if (event.target && event.target.id === "studentSearch") scheduleDefaultScoreFill();
  });

  const rubricList = document.getElementById("rubricList");
  if (rubricList) {
    const observer = new MutationObserver(scheduleDefaultScoreFill);
    observer.observe(rubricList, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleDefaultScoreFill);
  } else {
    scheduleDefaultScoreFill();
  }
})();
