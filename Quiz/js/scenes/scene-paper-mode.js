"use strict";
/* ---------------------------------------------- 
     Scene Paper Mode Made by: David Santana 
----------------------------------------------  */

window.WhiteboardGameScenes = window.WhiteboardGameScenes || {};

/* ---------------------------------------------- 
     Paper Mode Constants 
----------------------------------------------  */
const PAPER_MAX_CARDS = 60;
const PAPER_ANSWERS = ["A", "B", "C", "D"];
const PAPER_LOCAL_PREFIX = "wgc-paper-";
const PAPER_WIX_SITE_BASE = "https://chiispiitas.wixsite.com/mr-david-collection";
const PAPER_API_BASE = `${PAPER_WIX_SITE_BASE}/_functions`;
const PAPER_PHONE_SCANNER_BASE = "https://chiispiitas.github.io/Lev-Vigotsky/Quiz";
var paperPollTimer = null;
var paperScannerTimer = null;
var paperScannerStream = null;
var paperBarcodeDetector = null;
var paperScannerBusy = false;
var paperScanMemory = {};

/* ---------------------------------------------- 
     Bind Paper Lobby Scene 
----------------------------------------------  */
function bindPaperLobbyScene() {
     const backButton = document.getElementById("backToBaseFromPaperBtn");
     const countButton = document.getElementById("paperApplyCardCountBtn");
     const clearButton = document.getElementById("paperClearNamesBtn");
     const generateButton = document.getElementById("paperGenerateCardsBtn");
     const printButton = document.getElementById("paperPrintCardsBtn");
     const downloadButton = document.getElementById("paperDownloadCardsBtn");
     const createButton = document.getElementById("paperCreateSessionBtn");
     const startButton = document.getElementById("startPaperGameBtn");
     const openScannerButton = document.getElementById("paperOpenBoardScannerBtn");

     if (backButton) {
          backButton.addEventListener("click", function() {
               playSound("back");
               showScreen("baseModeSelect");
          });
     }

     if (countButton) {
          countButton.addEventListener("click", function() {
               playSound("select");
               paperApplyCardCount();
          });
     }

     if (clearButton) {
          clearButton.addEventListener("click", function() {
               playSound("back");
               paperClearNames();
          });
     }

     if (generateButton) {
          generateButton.addEventListener("click", async function() {
               playSound("enter");
               await paperGeneratePrintableCards();
          });
     }

     if (printButton) {
          printButton.addEventListener("click", async function() {
               playSound("enter");
               await paperGeneratePrintableCards();
               window.print();
          });
     }

     if (downloadButton) {
          downloadButton.addEventListener("click", async function() {
               playSound("enter");
               await paperDownloadCardsHtml();
          });
     }

     if (createButton) {
          createButton.addEventListener("click", async function() {
               playSound("start");
               await paperCreateSession();
          });
     }

     if (startButton) {
          startButton.addEventListener("click", function() {
               playSound("start");
               startPaperGame();
          });
     }

     if (openScannerButton) {
          openScannerButton.addEventListener("click", function() {
               playSound("select");
               paperOpenBoardScanner();
          });
     }

     document.querySelectorAll(".paper-choice").forEach(function(button) {
          button.addEventListener("click", function() {
               document.querySelectorAll(".paper-choice").forEach(function(item) { item.classList.remove("active"); });
               button.classList.add("active");
               paperState().cameraMode = button.dataset.paperCamera || "board";
               playSound("select");
          });
     });
}

/* ---------------------------------------------- 
     Bind Paper Game Scene 
----------------------------------------------  */
function bindPaperGameScene() {
     const backButton = document.getElementById("paperBackToLobbyBtn");
     const prevButton = document.getElementById("paperPrevQuestionBtn");
     const nextButton = document.getElementById("paperNextQuestionBtn");
     const revealButton = document.getElementById("paperRevealBtn");
     const closeScannerButton = document.getElementById("closePaperScannerBtn");

     if (backButton) {
          backButton.addEventListener("click", function() {
               playSound("back");
               stopPaperPolling();
               paperCloseBoardScanner();
               showScreen("paperLobby");
          });
     }

     if (prevButton) {
          prevButton.addEventListener("click", function() {
               playSound("back");
               paperPreviousQuestion();
          });
     }

     if (nextButton) {
          nextButton.addEventListener("click", function() {
               playSound("enter");
               paperNextQuestion();
          });
     }

     if (revealButton) {
          revealButton.addEventListener("click", function() {
               playSound("correct");
               paperRevealCurrentAnswer();
          });
     }

     if (closeScannerButton) {
          closeScannerButton.addEventListener("click", function() {
               playSound("back");
               paperCloseBoardScanner();
          });
     }

     document.querySelectorAll(".paper-manual-answer").forEach(function(button) {
          button.addEventListener("click", function() {
               const input = document.getElementById("paperManualCardId");
               const cardId = (input ? input.value : "").trim().toUpperCase();
               if (!cardId) { paperSetScannerStatus("Type a card ID first.", true); return; }
               paperSubmitScan(cardId, button.dataset.paperManualAnswer || "A", "board-manual");
          });
     });
}

