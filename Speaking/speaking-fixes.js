/*
  Speaking workflow overrides
  - Keeps the visual report preview panel removed from the page.
  - Makes the highest rubric option the default whenever a class/student loads.
  - Fills only missing criteria, so previously adjusted lower scores are not overwritten.
  - Adds multi-student grading tabs. Tabs can be added, selected, renamed by choosing a student,
    and closed while each student's saved draft remains independent.
*/
(function () {
  const SETTLE_DELAY = 90;
  let pendingFill = 0;
  let pendingTabs = 0;

  const tabsState = {
    classKey: "",
    tabs: [],
    activeId: ""
  };

  function $(selector) {
    return document.querySelector(selector);
  }

  function assessmentIsOpen() {
    const screen = document.getElementById("assessmentScreen");
    return Boolean(screen && screen.classList.contains("screen-active"));
  }

  function showToastSafe(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
      return;
    }

    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    window.setTimeout(() => toast.classList.remove("visible"), 1800);
  }

  function saveDraftSafe() {
    try {
      if (typeof window.saveStudentDraft === "function") window.saveStudentDraft();
    } catch (error) {
      // The original app also saves on selector changes; this is only a safe extra call.
    }
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

  function getCurrentClassKey() {
    const title = document.getElementById("assessmentTitle")?.textContent?.trim() || "";
    const meta = document.getElementById("classMeta")?.textContent?.trim() || "";
    return `${title}|${meta}`;
  }

  function getStudentSelect() {
    return document.getElementById("studentSelect");
  }

  function getSelectedStudentValue() {
    const select = getStudentSelect();
    return select?.value || "";
  }

  function getOptionLabel(value) {
    const select = getStudentSelect();
    const option = select ? Array.from(select.options).find(item => item.value === String(value)) : null;
    return option ? option.textContent.trim() : `Student ${value}`;
  }

  function compactStudentLabel(label) {
    const text = String(label || "Student").replace(/\s+/g, " ").trim();
    const match = text.match(/^(\d+)\.\s*(.+)$/);
    if (!match) return text;

    const number = match[1];
    const nameParts = match[2].split(" ").filter(Boolean);
    if (nameParts.length <= 2) return `${number}. ${nameParts.join(" ")}`;
    return `${number}. ${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
  }

  function uniqueTabId(studentValue) {
    return `tab-${String(studentValue || Date.now())}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function ensureTabsPanel() {
    let panel = document.getElementById("studentTabsPanel");
    if (panel) return panel;

    const studentPanel = document.querySelector(".student-panel");
    if (!studentPanel) return null;

    panel = document.createElement("section");
    panel.className = "panel tabs-panel";
    panel.id = "studentTabsPanel";
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="eyebrow dark">Multi-student mode</p>
          <h3>Student tabs</h3>
        </div>
        <button class="ghost-button" id="addStudentTab" type="button">+ Add tab</button>
      </div>
      <div class="student-tabs" id="studentTabs" role="tablist" aria-label="Open student grading tabs"></div>
      <p class="tabs-copy">Open another student in a tab, switch between them, and close tabs when you finish. Each student keeps an independent draft automatically.</p>
    `;
    studentPanel.parentNode.insertBefore(panel, studentPanel);
    return panel;
  }

  function getTabsHost() {
    ensureTabsPanel();
    return document.getElementById("studentTabs");
  }

  function resetTabsForCurrentClass() {
    const value = getSelectedStudentValue();
    tabsState.classKey = getCurrentClassKey();
    tabsState.tabs = value ? [{ id: uniqueTabId(value), studentValue: value }] : [];
    tabsState.activeId = tabsState.tabs[0]?.id || "";
    renderTabs();
  }

  function ensureTabsReady() {
    if (!assessmentIsOpen()) return;
    ensureTabsPanel();

    const classKey = getCurrentClassKey();
    if (!classKey.trim()) return;

    if (tabsState.classKey !== classKey || !tabsState.tabs.length) {
      resetTabsForCurrentClass();
      return;
    }

    const active = tabsState.tabs.find(tab => tab.id === tabsState.activeId);
    if (!active) {
      tabsState.activeId = tabsState.tabs[0]?.id || "";
      renderTabs();
    }
  }

  function scheduleTabsReady() {
    window.clearTimeout(pendingTabs);
    pendingTabs = window.setTimeout(() => {
      ensureTabsReady();
      syncActiveTabToCurrentStudent();
    }, SETTLE_DELAY + 20);
  }

  function selectStudentByValue(studentValue) {
    const select = getStudentSelect();
    if (!select || !studentValue) return;

    const exists = Array.from(select.options).some(option => option.value === String(studentValue));
    if (!exists) return;

    saveDraftSafe();
    select.value = String(studentValue);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    scheduleDefaultScoreFill();
  }

  function activateTab(tabId) {
    const tab = tabsState.tabs.find(item => item.id === tabId);
    if (!tab) return;

    tabsState.activeId = tabId;
    selectStudentByValue(tab.studentValue);
    renderTabs();
  }

  function getNextUntabbedStudentValue() {
    const select = getStudentSelect();
    if (!select) return "";

    const options = Array.from(select.options).filter(option => option.value);
    if (!options.length) return "";

    const openValues = new Set(tabsState.tabs.map(tab => String(tab.studentValue)));
    const currentValue = getSelectedStudentValue();
    const startIndex = Math.max(0, options.findIndex(option => option.value === currentValue));

    for (let offset = 1; offset <= options.length; offset += 1) {
      const option = options[(startIndex + offset) % options.length];
      if (!openValues.has(option.value)) return option.value;
    }

    return "";
  }

  function addStudentTab(studentValue = "") {
    ensureTabsReady();

    const value = String(studentValue || getNextUntabbedStudentValue() || getSelectedStudentValue());
    if (!value) return;

    const existing = tabsState.tabs.find(tab => String(tab.studentValue) === value);
    if (existing) {
      activateTab(existing.id);
      showToastSafe("Student tab already open");
      return;
    }

    const tab = { id: uniqueTabId(value), studentValue: value };
    tabsState.tabs.push(tab);
    tabsState.activeId = tab.id;
    activateTab(tab.id);
    showToastSafe("Student tab added");
  }

  function closeStudentTab(tabId) {
    const index = tabsState.tabs.findIndex(tab => tab.id === tabId);
    if (index < 0) return;

    if (tabsState.tabs.length === 1) {
      showToastSafe("Keep one student tab open");
      return;
    }

    const wasActive = tabsState.activeId === tabId;
    tabsState.tabs.splice(index, 1);

    if (wasActive) {
      const next = tabsState.tabs[Math.min(index, tabsState.tabs.length - 1)];
      tabsState.activeId = next?.id || "";
      if (next) selectStudentByValue(next.studentValue);
    }

    renderTabs();
  }

  function syncActiveTabToCurrentStudent() {
    if (!assessmentIsOpen()) return;
    ensureTabsReady();

    const value = getSelectedStudentValue();
    if (!value || !tabsState.tabs.length) return;

    const duplicate = tabsState.tabs.find(tab => String(tab.studentValue) === value);
    const active = tabsState.tabs.find(tab => tab.id === tabsState.activeId);

    if (duplicate && duplicate.id !== tabsState.activeId) {
      tabsState.tabs = tabsState.tabs.filter(tab => tab.id !== tabsState.activeId);
      tabsState.activeId = duplicate.id;
      renderTabs();
      return;
    }

    if (active) {
      active.studentValue = value;
      renderTabs();
    }
  }

  function renderTabs() {
    const host = getTabsHost();
    if (!host) return;

    host.innerHTML = "";
    tabsState.tabs.forEach((tab, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "student-tab";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", tab.id === tabsState.activeId ? "true" : "false");
      button.dataset.tabId = tab.id;
      button.innerHTML = `
        <span class="student-tab-name">${escapeHtmlSafe(compactStudentLabel(getOptionLabel(tab.studentValue)))}</span>
        <span class="student-tab-close" aria-hidden="true">×</span>
      `;
      button.title = getOptionLabel(tab.studentValue);
      button.addEventListener("click", (event) => {
        if (event.target.closest(".student-tab-close")) {
          event.stopPropagation();
          closeStudentTab(tab.id);
          return;
        }
        activateTab(tab.id);
      });
      button.addEventListener("keydown", (event) => {
        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          closeStudentTab(tab.id);
        }
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          const delta = event.key === "ArrowRight" ? 1 : -1;
          const nextIndex = (index + delta + tabsState.tabs.length) % tabsState.tabs.length;
          activateTab(tabsState.tabs[nextIndex].id);
        }
      });
      host.appendChild(button);
    });
  }

  function escapeHtmlSafe(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function bindTabEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("#addStudentTab")) {
        event.preventDefault();
        addStudentTab();
        return;
      }

      if (event.target.closest(".class-card")) {
        tabsState.classKey = "";
        tabsState.tabs = [];
        tabsState.activeId = "";
        scheduleTabsReady();
      }
    });

    document.addEventListener("change", (event) => {
      if (event.target && event.target.id === "studentSelect") {
        window.setTimeout(syncActiveTabToCurrentStudent, 30);
      }
    });

    document.addEventListener("input", (event) => {
      if (event.target && event.target.id === "studentSearch") {
        window.setTimeout(syncActiveTabToCurrentStudent, 60);
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest(".class-card, #previousStudent, #nextStudent, #resetCurrent, #markExcellent")) {
      scheduleDefaultScoreFill();
      scheduleTabsReady();
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target && event.target.id === "studentSelect") {
      scheduleDefaultScoreFill();
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target && event.target.id === "studentSearch") {
      scheduleDefaultScoreFill();
    }
  });

  const rubricList = document.getElementById("rubricList");
  if (rubricList) {
    const observer = new MutationObserver(scheduleDefaultScoreFill);
    observer.observe(rubricList, { childList: true, subtree: true });
  }

  const assessmentScreen = document.getElementById("assessmentScreen");
  if (assessmentScreen) {
    const observer = new MutationObserver(scheduleTabsReady);
    observer.observe(assessmentScreen, { attributes: true, attributeFilter: ["class"] });
  }

  bindTabEvents();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      scheduleDefaultScoreFill();
      scheduleTabsReady();
    });
  } else {
    scheduleDefaultScoreFill();
    scheduleTabsReady();
  }
})();
