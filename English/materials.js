const params = new URLSearchParams(location.search);
const level = window.UEPLV_SITE_CONFIG.levels.find(item => item.id === params.get("level"));
const labels = { study: "Vocabulary and Grammar", drills: "Practice Exercises", speaking: "Speaking Practice" };
const view = Object.hasOwn(labels, params.get("view")) ? params.get("view") : "study";
const root = document.getElementById("material");
const el = id => document.getElementById(id);
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const list = items => `<ul>${items.map(item => `<li>${escape(item)}</li>`).join("")}</ul>`;
const line = text => `<p>${escape(text)}</p>`;
const studyArt = () => `<img class="study-illustration" src="images/${level.id}-study.webp" alt="${escape(level.art)}">`;

async function load() {
  if (!level) throw new Error("Choose your grade from the practice page.");
  const response = await fetch(`content/study/${level.id}.json`);
  if (!response.ok) throw new Error("This material could not load. Refresh the page to try again.");
  const data = await response.json();
  document.title = `${labels[view]} ${level.level} | Lev Vigotsky`;
  el("materialLevel").textContent = `${level.grade} · ${level.level}`;
  el("materialTitle").textContent = labels[view];
  el("materialNav").innerHTML = Object.entries(labels).map(([id, label]) =>
    `<a class="text-link" href="?level=${level.id}&amp;view=${id}"${id === view ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  if (view === "study") study(data);
  if (view === "speaking") speaking(data.speaking);
  if (view === "drills") drills(data.drills);
  if (view !== "drills") {
    el("printTools").hidden = false;
    el("print").onclick = () => window.print();
    el("pdfLink").href = `downloads/${level.id}-${view}.pdf`;
  }
  root.dataset.ready = "true";
}

function study(data) {
  root.innerHTML = `<section class="material-block preparation"><div><h2>How to prepare</h2>
    <p>${escape(data.scope || level.book)}</p>
    <ol><li>Review each group of words and use a few in sentences of your own.</li><li>Do the practice exercises and check your answers.</li><li>Take the main practice exam, then try Variation B. Read the listening questions before you play the recording. In reading, look for the main idea first, then go back to check details.</li><li>Practice speaking with a partner. Give reasons and ask your partner at least one question.</li></ol></div>${studyArt()}
    </section>${data.topics.map(topic => `<section class="material-block">
    <h2>${escape(topic.title)}</h2><p lang="en"><strong>Vocabulary</strong> · ${topic.words.map(escape).join(", ")}</p>
    <div lang="en"><p><strong>Grammar</strong></p>${list(topic.grammar)}</div></section>`).join("")}`;
}
function speaking(data) {
  const alternate = data.variationB ? { ...data, ...data.variationB } : null;
  root.innerHTML = `<section class="material-block"><p>Work with a partner. Take turns and give a reason for each preference. Allow about ${escape(data.minutes)} minutes per pair.</p></section>
    <div lang="en" class="speaking-cards">${speakingCard("Practice A", data, "a")}${alternate ? speakingCard("Variation B", alternate, "b") : ""}
    <section class="material-block"><h2>What to listen for</h2>${list(data.rubric || [])}</section></div>`;
}
function speakingCard(label, data, form) {
  const stock = form === "a"
    ? { alt: "Four volunteers push wheelbarrows past garden plots.", author: "Zack Gilbert", url: "https://www.pexels.com/photo/community-gardening-project-in-bloomington-39778110/" }
    : { alt: "Volunteers collecting litter in blue bags on a riverbank.", author: "Vitaly Gariev", url: "https://www.pexels.com/photo/community-volunteers-cleaning-riverbank-outdoors-36713110/" };
  const photo = level.id === "b1"
    ? `<figure><img class="speaking-photo" src="images/b1-speaking-${form}.jpg" alt="${stock.alt}"><figcaption class="photo-credit"><a href="${stock.url}">${stock.author} / Pexels</a></figcaption></figure>`
    : "";
  return `<section class="material-block speaking-card"><h2>${label}</h2>
  <h3>Interview</h3>${list(data.interview || [])}
  <h3>Your turn</h3>${line(data.individual?.prompt)}${photo}${list(data.individual?.cues || [])}
  <h3>Discuss together</h3>${line(data.pair?.prompt)}${list(data.pair?.options || [])}
  ${data.pair?.followUps?.length ? `<h3>Follow-up questions</h3>${list(data.pair.followUps)}` : ""}</section>`;
}
export function normalize(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").trim().replace(/\s+/g, " ");
}
function drills(parts) {
  root.innerHTML = `<div class="preparation"><p>Do the exercises, then check your answers at the end of each section.</p>${studyArt()}</div>`;
  for (const part of parts) {
    const section = document.createElement("section");
    section.className = "material-block";
    section.lang = "en";
    section.innerHTML = `<h2>${escape(part.title)}</h2>${line(part.instructions)}
      ${part.passage ? `<p class="passage">${escape(part.passage)}</p>` : ""}
      ${part.audio ? `<audio class="practice-audio" controls preload="metadata" src="${escape(part.audio)}"></audio>` : ""}
      <form>${part.questions.map((q, i) => {
        const options = q.options || part.options;
        return `<fieldset class="question-panel"><legend>${i + 1}. ${escape(q.prompt)}</legend><div class="question-controls">
          ${q.context ? `<p class="question-context">${escape(q.context)}</p>` : ""}
          ${options?.length ? options.map(option => `<label class="choice-row"><input type="radio" name="${i}" value="${escape(option)}"> ${escape(option)}</label>`).join("") : `<input name="${i}" aria-label="Answer ${i + 1}" type="text" maxlength="250">`}
          <p class="drill-feedback"></p></div></fieldset>`;
      }).join("")}<button class="button primary">Check answers</button><p role="status"></p></form>`;
    const form = section.querySelector("form");
    form.onsubmit = event => {
      event.preventDefault();
      const entered = new FormData(form);
      const feedback = form.querySelectorAll(".drill-feedback");
      let score = 0;
      part.questions.forEach((q, index) => {
        const correct = [q.answer, ...(q.accepted || [])].map(normalize).includes(normalize(entered.get(String(index))));
        if (correct) score++;
        feedback[index].textContent = correct ? "Correct." : `Answer: ${q.answer}.${q.explanation ? " " + q.explanation : ""}`;
      });
      form.querySelector('[role="status"]').textContent = `${score} / ${part.questions.length}`;
    };
    root.append(section);
  }
}
load().catch(error => { root.textContent = error.message; });