/* ---------------------------------------------- 
     Paper State 
----------------------------------------------  */
function paperState() {
     if (!state.paper) {
          state.paper = {
               apiBase: PAPER_API_BASE,
               sessionId: "",
               sessionTitle: "Whiteboard Paper Quiz",
               scannerUrl: "",
               cameraMode: "board",
               cards: [],
               questions: [],
               current: 0,
               revealed: false,
               responses: {}
          };
     }
     return state.paper;
}

/* ---------------------------------------------- 
     Prepare Paper Lobby 
----------------------------------------------  */
function preparePaperLobby() {
     const paper = paperState();
     const title = document.getElementById("paperSessionTitle");
     const count = document.getElementById("paperCardCount");

     paper.questions = getPaperQuestions();
     if (title && !title.value.trim()) { title.value = paper.sessionTitle; }
     paper.apiBase = PAPER_API_BASE;
     if (count && !paper.cards.length) { count.value = Math.min(24, PAPER_MAX_CARDS); }

     if (!paper.cards.length) { paperApplyCardCount(); }
     else { paperRenderRoster(); }

     paperSetLobbyStatus(`${paper.questions.length} multiple-choice questions ready. Typed questions will be skipped.`, false);
}

/* ---------------------------------------------- 
     Get Paper Questions 
----------------------------------------------  */
function getPaperQuestions() {
     return state.questions.filter(function(question) {
          return question && question.type == "choice" && question.answers && question.answers.length >= 2;
     });
}

/* ---------------------------------------------- 
     Apply Card Count 
----------------------------------------------  */
function paperApplyCardCount() {
     const paper = paperState();
     const countInput = document.getElementById("paperCardCount");
     const total = Math.max(1, Math.min(PAPER_MAX_CARDS, Number(countInput ? countInput.value : 24) || 24));
     if (countInput) { countInput.value = total; }

     const existing = paper.cards || [];
     paper.cards = Array.from({ length: total }, function(_, index) {
          const oldCard = existing[index] || {};
          return {
               cardId: oldCard.cardId || paperMakeCardId(index),
               name: oldCard.name || `Student ${index + 1}`
          };
     });

     paperRenderRoster();
     paperSetLobbyStatus(`${total} printable cards configured.`, false);
}

/* ---------------------------------------------- 
     Make Card ID 
----------------------------------------------  */
function paperMakeCardId(index) {
     return `P${String(index + 1).padStart(2, "0")}`;
}

/* ---------------------------------------------- 
     Render Roster 
----------------------------------------------  */
function paperRenderRoster() {
     const list = document.getElementById("paperRosterList");
     const paper = paperState();
     if (!list) { return; }

     list.innerHTML = paper.cards.map(function(card, index) {
          return `
               <label class="paper-roster-row">
                    <span>${index + 1}</span>
                    <b>${esc(card.cardId)}</b>
                    <input type="text" maxlength="28" value="${esc(card.name)}" data-paper-name="${index}">
               </label>
          `;
     }).join("");

     document.querySelectorAll("[data-paper-name]").forEach(function(input) {
          input.addEventListener("input", function() {
               const index = Number(input.dataset.paperName);
               if (paper.cards[index]) { paper.cards[index].name = input.value.trim() || `Student ${index + 1}`; }
          });
     });
}

/* ---------------------------------------------- 
     Clear Names 
----------------------------------------------  */
function paperClearNames() {
     const paper = paperState();
     paper.cards.forEach(function(card, index) { card.name = `Student ${index + 1}`; });
     paperRenderRoster();
     paperSetLobbyStatus("Names reset.", false);
}

