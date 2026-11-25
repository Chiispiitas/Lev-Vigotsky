import { AttemptError } from "./practice.mjs";

const normalize = name => name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  .replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();

export function createHomeworkNameValidator(rosters) {
  const courses = Object.entries(rosters).map(([course, students]) => {
    const names = new Map();
    const historical = new Map();
    for (const { givenNames, surnames, legacyAliases = [] } of students) {
      const official = [...surnames, ...givenNames].join(" ");
      for (const alias of legacyAliases) historical.set(normalize(alias), official);
      const given = [...givenNames, givenNames.join(" ")];
      const family = [...surnames, surnames.join(" ")];
      for (const g of given) for (const f of family) {
        for (const value of [g + " " + f, f + " " + g]) {
          const alias = normalize(value);
          if (!names.has(alias)) names.set(alias, official);
          else if (names.get(alias) !== official) names.set(alias, null);
        }
      }
    }
    return [course, names, historical];
  });

  return ({ examId, studentName }, { legacy = false } = {}) => {
    const course = courses.find(([id]) => examId.startsWith("homework-" + id + "-"));
    if (!course) return studentName;
    const normalized = normalize(studentName);
    if (legacy && course[2].has(normalized)) return course[2].get(normalized);
    if (!/^\p{L}+(?:[-'’]\p{L}+)*(?:\s+\p{L}+(?:[-'’]\p{L}+)*)+$/u.test(studentName)) {
      throw new AttemptError(422, "Enter at least one first name and one last name.");
    }
    const official = course[1].get(normalized);
    if (official === null) throw new AttemptError(422, "More than one student matches. Enter your full name as it appears in Runachay.");
    if (!official) throw new AttemptError(422, "This name is not on this course’s class list. Check your name and last name in Runachay.");
    return official;
  };
}
