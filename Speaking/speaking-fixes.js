/*
  Speaking multi-student tabs.
  IMPORTANT: No score defaults are applied here.
  Every student begins blank in each session unless that session already has a saved submission.
*/
(function () {
  const SETTLE_DELAY = 110;
  let pendingTabs = 0;

  const tabsState = {
    classKey: "",
    tabs: [],
    activeId: ""
  };

  function assessmentIsOpen() {
    const screen = document.getElementById("assessmentScreen");
    return Boolean(screen && screen.classList.contains("screen-active"));
  }

  function getStudentSelect() {
    return document.getElementById("studentSelect");
  }

  function getCurrentClassKey() {
    const title = document.getElementById("assessmentTitle")?.textContent?.trim() || "";
    const meta = document.getElementById("classMeta")?.textContent?.trim() || "";
    return `${title}|${meta}`;
  }

  function getSelectedStudentValue() {
    return getStudentSelect()?.value || "";
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
    const parts = match[2].split(" ").filter(Boolean);
    return parts.length <= 2
      ? `${match[1]}. ${parts.join(" ")}`
      : `${match[1]}. ${parts[0]} ${parts[parts.length - 1]}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function uniqueTabId(studentValue) {
    return `tab-${String(studentValue || Date.now())}-${Math.random().toString(36).slice(2, 7)}`;
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
    const classKey = getCurrentClassKey();
    if (!classKey.trim()) return;

    if (tabsState.classKey !== classKey || !tabsState.tabs.length) {
      resetTabsForCurrentClass();
      return;
    }

    if (!tabsState.tabs.some(tab => tab.id === tabsState.activeId)) {
      tabsState.activeId = tabsState.tabs[0]?.id || "";
      renderTabs();
    }
  }

  function selectStudentByValue(studentValue) {
    const select = getStudentSelect();
    if (!select || !studentValue) return;

    const exists = Array.from(select.options).some(option => option.value === String(studentValue));
    if (!exists) return;

    select.value = String(studentValue);
    select.dispatchEvent(new Event("change", { bubbles: true }));
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
    const openValues = new Set(tabsState.tabs.map(tab => String(tab.studentValue)));
    const currentValue = getSelectedStudentValue();
    const startIndex = Math.max(0, options.findIndex(option => option.value === currentValue));

    for (let offset = 1; offset <= options.length; offset += 1) {
      const option = options[(startIndex + offset) % options.length];
      if (!openValues.has(option.value)) return option.value;
    }
    return "";
  }

  function addStudentTab() {
    ensureTabsReady();
    const value = String(getNextUntabbedStudentValue() || getSelectedStudentValue());
    if (!value) return;

    const existing = tabsState.tabs.find(tab => String(tab.studentValue) === value);
    if (existing) {
      activateTab(existing.id);
      return;
    }

    const tab = { id: uniqueTabId(value), studentValue: value };
    tabsState.tabs.push(tab);
    tabsState.activeId = tab.id;
    activateTab(tab.id);
  }

  function closeStudentTab(tabId) {
    const index = tabsState.tabs.findIndex(tab => tab.id === tabId);
    if (index < 0 || tabsState.tabs.length === 1) return;

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
    if (!value) return;

    const duplicate = tabsState.tabs.find(tab => String(tab.studentValue) === value);
    const active = tabsState.tabs.find(tab => tab.id === tabsState.activeId);

    if (duplicate && duplicate.id !== tabsState.activeId) {
      tabsState.tabs = tabsState.tabs.filter(tab => tab.id !== tabsState.activeId);
      tabsState.activeId = duplicate.id;
    } else if (active) {
      active.studentValue = value;
    }
    renderTabs();
  }

  function renderTabs() {
    const host = document.getElementById("studentTabs");
    if (!host) return;

    host.innerHTML = "";
    tabsState.tabs.forEach((tab, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "student-tab";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", tab.id === tabsState.activeId ? "true" : "false");
      button.innerHTML = `
        <span class="student-tab-name">${escapeHtml(compactStudentLabel(getOptionLabel(tab.studentValue)))}</span>
        <span class="student-tab-close" aria-hidden="true">×</span>
      `;
      button.title = getOptionLabel(tab.studentValue);

      button.addEventListener("click", event => {
        if (event.target.closest(".student-tab-close")) {
          event.stopPropagation();
          closeStudentTab(tab.id);
          return;
        }
        activateTab(tab.id);
      });

      button.addEventListener("keydown", event => {
        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          closeStudentTab(tab.id);
        } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          const delta = event.key === "ArrowRight" ? 1 : -1;
          const nextIndex = (index + delta + tabsState.tabs.length) % tabsState.tabs.length;
          activateTab(tabsState.tabs[nextIndex].id);
        }
      });

      host.appendChild(button);
    });
  }

  function scheduleTabsReady() {
    window.clearTimeout(pendingTabs);
    pendingTabs = window.setTimeout(() => {
      ensureTabsReady();
      syncActiveTabToCurrentStudent();
    }, SETTLE_DELAY);
  }

  document.addEventListener("click", event => {
    if (event.target.closest("#addStudentTab")) {
      event.preventDefault();
      addStudentTab();
    }
  });

  document.addEventListener("change", event => {
    if (event.target?.id === "studentSelect") {
      window.setTimeout(syncActiveTabToCurrentStudent, 30);
    }
  });

  const assessmentScreen = document.getElementById("assessmentScreen");
  if (assessmentScreen) {
    const observer = new MutationObserver(scheduleTabsReady);
    observer.observe(assessmentScreen, { attributes: true, attributeFilter: ["class"] });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleTabsReady);
  } else {
    scheduleTabsReady();
  }
})();