/* ---------------------------------------------- 
     Read Paper Settings 
----------------------------------------------  */
function paperReadSettings() {
     const paper = paperState();
     const title = document.getElementById("paperSessionTitle");
     paper.sessionTitle = title && title.value.trim() ? title.value.trim() : "Whiteboard Paper Quiz";
     paper.apiBase = PAPER_API_BASE;
     return paper;
}

/* ---------------------------------------------- 
     Normalize API Base 
----------------------------------------------  */
function paperNormalizeApiBase(value) {
     return String(value || "").trim().replace(/\/$/, "");
}

/* ---------------------------------------------- 
     Create Paper Session 
----------------------------------------------  */
async function paperCreateSession() {
     const paper = paperReadSettings();
     paper.questions = getPaperQuestions();
     if (!paper.questions.length) {
          paperSetLobbyStatus("Paper Mode needs at least one multiple-choice question.", true);
          return;
     }

     const payload = {
          title: paper.sessionTitle,
          cards: paper.cards,
          questions: paper.questions,
          currentQuestionIndex: paper.current || 0,
          createdAt: new Date().toISOString()
     };

     try {
          const result = await paperApiCreateSession(payload);
          paper.sessionId = result.sessionId;
          paper.scannerUrl = paperBuildScannerUrl();
          paperSaveLocalSession();
          await paperRenderSessionQr();
          paperSetLobbyStatus("Session synced to Wix CMS using the hardcoded Mr. David Collection backend.", false);
     }
     catch (error) {
          console.error(error);
          paperSetLobbyStatus(`Could not create session. ${error.message}`, true);
     }
}

/* ---------------------------------------------- 
     API Create Session 
----------------------------------------------  */
async function paperApiCreateSession(payload) {
     const paper = paperState();
     paper.apiBase = PAPER_API_BASE;

     const response = await fetch(`${paper.apiBase}/quizSession`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
     });

     if (!response.ok) { throw new Error(`Wix API ${response.status}`); }
     return response.json();
}


/* ---------------------------------------------- 
     API Sync Session 
----------------------------------------------  */
async function paperApiSyncSession() {
     const paper = paperState();
     if (!paper.sessionId || !paper.apiBase) { return; }
     try {
          await fetch(`${paper.apiBase}/quizSession`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                    sessionId: paper.sessionId,
                    title: paper.sessionTitle,
                    cards: paper.cards,
                    questions: paper.questions,
                    currentQuestionIndex: paper.current || 0
               })
          });
     }
     catch (error) {
          console.warn(error);
     }
}

/* ---------------------------------------------- 
     Save Local Session 
----------------------------------------------  */
function paperSaveLocalSession() {
     const paper = paperState();
     if (!paper.sessionId) { return; }
     const data = {
          sessionId: paper.sessionId,
          title: paper.sessionTitle,
          cards: paper.cards,
          questions: paper.questions,
          responses: paper.responses || {},
          current: paper.current || 0
     };
     localStorage.setItem(`${PAPER_LOCAL_PREFIX}${paper.sessionId}`, JSON.stringify(data));
}

/* ---------------------------------------------- 
     Build Scanner URL 
----------------------------------------------  */
function paperBuildScannerUrl() {
     const paper = paperState();
     const scannerUrl = new URL("scanner.html", `${PAPER_PHONE_SCANNER_BASE}/`);
     scannerUrl.searchParams.set("session", paper.sessionId);
     return scannerUrl.toString();
}

/* ---------------------------------------------- 
     Render Session QR 
----------------------------------------------  */
async function paperRenderSessionQr() {
     const paper = paperState();
     const qrBox = document.getElementById("paperSessionQr");
     const linkBox = document.getElementById("paperSessionLink");
     if (!qrBox) { return; }

     qrBox.innerHTML = "";
     if (window.QRCode && QRCode.toDataURL) {
          const dataUrl = await QRCode.toDataURL(paper.scannerUrl, { width: 280, margin: 1 });
          qrBox.innerHTML = `<img src="${dataUrl}" alt="Scanner QR">`;
     }
     else {
          qrBox.textContent = paper.sessionId;
     }

     if (linkBox) {
          linkBox.innerHTML = `<b>${esc(paper.sessionId)}</b><span>${esc(paper.scannerUrl)}</span>`;
     }
}

