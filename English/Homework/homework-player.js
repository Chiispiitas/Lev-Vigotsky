const root = document.getElementById("assignment");
const title = document.getElementById("title");
const course = document.body.dataset.course || "First Science";
const group = document.body.dataset.group || "science";
const selectedTrack = new URLSearchParams(location.search).get("subject");
const slug = new URLSearchParams(location.search).get("quiz");
const dateLabel = value => new Intl.DateTimeFormat("en-US", {
  weekday: "short", month: "short", day: "numeric", timeZone: "America/Guayaquil"
}).format(new Date(value));

function node(tag, content) {
  const element = document.createElement(tag);
  if (content) element.textContent = content;
  return element;
}

async function load() {
  const response = await fetch("homework.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("Couldn’t load the homework. Please refresh.");
  const { version, quizzes } = await response.json();
  root.replaceChildren();
  if (!slug) {
    title.textContent = course + " homework";
    const tracks = [...new Set(quizzes.map(quiz => quiz.track))];
    for (const track of tracks) {
      if (selectedTrack && selectedTrack !== track) continue;
      if (track) root.append(node("h2", track === "business" ? "Business English" : "English"));
      const list = node("ul");
      for (const quiz of quizzes.filter(quiz => quiz.track === track)) {
        const item = node("li");
        const link = node("a", quiz.title);
        link.className = "text-link";
        link.href = "?quiz=" + encodeURIComponent(quiz.slug);
        item.append(link, document.createTextNode(" · " + dateLabel(quiz.availableFrom) + "–" + dateLabel(quiz.dueAt)));
        list.append(item);
      }
      root.append(list);
    }
    return;
  }
  const quiz = quizzes.find(item => item.slug === slug);
  if (!quiz) throw new Error("That quiz link doesn’t match a homework assignment.");
  title.textContent = quiz.title;
  document.title = quiz.title + " · " + course;
  root.append(node("p", quiz.topic + (quiz.pages ? " · Personal Best B1 pp. " + quiz.pages : "")), node("p", "Due " + dateLabel(quiz.dueAt) + " at 11:59 p.m."));
  const storageKey = "ueplv-homework:" + version + ":" + slug;
  let draft = {};
  try { draft = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { /* Storage is optional. */ }
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(draft)); } catch { /* Storage is optional. */ } };
  if (draft.receipt) {
    root.append(node("p", "Submitted. Your answers are saved."));
    return;
  }
  const now = Date.now();
  if (now < Date.parse(quiz.availableFrom) || now > Date.parse(quiz.dueAt) && !draft.pending) {
    root.append(node("p", now < Date.parse(quiz.availableFrom) ? "Opens " + dateLabel(quiz.availableFrom) + "." : "This quiz is closed."));
    return;
  }

  const form = node("form");
  const started = Date.now();
  const nameLabel = node("label", "Full name");
  const name = node("input");
  name.name = "student";
  name.className = "student-name";
  name.required = true;
  name.maxLength = 100;
  name.autocomplete = "name";
  name.value = draft.student || "";
  nameLabel.append(name);
  form.append(nameLabel);
  if (!draft.pending) {
    let number = 0;
    for (const section of quiz.sections) {
      if (section.id === "listening") {
        const audio = node("audio");
        audio.className = "practice-audio";
        audio.controls = true;
        audio.preload = "metadata";
        audio.src = "audio/" + quiz.slug + ".mp3";
        form.append(node("h2", "Listen"), node("p", "Play it again if you need to."), audio);
      } else {
        form.append(node("h2", section.title || "Quick practice"));
        if (section.stimulus) form.append(node("p", section.stimulus));
      }
      for (const question of section.questions) {
        const field = node("fieldset");
        field.className = "question-panel";
        field.append(node("legend", (++number) + ". " + question.prompt));
        const controls = node("div");
        controls.className = "question-controls";
        for (const option of question.options) {
          const label = node("label");
          label.className = "choice-row";
          const input = node("input");
          input.type = "radio";
          input.name = question.id;
          input.value = option;
          input.required = true;
          input.checked = draft.answers?.[question.id] === option;
          label.append(input, node("span", option));
          controls.append(label);
        }
        field.append(controls);
        form.append(field);
      }
    }
  }
  const button = node("button", draft.pending ? "Retry submission" : "Submit quiz");
  button.className = "button primary";
  const status = node("p");
  status.setAttribute("role", "status");
  form.append(button, status);
  root.append(node("p", quiz.intro), form);
  form.addEventListener("input", () => {
    if (draft.pending) return;
    const values = new FormData(form);
    draft.student = name.value;
    values.delete("student");
    draft.answers = Object.fromEntries(values);
    save();
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (button.disabled) return;
    const student = name.value.trim();
    if (!/\p{L}/u.test(student)) {
      status.textContent = "Please enter your full name.";
      name.focus();
      return;
    }
    if (!draft.pending) {
      const values = new FormData(form);
      values.delete("student");
      draft.student = student;
      draft.pending = {
        attemptId: crypto.randomUUID(), examId: quiz.id, keyVersion: version,
        studentName: student, group, answers: Object.fromEntries(values),
        durationSeconds: Math.min(86400, Math.round((Date.now() - started) / 1000))
      };
      save();
    }
    for (const input of form.querySelectorAll("input")) input.disabled = true;
    button.disabled = true;
    status.textContent = "Sending your answers…";
    try {
      const res = await fetch(window.UEPLV_SITE_CONFIG.API_BASE_URL + "/submit", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft.pending)
      });
      const receipt = await res.json();
      if (!res.ok || receipt.attemptId !== draft.pending.attemptId) throw new Error(receipt.error || receipt.message || "Couldn’t confirm your submission.");
      draft = { receipt: receipt.attemptId };
      save();
      form.replaceChildren(node("p", "Submitted. Your answers are saved."));
    } catch (error) {
      status.textContent = error.message;
      button.textContent = "Retry submission";
      button.disabled = false;
    }
  });
}
load().catch(error => { root.replaceChildren(node("p", error.message)); });
