/* Shared regular-grading format. Uses the existing Wix criteriaJson field. */
(() => {
  const CONFIG_STUDENT = 9998;
  const CONFIG_NAME = "__REGULAR_ASSIGNMENTS_CONFIG__";
  const DEFAULT_ID = "regular-1";
  const ID_PREFIX = "Assignment ID: ";
  const blank = () => ({ kind: "blank", value: null });

  function normalize(raw) {
    if (!raw || raw.kind === "blank" || raw.value == null || raw.value === "") return blank();
    if (raw.kind === "check") return { kind: "check", value: 10 };
    if (raw.kind === "x") return { kind: "x", value: 0 };
    const value = Number(raw.value);
    return Number.isFinite(value) && value >= 0 && value <= 10
      ? { kind: "number", value: Math.round(value * 100) / 100 }
      : blank();
  }

  function rows(item) {
    if (Array.isArray(item?.rows)) return item.rows;
    try {
      const parsed = JSON.parse(item?.criteriaJson || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  function isConfig(item) {
    return Number(item?.studentNumber) === CONFIG_STUDENT || item?.studentName === CONFIG_NAME;
  }

  function rowId(row, index = 0) {
    const match = String(row?.observation || "").match(/^Assignment ID: ([A-Za-z0-9_-]+)(?:\n|$)/);
    return match?.[1] || `regular-${index + 1}`;
  }

  function title(assignment, index = 0) {
    return String(assignment?.title || "").trim() || (index ? `Assignment ${index + 1}` : "Regular grade");
  }

  function cleanAssignments(items) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).flatMap((item, index) => {
      const id = String(item?.id || "");
      if (!/^[A-Za-z0-9_-]+$/.test(id) || seen.has(id)) return [];
      seen.add(id);
      return [{ id, title: title(item, index).slice(0, 120) }];
    });
  }

  function assignments(items) {
    const config = items.find(isConfig);
    const sources = config ? [config] : items.filter(item => !isConfig(item));
    const found = cleanAssignments(sources.flatMap(item => rows(item).map((row, index) => ({
      id: rowId(row, index), title: row?.criterion
    }))));
    return found.length ? found : [{ id: DEFAULT_ID, title: "Regular grade" }];
  }

  function fromRow(row) {
    if (!row || row.level === "Not marked" || row.points == null) return blank();
    const level = String(row.level || "");
    const kind = level.startsWith("✓") ? "check" : level === "X" ? "x" : "number";
    return normalize({ kind, value: row.points });
  }

  function grades(item, sessionActivity = "") {
    const result = {};
    const criteria = rows(item);
    if (criteria.length) {
      criteria.forEach((row, index) => { result[rowId(row, index)] = fromRow(row); });
    } else if (Number(item?.markedCriteria) > 0) {
      const score = Number(item.scoreTotal);
      const checklist = sessionActivity === "Regular grading · Checklist";
      result[DEFAULT_ID] = normalize({
        kind: checklist && score === 10 ? "check" : checklist && score === 0 ? "x" : "number",
        value: score
      });
    }
    return result;
  }

  function toRow(assignment, grade, index = 0) {
    const value = normalize(grade);
    return {
      criterion: title(assignment, index), max: 10,
      level: value.kind === "blank" ? "Not marked" : value.kind === "check" ? "✓ Checked" : value.kind === "x" ? "X" : "Numerical grade",
      points: value.kind === "blank" ? null : value.value,
      observation: `${ID_PREFIX}${assignment.id}`
    };
  }

  function summary(studentGrades, columns) {
    const marked = columns.map(column => normalize(studentGrades?.[column.id])).filter(grade => grade.kind !== "blank");
    return {
      markedCriteria: marked.length,
      total: marked.length ? Math.round(marked.reduce((sum, grade) => sum + grade.value, 0) / marked.length * 100) / 100 : 0
    };
  }

  window.LVRegularGrading = { CONFIG_STUDENT, CONFIG_NAME, DEFAULT_ID, blank, normalize, rows, isConfig, rowId, title, cleanAssignments, assignments, fromRow, grades, toRow, summary };
})();