/* ---------------------------------------------- 
     Generate Printable Cards 
----------------------------------------------  */
async function paperGeneratePrintableCards() {
     const paper = paperReadSettings();
     if (!paper.sessionId) {
          const result = await paperApiCreateSession({ title: paper.sessionTitle, cards: paper.cards, questions: getPaperQuestions() });
          paper.sessionId = result.sessionId;
          paper.scannerUrl = paperBuildScannerUrl();
          paperSaveLocalSession();
          await paperRenderSessionQr();
     }

     const area = document.getElementById("paperPrintArea");
     if (!area) { return; }

     area.innerHTML = `<div class="paper-print-sheet-title">${esc(paper.sessionTitle)} — ${esc(paper.sessionId)}</div>`;
     for (const card of paper.cards) {
          const cardElement = document.createElement("article");
          cardElement.className = "printable-paper-card qcard-printable";
          cardElement.innerHTML = paperBuildQCardHtml(card);
          area.appendChild(cardElement);
          const code = cardElement.querySelector(".paper-qcard-code");
          await paperFillQrImage(code, paperEncodePayload(paper.sessionId, card.cardId), 210);
     }
     paperSetLobbyStatus("Q-cards generated. Print them, then students rotate each card to answer A, B, C or D.", false);
}

/* ---------------------------------------------- 
     Build Q Card HTML 
----------------------------------------------  */
function paperBuildQCardHtml(card) {
     const number = paperDisplayCardNumber(card.cardId);
     return `
          <div class="paper-qcard-cut top-cut">✂ scissors</div>
          <div class="paper-qcard-cut bottom-cut">✂ scissors</div>
          <div class="paper-qcard-corner top-left">P ${number}</div>
          <div class="paper-qcard-corner top-right">P ${number}</div>
          <div class="paper-qcard-corner bottom-left">P ${number}</div>
          <div class="paper-qcard-corner bottom-right">P ${number}</div>
          <div class="paper-qcard-name">${esc(card.name)}</div>
          <div class="paper-qcard-brand top-brand">Paper Mode</div>
          <div class="paper-qcard-brand left-brand">Paper Mode</div>
          <div class="paper-qcard-brand right-brand">Paper Mode</div>
          <div class="paper-qcard-letter a">A</div>
          <div class="paper-qcard-letter b">B</div>
          <div class="paper-qcard-letter c">C</div>
          <div class="paper-qcard-letter d">D</div>
          <div class="paper-qcard-code"></div>
     `;
}

/* ---------------------------------------------- 
     Display Card Number 
----------------------------------------------  */
function paperDisplayCardNumber(cardId) {
     return String(cardId || "").replace(/^P0?/, "") || "?";
}

/* ---------------------------------------------- 
     Fill QR Image 
----------------------------------------------  */
async function paperFillQrImage(container, payload, size) {
     if (!container) { return; }
     if (window.QRCode && QRCode.toDataURL) {
          const dataUrl = await QRCode.toDataURL(payload, { width: size || 210, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
          container.innerHTML = `<img src="${dataUrl}" alt="${esc(payload)}">`;
     }
}

/* ---------------------------------------------- 
     Encode Payload 
----------------------------------------------  */
function paperEncodePayload(sessionId, cardId) {
     return `WGCQ|${sessionId}|${cardId}`;
}

/* ---------------------------------------------- 
     Decode Payload 
----------------------------------------------  */
function paperDecodePayload(value, location) {
     const parts = String(value || "").trim().split("|");
     if (parts.length == 4 && parts[0] == "WGC") {
          return { sessionId: parts[1], cardId: parts[2], answer: parts[3] };
     }
     if (parts.length == 3 && parts[0] == "WGCQ") {
          return { sessionId: parts[1], cardId: parts[2], answer: paperAnswerFromQrLocation(location) };
     }
     return null;
}

/* ---------------------------------------------- 
     Paper Answer From QR Location 
----------------------------------------------  */
function paperAnswerFromQrLocation(location) {
     if (!location || !location.topLeftCorner || !location.topRightCorner) { return "A"; }
     const dx = location.topRightCorner.x - location.topLeftCorner.x;
     const dy = location.topRightCorner.y - location.topLeftCorner.y;
     const angle = Math.atan2(dy, dx) * 180 / Math.PI;

     if (angle > -45 && angle <= 45) { return "A"; }
     if (angle > 45 && angle <= 135) { return "D"; }
     if (angle <= -45 && angle > -135) { return "B"; }
     return "C";
}

/* ---------------------------------------------- 
     Download Cards HTML 
----------------------------------------------  */
async function paperDownloadCardsHtml() {
     await paperGeneratePrintableCards();
     const area = document.getElementById("paperPrintArea");
     const html = `<!doctype html><html><head><meta charset="utf-8"><title>Paper Cards</title><style>${paperPrintCss()}</style></head><body>${area.innerHTML}</body></html>`;
     const blob = new Blob([html], { type: "text/html" });
     const link = document.createElement("a");
     link.href = URL.createObjectURL(blob);
     link.download = `${paperState().sessionId || "paper"}-cards.html`;
     link.click();
     URL.revokeObjectURL(link.href);
}

/* ---------------------------------------------- 
     Print CSS 
----------------------------------------------  */
function paperPrintCss() {
     return `body{font-family:Arial,sans-serif;color:#111}.paper-print-sheet-title{font-weight:800;margin:8px}.qcard-printable{position:relative;display:inline-block;vertical-align:top;width:178mm;height:178mm;margin:4mm;background:#fff;break-inside:avoid;page-break-inside:avoid;overflow:hidden}.paper-qcard-code{position:absolute;left:50%;top:50%;width:86mm;height:54mm;transform:translate(-50%,-50%);display:grid;place-items:center;background:#000}.paper-qcard-code img{width:49mm;height:49mm;filter:invert(1)}.paper-qcard-letter{position:absolute;font:700 9pt Arial,sans-serif;color:#555}.paper-qcard-letter.a{left:50%;top:42mm;transform:translateX(-50%)}.paper-qcard-letter.b{right:46mm;top:50%;transform:translateY(-50%)}.paper-qcard-letter.c{left:50%;bottom:42mm;transform:translateX(-50%)}.paper-qcard-letter.d{left:46mm;top:50%;transform:translateY(-50%)}.paper-qcard-corner{position:absolute;font:700 11pt Arial,sans-serif}.top-left{left:7mm;top:8mm;writing-mode:vertical-rl;transform:rotate(180deg)}.top-right{right:8mm;top:8mm}.bottom-left{left:7mm;bottom:8mm;transform:rotate(180deg)}.bottom-right{right:8mm;bottom:8mm;writing-mode:vertical-rl}.paper-qcard-brand{position:absolute;font:700 8pt Arial,sans-serif;color:#cfd2d6}.top-brand{left:50%;top:26mm;transform:translateX(-50%)}.left-brand{left:18mm;top:50%;transform:translateY(-50%) rotate(-90deg)}.right-brand{right:18mm;top:50%;transform:translateY(-50%) rotate(90deg)}.paper-qcard-name{position:absolute;left:50%;top:13mm;transform:translateX(-50%);font:800 11pt Arial,sans-serif;color:#222;max-width:75mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.paper-qcard-cut{position:absolute;left:0;right:0;text-align:center;font:700 8pt Arial,sans-serif;color:#999;border-top:1px dashed #aaa}.top-cut{top:23mm}.bottom-cut{bottom:23mm}`;
}

/* ---------------------------------------------- 
     Start Paper Game 
----------------------------------------------  */
async function startPaperGame() {
     const paper = paperReadSettings();
     paper.questions = getPaperQuestions();
     paper.responses = {};
     paper.current = 0;
     paper.revealed = false;
     if (!paper.questions.length) {
          paperSetLobbyStatus("Paper Mode needs multiple-choice questions.", true);
          return;
     }
     if (!paper.sessionId) { await paperCreateSession(); }
     stopBgm("title");
     stopBgm("podium");
     startBgm("round");
     showScreen("paperGame");
     renderPaperQuestion();
     startPaperPolling();
     if (paper.cameraMode == "board") { paperOpenBoardScanner(); }
}

/* ---------------------------------------------- 
     Render Paper Question 
----------------------------------------------  */
function renderPaperQuestion() {
     const paper = paperState();
     const question = paper.questions[paper.current];
     const chip = document.getElementById("paperRoundChip");
     const sessionChip = document.getElementById("paperSessionChip");
     const questionText = document.getElementById("paperQuestionText");
     const options = document.getElementById("paperOptionsGrid");
     paper.revealed = false;

     if (chip) { chip.textContent = `Paper Question ${paper.current + 1} / ${paper.questions.length}`; }
     if (sessionChip) { sessionChip.textContent = paper.sessionId || "No session"; }
     if (questionText) { questionText.textContent = question ? question.question : "No question"; }
     if (options) {
          options.innerHTML = PAPER_ANSWERS.map(function(letter, index) {
               const answer = question && question.answers[index] ? question.answers[index] : "—";
               return `<div class="paper-option" data-paper-option="${letter}"><b>${letter}</b><span>${esc(answer)}</span></div>`;
          }).join("");
     }
     renderPaperAnswers();
     paperSaveLocalSession();
     paperApiSyncSession();
}

/* ---------------------------------------------- 
     Render Paper Answers 
----------------------------------------------  */
function renderPaperAnswers() {
     const paper = paperState();
     const live = document.getElementById("paperLiveAnswers");
     const count = document.getElementById("paperScanCount");
     if (!live) { return; }

     const currentResponses = paper.responses[paper.current] || {};
     const rows = paper.cards.map(function(card) {
          const response = currentResponses[card.cardId];
          const statusClass = response ? "answered" : "waiting";
          const answer = response ? response.answer : "—";
          const correctness = response && paper.revealed ? (response.correct ? "correct" : "wrong") : "";
          return `<div class="paper-answer-row ${statusClass} ${correctness}"><b>${esc(card.name)}</b><span>${answer}</span></div>`;
     });

     live.innerHTML = rows.join("");
     if (count) { count.textContent = `${Object.keys(currentResponses).length} / ${paper.cards.length}`; }
}

/* ---------------------------------------------- 
     Paper Submit Scan 
----------------------------------------------  */
async function paperSubmitScan(cardId, answer, source) {
     const paper = paperState();
     const question = paper.questions[paper.current];
     const card = paper.cards.find(function(item) { return item.cardId == cardId; });
     if (!question || !card) {
          paperSetScannerStatus("Card not found in this session.", true);
          return;
     }
     const response = {
          sessionId: paper.sessionId,
          questionIndex: paper.current,
          cardId: card.cardId,
          studentName: card.name,
          answer: answer,
          correct: paperLetterIsCorrect(question, answer),
          source: source || "board",
          timestamp: new Date().toISOString()
     };
     if (!paper.responses[paper.current]) { paper.responses[paper.current] = {}; }
     paper.responses[paper.current][card.cardId] = response;
     renderPaperAnswers();
     paperSaveLocalSession();
     await paperApiSubmitScan(response);
     paperSetScannerStatus(`${card.name}: ${answer}`, false);
     playSound(response.correct ? "correct" : "select");
}

/* ---------------------------------------------- 
     API Submit Scan 
----------------------------------------------  */
async function paperApiSubmitScan(responseData) {
     const paper = paperState();
     if (!paper.apiBase) { return; }
     try {
          await fetch(`${paper.apiBase}/quizScan`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(responseData)
          });
     }
     catch (error) {
          console.warn(error);
     }
}

/* ---------------------------------------------- 
     Paper Letter Is Correct 
----------------------------------------------  */
function paperLetterIsCorrect(question, answer) {
     const indexes = getCorrectIndexes(question);
     const index = PAPER_ANSWERS.indexOf(answer);
     return indexes.includes(index);
}

/* ---------------------------------------------- 
     Paper Reveal Current Answer 
----------------------------------------------  */
function paperRevealCurrentAnswer() {
     const paper = paperState();
     const question = paper.questions[paper.current];
     paper.revealed = true;
     document.querySelectorAll(".paper-option").forEach(function(option) {
          const letter = option.dataset.paperOption;
          option.classList.toggle("correct", paperLetterIsCorrect(question, letter));
     });
     renderPaperAnswers();
}

/* ---------------------------------------------- 
     Paper Next Question 
----------------------------------------------  */
function paperNextQuestion() {
     const paper = paperState();
     if (paper.current >= paper.questions.length - 1) {
          stopPaperPolling();
          paperCloseBoardScanner();
          showPodium();
          return;
     }
     paper.current += 1;
     renderPaperQuestion();
     paperSaveLocalSession();
}

/* ---------------------------------------------- 
     Paper Previous Question 
----------------------------------------------  */
function paperPreviousQuestion() {
     const paper = paperState();
     paper.current = Math.max(0, paper.current - 1);
     renderPaperQuestion();
     paperSaveLocalSession();
}

/* ---------------------------------------------- 
     Start Paper Polling 
----------------------------------------------  */
function startPaperPolling() {
     stopPaperPolling();
     paperPollTimer = setInterval(paperPollResponses, 1300);
}

/* ---------------------------------------------- 
     Stop Paper Polling 
----------------------------------------------  */
function stopPaperPolling() {
     clearInterval(paperPollTimer);
     paperPollTimer = null;
}

/* ---------------------------------------------- 
     Poll Responses 
----------------------------------------------  */
async function paperPollResponses() {
     const paper = paperState();
     if (!paper.sessionId) { return; }
     if (!paper.apiBase) {
          const raw = localStorage.getItem(`${PAPER_LOCAL_PREFIX}${paper.sessionId}`);
          if (!raw) { return; }
          try {
               const data = JSON.parse(raw);
               paper.responses = data.responses || paper.responses;
               renderPaperAnswers();
          }
          catch (error) {}
          return;
     }

     try {
          const url = `${paper.apiBase}/quizResponses?sessionId=${encodeURIComponent(paper.sessionId)}&questionIndex=${paper.current}`;
          const response = await fetch(url);
          if (!response.ok) { return; }
          const data = await response.json();
          const mapped = {};
          (data.items || []).forEach(function(item) { mapped[item.cardId] = item; });
          paper.responses[paper.current] = mapped;
          renderPaperAnswers();
     }
     catch (error) {}
}

/* ---------------------------------------------- 
     Open Board Scanner 
----------------------------------------------  */
async function paperOpenBoardScanner() {
     const panel = document.getElementById("paperScannerPanel");
     const stage = document.getElementById("stage");
     const video = document.getElementById("paperScannerVideo");

     if (panel && stage && panel.parentElement !== stage) { stage.appendChild(panel); }
     if (panel) { panel.classList.remove("hidden"); }

     if (!window.isSecureContext && location.protocol !== "file:") {
          paperSetScannerStatus("Camera needs HTTPS or localhost. Use manual entry if blocked.", true);
     }

     if (!video || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          paperSetScannerStatus("Camera unavailable. Use manual entry.", true);
          return;
     }

     try {
          paperScannerStream = await navigator.mediaDevices.getUserMedia({
               video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
               },
               audio: false
          });
          video.srcObject = paperScannerStream;
          video.setAttribute("playsinline", "");
          video.setAttribute("webkit-playsinline", "");
          await video.play();
          paperSetScannerStatus("Realtime scanner active. Show one or more Q-cards. The answer is detected from card rotation.", false);
          paperStartQrLoop();
     }
     catch (error) {
          paperSetScannerStatus(`Camera could not start: ${error.message || "permission blocked"}. Use manual entry.`, true);
     }
}

/* ---------------------------------------------- 
     Start QR Loop 
----------------------------------------------  */
function paperStartQrLoop() {
     cancelAnimationFrame(paperScannerTimer);
     paperScannerBusy = false;
     paperScanMemory = {};
     paperPrepareBarcodeDetector();

     const scanFrame = async function() {
          if (!paperScannerStream) { return; }
          if (!paperScannerBusy) {
               paperScannerBusy = true;
               try { await paperScanBoardFrame(); }
               catch (error) { console.warn(error); }
               paperScannerBusy = false;
          }
          paperScannerTimer = requestAnimationFrame(scanFrame);
     };

     paperScannerTimer = requestAnimationFrame(scanFrame);
}

/* ---------------------------------------------- 
     Prepare Barcode Detector 
----------------------------------------------  */
async function paperPrepareBarcodeDetector() {
     if (!("BarcodeDetector" in window)) { return; }
     try {
          if (BarcodeDetector.getSupportedFormats) {
               const formats = await BarcodeDetector.getSupportedFormats();
               if (!formats.includes("qr_code")) { return; }
          }
          paperBarcodeDetector = new BarcodeDetector({ formats: ["qr_code"] });
     }
     catch (error) {
          paperBarcodeDetector = null;
     }
}

/* ---------------------------------------------- 
     Scan Board Frame 
----------------------------------------------  */
async function paperScanBoardFrame() {
     const video = document.getElementById("paperScannerVideo");
     const canvas = document.getElementById("paperScannerCanvas");
     if (!video || !canvas || video.readyState < 2) { return; }

     if (paperBarcodeDetector) {
          const barcodes = await paperBarcodeDetector.detect(video);
          if (barcodes && barcodes.length) {
               await paperHandleDetectedCodes(barcodes.map(function(code) {
                    return {
                         data: code.rawValue,
                         location: paperLocationFromBarcode(code)
                    };
               }), "board-camera");
               return;
          }
     }

     if (!window.jsQR) { return; }
     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     canvas.width = video.videoWidth;
     canvas.height = video.videoHeight;
     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
     const result = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
     if (result && result.data) {
          await paperHandleDetectedCodes([{ data: result.data, location: result.location }], "board-camera");
     }
}

/* ---------------------------------------------- 
     Paper Location From Barcode 
----------------------------------------------  */
function paperLocationFromBarcode(code) {
     if (!code || !code.cornerPoints || code.cornerPoints.length < 2) { return null; }
     return {
          topLeftCorner: code.cornerPoints[0],
          topRightCorner: code.cornerPoints[1]
     };
}

/* ---------------------------------------------- 
     Handle Detected Codes 
----------------------------------------------  */
async function paperHandleDetectedCodes(codes, source) {
     const paper = paperState();
     const accepted = [];

     for (const code of codes) {
          const payload = paperDecodePayload(code.data, code.location);
          if (!payload || payload.sessionId != paper.sessionId) { continue; }
          const card = paper.cards.find(function(item) { return item.cardId == payload.cardId; });
          if (!card) { continue; }
          if (!paperScanShouldSubmit(payload.cardId, payload.answer)) { continue; }
          await paperSubmitScan(payload.cardId, payload.answer, source || "board-camera");
          accepted.push(`${card.name}: ${payload.answer}`);
     }

     if (accepted.length) {
          paperSetScannerStatus(`Scanned ${accepted.length}: ${accepted.join(" | ")}`, false);
     }
}

/* ---------------------------------------------- 
     Paper Scan Should Submit 
----------------------------------------------  */
function paperScanShouldSubmit(cardId, answer) {
     const paper = paperState();
     const key = `${paper.current}-${cardId}`;
     const previous = paperScanMemory[key];
     if (previous && previous.answer == answer) { return false; }
     paperScanMemory[key] = { answer: answer, time: Date.now() };
     return true;
}

/* ---------------------------------------------- 
     Close Board Scanner 
----------------------------------------------  */
function paperCloseBoardScanner() {
     const panel = document.getElementById("paperScannerPanel");
     if (panel) { panel.classList.add("hidden"); }
     cancelAnimationFrame(paperScannerTimer);
     paperScannerTimer = null;
     if (paperScannerStream) {
          paperScannerStream.getTracks().forEach(function(track) { track.stop(); });
          paperScannerStream = null;
     }
}

/* ---------------------------------------------- 
     Set Scanner Status 
----------------------------------------------  */
function paperSetScannerStatus(message, bad) {
     const status = document.getElementById("paperScannerStatus");
     if (!status) { return; }
     status.textContent = message;
     status.classList.toggle("bad", !!bad);
}

/* ---------------------------------------------- 
     Set Lobby Status 
----------------------------------------------  */
function paperSetLobbyStatus(message, bad) {
     const status = document.getElementById("paperLobbyStatus");
     if (!status) { return; }
     status.textContent = message;
     status.classList.toggle("bad", !!bad);
}

/* ---------------------------------------------- 
     Create Paper Lobby Scene 
----------------------------------------------  */
window.WhiteboardGameScenes.paperLobby = function(api) {
     return {
          id: "paperLobby",
          screenId: "paperLobbyScreen",
          aliases: ["paper", "paperLobbyScreen"],
          init: function() { bindPaperLobbyScene(); },
          onEnter: function() {
               api.audio.startBgm("title");
               preparePaperLobby();
          }
     };
};

/* ---------------------------------------------- 
     Create Paper Game Scene 
----------------------------------------------  */
window.WhiteboardGameScenes.paperGame = function(api) {
     return {
          id: "paperGame",
          screenId: "paperGameScreen",
          aliases: ["paperGameScreen"],
          init: function() { bindPaperGameScene(); },
          onEnter: function() { api.audio.stopBgm("title"); },
          onExit: function() { stopPaperPolling(); paperCloseBoardScanner(); }
     };
};
