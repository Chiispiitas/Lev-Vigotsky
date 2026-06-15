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
               await paperPrintCardsDocument();
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

     paper.scannerUrl = paper.scannerUrl || paperBuildScannerUrl();
     const qrSrc = await paperGetQrImageSource(paper.scannerUrl, 280);
     qrBox.innerHTML = `<img src="${qrSrc}" alt="Scanner QR"><small>Scan this with your phone</small>`;

     if (linkBox) {
          linkBox.innerHTML = `<b>${esc(paper.sessionId)}</b><a href="${esc(paper.scannerUrl)}" target="_blank" rel="noopener">Open phone scanner</a><span>${esc(paper.scannerUrl)}</span>`;
     }
}

/* ---------------------------------------------- 
     Get QR Image Source 
----------------------------------------------  */
async function paperGetQrImageSource(payload, size) {
     const safeSize = Math.max(80, Math.min(720, Number(size) || 240));

     try {
          if (window.QRCode && QRCode.toDataURL) {
               return await QRCode.toDataURL(payload, {
                    width: safeSize,
                    margin: 1,
                    errorCorrectionLevel: "M",
                    color: { dark: "#000000", light: "#ffffff" }
               });
          }
     }
     catch (error) {
          console.warn("Local QR generator failed. Using online QR fallback.", error);
     }

     return `https://api.qrserver.com/v1/create-qr-code/?size=${safeSize}x${safeSize}&margin=8&data=${encodeURIComponent(payload)}`;
}

/* ---------------------------------------------- 
     QR Image HTML 
----------------------------------------------  */
async function paperQrImageHtml(payload, size, alt) {
     const src = await paperGetQrImageSource(payload, size || 210);
     return `<img src="${src}" alt="${esc(alt || payload)}">`;
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
     container.innerHTML = await paperQrImageHtml(payload, size || 210, payload);
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
     const html = paperBuildCardsDocumentHtml(false);
     const blob = new Blob([html], { type: "text/html" });
     const link = document.createElement("a");
     link.href = URL.createObjectURL(blob);
     link.download = `${paperState().sessionId || "paper"}-q-cards.html`;
     link.click();
     setTimeout(function() { URL.revokeObjectURL(link.href); }, 1000);
}

/* ---------------------------------------------- 
     Print Cards Document 
----------------------------------------------  */
async function paperPrintCardsDocument() {
     await paperGeneratePrintableCards();
     const html = paperBuildCardsDocumentHtml(true);
     const printWindow = window.open("", "_blank");

     if (!printWindow) {
          paperSetLobbyStatus("Popup blocked. Use Download Cards HTML, then print from that file.", true);
          return;
     }

     printWindow.document.open();
     printWindow.document.write(html);
     printWindow.document.close();
     paperSetLobbyStatus("Print window opened. Save as PDF from the browser print dialog.", false);
}

/* ---------------------------------------------- 
     Build Cards Document HTML 
----------------------------------------------  */
function paperBuildCardsDocumentHtml(autoPrint) {
     const area = document.getElementById("paperPrintArea");
     const paper = paperState();
     const printScript = autoPrint ? `<script>window.addEventListener("load",async function(){try{if(document.fonts&&document.fonts.ready){await document.fonts.ready;}}catch(e){}setTimeout(function(){window.focus();window.print();},950);});<\/script>` : "";

     return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(paper.sessionTitle)} Q-cards</title>
<style>${paperPrintCss()}</style>
</head>
<body>
<section class="paper-instructions">
<h1>Paper Mode Q-cards</h1>
<p>Give one card to each student. Students answer by rotating the card so the selected answer letter is above the code.</p>
<p>Session: <b>${esc(paper.sessionId || "No session")}</b></p>
</section>
${area ? area.innerHTML : ""}
${printScript}
</body>
</html>`;
}

/* ---------------------------------------------- 
     Print CSS 
----------------------------------------------  */
function paperPrintCss() {
     return `@page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,sans-serif}.paper-instructions{width:210mm;height:297mm;padding:24mm 22mm;break-after:page;page-break-after:always}.paper-instructions h1{margin:0 0 10mm;font-size:24pt}.paper-instructions p{font-size:14pt;line-height:1.45}.paper-print-sheet-title{display:none}.qcard-printable{position:relative;display:block;width:210mm;height:297mm;margin:0;background:#fff;break-after:page;page-break-after:always;overflow:hidden}.qcard-printable:last-child{break-after:auto;page-break-after:auto}.paper-qcard-code{position:absolute;left:50%;top:50%;width:92mm;height:64mm;transform:translate(-50%,-50%);display:grid;place-items:center;background:#000}.paper-qcard-code img{width:56mm;height:56mm;display:block;filter:invert(1)}.paper-qcard-letter{position:absolute;font:700 10pt Arial,sans-serif;color:#555}.paper-qcard-letter.a{left:50%;top:84mm;transform:translateX(-50%)}.paper-qcard-letter.b{right:52mm;top:50%;transform:translateY(-50%)}.paper-qcard-letter.c{left:50%;bottom:84mm;transform:translateX(-50%)}.paper-qcard-letter.d{left:52mm;top:50%;transform:translateY(-50%)}.paper-qcard-corner{position:absolute;font:900 15pt Arial,sans-serif;color:#222}.top-left{left:10mm;top:18mm;writing-mode:vertical-rl;transform:rotate(180deg)}.top-right{right:18mm;top:18mm}.bottom-left{left:10mm;bottom:18mm;transform:rotate(180deg)}.bottom-right{right:18mm;bottom:18mm;writing-mode:vertical-rl}.paper-qcard-brand{position:absolute;font:700 8pt Arial,sans-serif;color:#cfd2d6}.top-brand{left:50%;top:34mm;transform:translateX(-50%)}.left-brand{left:28mm;top:50%;transform:translateY(-50%) rotate(-90deg)}.right-brand{right:28mm;top:50%;transform:translateY(-50%) rotate(90deg)}.paper-qcard-name{position:absolute;left:50%;top:18mm;transform:translateX(-50%);font:900 12pt Arial,sans-serif;color:#222;max-width:95mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.paper-qcard-cut{position:absolute;left:0;right:0;text-align:center;font:700 8pt Arial,sans-serif;color:#999;border-top:1px dashed #aaa}.top-cut{top:42mm}.bottom-cut{bottom:42mm}@media screen{body{background:#e9edf5}.paper-instructions,.qcard-printable{margin:12px auto;box-shadow:0 6px 20px rgba(0,0,0,.18)}}@media print{.paper-instructions{display:block}.qcard-printable{box-shadow:none}}`;
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


/* ---------------------------------------------- 
     V47 Universal 6x6 Q-Card Overrides
----------------------------------------------  */

/* ---------------------------------------------- 
     Q-Card Data Positions 
----------------------------------------------  */
function paperQCardDataPositions() {
     const positions = [];
     for (let row = 0; row < 6; row += 1) {
          for (let col = 0; col < 6; col += 1) {
               const inTop = row < 2;
               const inBottom = row > 3;
               const inLeft = col < 2;
               const inRight = col > 3;
               if ((inTop || inBottom) && (inLeft || inRight)) { continue; }
               positions.push([row, col]);
          }
     }
     return positions;
}

/* ---------------------------------------------- 
     Normalize Paper Card ID 
----------------------------------------------  */
function paperNormalizeCardId(cardId) {
     const digits = String(cardId || "").replace(/\D/g, "");
     const number = Math.max(1, Math.min(PAPER_MAX_CARDS, Number(digits) || 1));
     return `P${String(number).padStart(2, "0")}`;
}

/* ---------------------------------------------- 
     Card Number From ID 
----------------------------------------------  */
function paperCardNumberFromId(cardId) {
     return Math.max(1, Math.min(PAPER_MAX_CARDS, Number(String(cardId || "").replace(/\D/g, "")) || 1));
}

/* ---------------------------------------------- 
     Make 6x6 Q-Card Grid 
----------------------------------------------  */
function paperMakeQCardGrid(cardId) {
     const number = paperCardNumberFromId(cardId);
     const value = number - 1;
     const checksum = (value * 7 + 11) & 15;
     const bits = [];

     for (let i = 0; i < 6; i += 1) { bits.push((value >> i) & 1); }
     for (let i = 0; i < 4; i += 1) { bits.push((checksum >> i) & 1); }

     const grid = Array.from({ length: 6 }, function() {
          return Array.from({ length: 6 }, function() { return false; });
     });

     /* Orientation anchor in canonical top-left: three white cells and one black cell. */
     grid[0][0] = true;
     grid[0][1] = true;
     grid[1][0] = true;
     grid[1][1] = false;

     const positions = paperQCardDataPositions();
     positions.forEach(function(position, index) {
          const row = position[0];
          const col = position[1];
          if (index < bits.length) {
               grid[row][col] = !!bits[index];
          }
          else {
               grid[row][col] = ((row * 3 + col + value) % 4) === 0;
          }
     });

     return grid;
}

/* ---------------------------------------------- 
     Build Q-Code HTML 
----------------------------------------------  */
function paperBuildQCodeHtml(cardId) {
     const grid = paperMakeQCardGrid(cardId);
     const size = 600;
     const padding = 52;
     const gap = 24;
     const cell = (size - (padding * 2) - (gap * 5)) / 6;
     const whiteSquares = [];

     grid.forEach(function(row, rowIndex) {
          row.forEach(function(isOn, colIndex) {
               if (!isOn) { return; }
               const x = padding + (colIndex * (cell + gap));
               const y = padding + (rowIndex * (cell + gap));
               whiteSquares.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" rx="6" ry="6" fill="#ffffff"/>`);
          });
     });

     return `<svg class="paper-qcard-marker paper-qcode-svg" data-qcard-id="${esc(paperNormalizeCardId(cardId))}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Reusable 6 by 6 Q-card code" shape-rendering="crispEdges"><rect x="0" y="0" width="${size}" height="${size}" fill="#000000"/>${whiteSquares.join("")}<rect x="5" y="5" width="${size - 10}" height="${size - 10}" fill="none" stroke="#ffffff" stroke-width="6" opacity="0.24"/></svg>`;
}

/* ---------------------------------------------- 
     Generate Printable Cards 
----------------------------------------------  */
async function paperGeneratePrintableCards() {
     const paper = paperReadSettings();
     const area = document.getElementById("paperPrintArea");
     if (!area) { return; }

     if (!paper.cards || !paper.cards.length) { paperApplyCardCount(); }

     area.innerHTML = `<div class="paper-print-sheet-title">Mr. David's Collection — Reusable Paper Mode Q-cards</div>`;
     for (const card of paper.cards) {
          card.cardId = paperNormalizeCardId(card.cardId);
          const cardElement = document.createElement("article");
          cardElement.className = "printable-paper-card qcard-printable";
          cardElement.innerHTML = paperBuildQCardHtml(card);
          area.appendChild(cardElement);
     }
     paperSetLobbyStatus("Reusable 6×6 Q-cards generated. These cards are universal and can be reused in any session.", false);
}

/* ---------------------------------------------- 
     Build Q Card HTML 
----------------------------------------------  */
function paperBuildQCardHtml(card) {
     const number = paperDisplayCardNumber(card.cardId);
     return `
          <div class="paper-qcard-collection">MR. DAVID'S COLLECTION</div>
          <div class="paper-qcard-cut top-cut">✂ scissors</div>
          <div class="paper-qcard-cut bottom-cut">✂ scissors</div>
          <div class="paper-qcard-corner top-left">P ${number}</div>
          <div class="paper-qcard-corner top-right">P ${number}</div>
          <div class="paper-qcard-corner bottom-left">P ${number}</div>
          <div class="paper-qcard-corner bottom-right">P ${number}</div>
          <div class="paper-qcard-name">${esc(card.name)}</div>
          <div class="paper-qcard-brand top-brand">Whiteboard Game Collection</div>
          <div class="paper-qcard-brand left-brand">Paper Mode</div>
          <div class="paper-qcard-brand right-brand">Reusable Q-card</div>
          <div class="paper-qcard-letter a">A</div>
          <div class="paper-qcard-letter b">B</div>
          <div class="paper-qcard-letter c">C</div>
          <div class="paper-qcard-letter d">D</div>
          <div class="paper-qcard-code">${paperBuildQCodeHtml(card.cardId)}</div>
     `;
}

/* ---------------------------------------------- 
     Encode Payload 
----------------------------------------------  */
function paperEncodePayload(sessionId, cardId) {
     return `WGCQ|${paperNormalizeCardId(cardId)}`;
}

/* ---------------------------------------------- 
     Decode Payload 
----------------------------------------------  */
function paperDecodePayload(value, location) {
     const parts = String(value || "").trim().split("|");
     if (parts.length == 4 && parts[0] == "WGC") {
          return { sessionId: parts[1], cardId: paperNormalizeCardId(parts[2]), answer: parts[3] };
     }
     if (parts.length == 3 && parts[0] == "WGCQ") {
          return { sessionId: parts[1], cardId: paperNormalizeCardId(parts[2]), answer: paperAnswerFromQrLocation(location) };
     }
     if (parts.length == 2 && parts[0] == "WGCQ") {
          return { sessionId: "", cardId: paperNormalizeCardId(parts[1]), answer: paperAnswerFromQrLocation(location) };
     }
     return null;
}

/* ---------------------------------------------- 
     Download Cards HTML 
----------------------------------------------  */
async function paperDownloadCardsHtml() {
     await paperGeneratePrintableCards();
     const html = paperBuildCardsDocumentHtml(false);
     const blob = new Blob([html], { type: "text/html" });
     const link = document.createElement("a");
     link.href = URL.createObjectURL(blob);
     link.download = "mr-david-reusable-q-cards.html";
     link.click();
     setTimeout(function() { URL.revokeObjectURL(link.href); }, 1000);
}

/* ---------------------------------------------- 
     Build Cards Document HTML 
----------------------------------------------  */
function paperBuildCardsDocumentHtml(autoPrint) {
     const area = document.getElementById("paperPrintArea");
     const paper = paperState();
     const printScript = autoPrint ? `<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},550);});<\/script>` : "";

     return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mr. David's Collection Reusable Q-cards</title>
<style>${paperPrintCss()}</style>
</head>
<body>
<section class="paper-instructions">
<div class="brand-pill">MR. DAVID'S COLLECTION</div>
<h1>Whiteboard Game Collection</h1>
<h2>Reusable Paper Mode Q-cards</h2>
<p>Give one reusable card to each student. The code is universal, so it is not tied to one quiz session.</p>
<p>Students answer by rotating the card so the selected answer letter is above the black 6×6 code.</p>
<p>Session names can change in the lobby, but the printed code for P01, P02, P03, etc. stays the same for every game.</p>
</section>
${area ? area.innerHTML : ""}
${printScript}
</body>
</html>`;
}

/* ---------------------------------------------- 
     Print CSS 
----------------------------------------------  */
function paperPrintCss() {
     return `@page{size:A4 portrait;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,sans-serif}.paper-instructions{width:210mm;height:297mm;padding:21mm 22mm;break-after:page;page-break-after:always;border:7mm solid #16407d;color:#16407d}.brand-pill{display:inline-block;padding:4mm 7mm;border:1.2mm solid #16407d;border-radius:999px;font-size:18pt;font-weight:900}.paper-instructions h1{margin:12mm 0 2mm;font-size:34pt;line-height:.95}.paper-instructions h2{margin:0 0 12mm;font-size:21pt}.paper-instructions p{font-size:14pt;line-height:1.45;max-width:160mm}.paper-print-sheet-title{display:none}.qcard-printable{position:relative;display:block;width:210mm;height:297mm;margin:0;background:#fff;break-after:page;page-break-after:always;overflow:hidden}.qcard-printable:last-child{break-after:auto;page-break-after:auto}.paper-qcard-collection{position:absolute;left:50%;top:8mm;transform:translateX(-50%);font:900 9pt Arial,sans-serif;color:#16407d;letter-spacing:.4mm}.paper-qcard-code{position:absolute;left:50%;top:50%;width:76mm;height:76mm;transform:translate(-50%,-50%);display:grid;place-items:center;padding:0;background:transparent}.paper-qcode-svg,.paper-qcard-marker{width:76mm;height:76mm;display:block;overflow:visible}.paper-qcard-marker rect{vector-effect:non-scaling-stroke}.paper-qcard-letter{position:absolute;font:900 22pt Arial,sans-serif;color:#111}.paper-qcard-letter.a{left:50%;top:80mm;transform:translateX(-50%)}.paper-qcard-letter.b{right:49mm;top:50%;transform:translateY(-50%)}.paper-qcard-letter.c{left:50%;bottom:80mm;transform:translateX(-50%)}.paper-qcard-letter.d{left:49mm;top:50%;transform:translateY(-50%)}.paper-qcard-corner{position:absolute;font:900 18pt Arial,sans-serif;color:#222}.top-left{left:11mm;top:20mm;writing-mode:vertical-rl;transform:rotate(180deg)}.top-right{right:20mm;top:20mm}.bottom-left{left:11mm;bottom:20mm;transform:rotate(180deg)}.bottom-right{right:20mm;bottom:20mm;writing-mode:vertical-rl}.paper-qcard-brand{position:absolute;font:800 9pt Arial,sans-serif;color:#7f8794}.top-brand{left:50%;top:35mm;transform:translateX(-50%)}.left-brand{left:25mm;top:50%;transform:translateY(-50%) rotate(-90deg)}.right-brand{right:25mm;top:50%;transform:translateY(-50%) rotate(90deg)}.paper-qcard-name{position:absolute;left:50%;top:19mm;transform:translateX(-50%);font:900 13pt Arial,sans-serif;color:#222;max-width:96mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.paper-qcard-cut{position:absolute;left:0;right:0;text-align:center;font:700 8pt Arial,sans-serif;color:#777;border-top:1px dashed #777}.top-cut{top:44mm}.bottom-cut{bottom:44mm}@media screen{body{background:#e9edf5}.paper-instructions,.qcard-printable{margin:12px auto;box-shadow:0 6px 20px rgba(0,0,0,.18)}}@media print{.paper-instructions{display:block}.qcard-printable{box-shadow:none}.paper-qcode-svg,.paper-qcard-marker{forced-color-adjust:none}}`;
}

/* ---------------------------------------------- 
     Rotate Grid Clockwise 
----------------------------------------------  */
function paperRotateGrid(grid, times) {
     let result = grid.map(function(row) { return row.slice(); });
     const rotations = ((times % 4) + 4) % 4;
     for (let k = 0; k < rotations; k += 1) {
          result = result[0].map(function(_, col) {
               return result.map(function(row) { return row[col]; }).reverse();
          });
     }
     return result;
}

/* ---------------------------------------------- 
     Anchor Score 
----------------------------------------------  */
function paperAnchorScore(grid) {
     let score = 0;
     if (grid[0][0]) { score += 1; }
     if (grid[0][1]) { score += 1; }
     if (grid[1][0]) { score += 1; }
     if (!grid[1][1]) { score += 1; }
     return score;
}

/* ---------------------------------------------- 
     Opposite Corner Noise Score 
----------------------------------------------  */
function paperCornerNoiseScore(grid) {
     const cells = [
          [0,4],[0,5],[1,4],[1,5],
          [4,0],[4,1],[5,0],[5,1],
          [4,4],[4,5],[5,4],[5,5]
     ];
     return cells.reduce(function(total, item) {
          return total + (grid[item[0]][item[1]] ? 1 : 0);
     }, 0);
}

/* ---------------------------------------------- 
     Decode 6x6 Q-Card Grid 
----------------------------------------------  */
function paperDecodeQCardGrid(rawGrid) {
     const answers = ["A", "B", "C", "D"];

     for (let rotation = 0; rotation < 4; rotation += 1) {
          const grid = paperRotateGrid(rawGrid, rotation);
          if (paperAnchorScore(grid) < 3) { continue; }
          if (paperCornerNoiseScore(grid) > 2) { continue; }

          const positions = paperQCardDataPositions();
          const bits = positions.slice(0, 10).map(function(position) {
               return grid[position[0]][position[1]] ? 1 : 0;
          });

          let value = 0;
          for (let i = 0; i < 6; i += 1) { value |= bits[i] << i; }
          let checksum = 0;
          for (let i = 0; i < 4; i += 1) { checksum |= bits[6 + i] << i; }

          if (value < 0 || value >= PAPER_MAX_CARDS) { continue; }
          if (checksum !== ((value * 7 + 11) & 15)) { continue; }

          return {
               cardId: `P${String(value + 1).padStart(2, "0")}`,
               answer: answers[rotation],
               confidence: paperAnchorScore(grid) + 10 - paperCornerNoiseScore(grid)
          };
     }

     return null;
}

/* ---------------------------------------------- 
     Read Grid From Candidate 
----------------------------------------------  */
function paperReadGridFromCandidate(imageData, width, height, box) {
     const data = imageData.data;
     const pad = 0.08;
     const gap = 0.04;
     const cell = (1 - (pad * 2) - (gap * 5)) / 6;
     const grid = [];

     for (let row = 0; row < 6; row += 1) {
          const line = [];
          for (let col = 0; col < 6; col += 1) {
               const rx = pad + (cell / 2) + col * (cell + gap);
               const ry = pad + (cell / 2) + row * (cell + gap);
               const cx = Math.round(box.x + rx * box.w);
               const cy = Math.round(box.y + ry * box.h);
               let total = 0;
               let samples = 0;

               for (let yy = -2; yy <= 2; yy += 1) {
                    for (let xx = -2; xx <= 2; xx += 1) {
                         const sx = Math.max(0, Math.min(width - 1, cx + xx));
                         const sy = Math.max(0, Math.min(height - 1, cy + yy));
                         const index = (sy * width + sx) * 4;
                         total += (data[index] + data[index + 1] + data[index + 2]) / 3;
                         samples += 1;
                    }
               }

               line.push(total / samples > 145);
          }
          grid.push(line);
     }

     return grid;
}

/* ---------------------------------------------- 
     Find 6x6 Q-Card Candidates 
----------------------------------------------  */
function paperFindQCardCandidates(imageData, width, height) {
     const data = imageData.data;
     const total = width * height;
     const dark = new Uint8Array(total);
     const seen = new Uint8Array(total);
     const candidates = [];

     for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
          const lum = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
          dark[pixel] = lum < 82 ? 1 : 0;
     }

     const queue = [];
     for (let y = 1; y < height - 1; y += 1) {
          for (let x = 1; x < width - 1; x += 1) {
               const start = y * width + x;
               if (!dark[start] || seen[start]) { continue; }

               let minX = x;
               let maxX = x;
               let minY = y;
               let maxY = y;
               let area = 0;
               seen[start] = 1;
               queue.length = 0;
               queue.push(start);

               for (let q = 0; q < queue.length; q += 1) {
                    const current = queue[q];
                    const cx = current % width;
                    const cy = Math.floor(current / width);
                    area += 1;
                    if (cx < minX) { minX = cx; }
                    if (cx > maxX) { maxX = cx; }
                    if (cy < minY) { minY = cy; }
                    if (cy > maxY) { maxY = cy; }

                    const neighbors = [current - 1, current + 1, current - width, current + width];
                    for (const next of neighbors) {
                         if (next <= 0 || next >= total || seen[next] || !dark[next]) { continue; }
                         seen[next] = 1;
                         queue.push(next);
                    }
               }

               const boxW = maxX - minX + 1;
               const boxH = maxY - minY + 1;
               const ratio = boxW / Math.max(1, boxH);
               const fill = area / Math.max(1, boxW * boxH);

               if (boxW < 44 || boxH < 44) { continue; }
               if (boxW > width * 0.72 || boxH > height * 0.72) { continue; }
               if (ratio < 0.72 || ratio > 1.38) { continue; }
               if (fill < 0.42 || fill > 0.94) { continue; }

               candidates.push({ x: minX, y: minY, w: boxW, h: boxH, area: area });
          }
     }

     return candidates.sort(function(a, b) { return b.area - a.area; }).slice(0, 16);
}

/* ---------------------------------------------- 
     Detect 6x6 Q-Cards From Canvas 
----------------------------------------------  */
function paperDetectQCardsFromCanvas(canvas, sourceWidth, sourceHeight) {
     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
     const candidates = paperFindQCardCandidates(imageData, canvas.width, canvas.height);
     const detections = [];
     const used = {};

     candidates.forEach(function(box) {
          const grid = paperReadGridFromCandidate(imageData, canvas.width, canvas.height, box);
          const decoded = paperDecodeQCardGrid(grid);
          if (!decoded || used[decoded.cardId]) { return; }
          used[decoded.cardId] = true;
          detections.push(decoded);
     });

     return detections;
}

/* ---------------------------------------------- 
     Scan Board Frame 
----------------------------------------------  */
async function paperScanBoardFrame() {
     const video = document.getElementById("paperScannerVideo");
     const canvas = document.getElementById("paperScannerCanvas");
     if (!video || !canvas || video.readyState < 2) { return; }

     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     const sourceW = video.videoWidth || 1280;
     const sourceH = video.videoHeight || 720;
     const maxW = 960;
     canvas.width = Math.min(maxW, sourceW);
     canvas.height = Math.round(sourceH * (canvas.width / sourceW));
     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

     const customDetections = paperDetectQCardsFromCanvas(canvas, sourceW, sourceH);
     if (customDetections.length) {
          await paperHandleDetectedCodes(customDetections, "board-camera-6x6");
          return;
     }

     if (paperBarcodeDetector) {
          const barcodes = await paperBarcodeDetector.detect(video);
          if (barcodes && barcodes.length) {
               await paperHandleDetectedCodes(barcodes.map(function(code) {
                    return {
                         data: code.rawValue,
                         location: paperLocationFromBarcode(code)
                    };
               }), "board-camera-qr-fallback");
               return;
          }
     }

     if (!window.jsQR) { return; }
     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
     const result = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
     if (result && result.data) {
          await paperHandleDetectedCodes([{ data: result.data, location: result.location }], "board-camera-qr-fallback");
     }
}

/* ---------------------------------------------- 
     Handle Detected Codes 
----------------------------------------------  */
async function paperHandleDetectedCodes(codes, source) {
     const paper = paperState();
     const accepted = [];

     for (const code of codes) {
          const payload = code.cardId ? code : paperDecodePayload(code.data, code.location);
          if (!payload) { continue; }
          if (payload.sessionId && paper.sessionId && payload.sessionId != paper.sessionId) { continue; }

          const cardId = paperNormalizeCardId(payload.cardId);
          const card = paper.cards.find(function(item) { return paperNormalizeCardId(item.cardId) == cardId; });
          if (!card) { continue; }
          if (!paperScanShouldSubmit(cardId, payload.answer)) { continue; }

          await paperSubmitScan(cardId, payload.answer, source || "board-camera");
          accepted.push(`${card.name}: ${payload.answer}`);
     }

     if (accepted.length) {
          paperSetScannerStatus(`Scanned ${accepted.length}: ${accepted.join(" | ")}`, false);
     }
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
          if (paperScannerStream) { paperCloseBoardScanner(); if (panel) { panel.classList.remove("hidden"); } }
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
          paperSetScannerStatus("6×6 realtime scanner active. It can detect multiple reusable Q-cards at the same time.", false);
          paperStartQrLoop();
     }
     catch (error) {
          paperSetScannerStatus(`Camera could not start: ${error.message || "permission blocked"}. Use manual entry.`, true);
     }
}


/* ---------------------------------------------- 
     Print CSS Large A4 Q-Cards Override
----------------------------------------------  */
function paperPrintCss() {
     return `@page{size:A4 portrait;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,sans-serif}.paper-instructions{width:210mm;height:297mm;padding:21mm 22mm;break-after:page;page-break-after:always;border:7mm solid #16407d;color:#16407d}.brand-pill{display:inline-block;padding:4mm 7mm;border:1.2mm solid #16407d;border-radius:999px;font-size:18pt;font-weight:900}.paper-instructions h1{margin:12mm 0 2mm;font-size:34pt;line-height:.95}.paper-instructions h2{margin:0 0 12mm;font-size:21pt}.paper-instructions p{font-size:14pt;line-height:1.45;max-width:160mm}.paper-print-sheet-title{display:none}.qcard-printable{position:relative;display:block;width:210mm;height:297mm;margin:0;background:#fff;break-after:page;page-break-after:always;overflow:hidden}.qcard-printable:last-child{break-after:auto;page-break-after:auto}.paper-qcard-collection{position:absolute;left:50%;top:7mm;transform:translateX(-50%);font:900 9pt Arial,sans-serif;color:#16407d;letter-spacing:.35mm;white-space:nowrap}.paper-qcard-code{position:absolute;left:50%;top:50%;width:168mm;height:168mm;transform:translate(-50%,-50%);display:grid;place-items:center;padding:0;background:transparent}.paper-qcode-svg,.paper-qcard-marker{width:168mm;height:168mm;display:block;overflow:visible}.paper-qcard-marker rect{vector-effect:non-scaling-stroke}.paper-qcard-letter{position:absolute;font:900 31pt Arial,sans-serif;color:#111;line-height:1}.paper-qcard-letter.a{left:50%;top:49mm;transform:translateX(-50%)}.paper-qcard-letter.b{right:8mm;top:50%;transform:translateY(-50%)}.paper-qcard-letter.c{left:50%;bottom:49mm;transform:translateX(-50%)}.paper-qcard-letter.d{left:8mm;top:50%;transform:translateY(-50%)}.paper-qcard-corner{position:absolute;font:900 20pt Arial,sans-serif;color:#222;line-height:1}.top-left{left:8mm;top:20mm;writing-mode:vertical-rl;transform:rotate(180deg)}.top-right{right:14mm;top:20mm}.bottom-left{left:8mm;bottom:20mm;transform:rotate(180deg)}.bottom-right{right:14mm;bottom:20mm;writing-mode:vertical-rl}.paper-qcard-brand{position:absolute;font:800 8pt Arial,sans-serif;color:#7f8794}.top-brand{left:50%;top:33mm;transform:translateX(-50%)}.left-brand{left:12mm;top:50%;transform:translateY(-50%) rotate(-90deg)}.right-brand{right:12mm;top:50%;transform:translateY(-50%) rotate(90deg)}.paper-qcard-name{position:absolute;left:50%;top:18mm;transform:translateX(-50%);font:900 13pt Arial,sans-serif;color:#222;max-width:108mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.paper-qcard-cut{position:absolute;left:0;right:0;text-align:center;font:700 8pt Arial,sans-serif;color:#777;border-top:1px dashed #777}.top-cut{top:42mm}.bottom-cut{bottom:42mm}@media screen{body{background:#e9edf5}.paper-instructions,.qcard-printable{margin:12px auto;box-shadow:0 6px 20px rgba(0,0,0,.18)}}@media print{.paper-instructions{display:block}.qcard-printable{box-shadow:none}.paper-qcode-svg,.paper-qcard-marker{forced-color-adjust:none}}`;
}

/* ---------------------------------------------- 
     V51 Reinforced Gray Print Q-Card Scanner
----------------------------------------------  */

/* ---------------------------------------------- 
     Paper Luminance
----------------------------------------------  */
function paperLuminance(data, index) {
     return (data[index] * 0.299) + (data[index + 1] * 0.587) + (data[index + 2] * 0.114);
}

/* ---------------------------------------------- 
     Paper Histogram Percentile
----------------------------------------------  */
function paperHistogramPercentile(histogram, total, percentile) {
     const target = Math.max(0, Math.min(total - 1, Math.floor(total * percentile)));
     let sum = 0;
     for (let i = 0; i < histogram.length; i += 1) {
          sum += histogram[i];
          if (sum >= target) { return i; }
     }
     return 128;
}

/* ---------------------------------------------- 
     Paper Adaptive Dark Threshold
----------------------------------------------  */
function paperAdaptiveDarkThreshold(imageData) {
     const data = imageData.data;
     const histogram = new Uint32Array(256);
     let total = 0;

     for (let i = 0; i < data.length; i += 16) {
          const lum = Math.max(0, Math.min(255, Math.round(paperLuminance(data, i))));
          histogram[lum] += 1;
          total += 1;
     }

     const p08 = paperHistogramPercentile(histogram, total, 0.08);
     const p58 = paperHistogramPercentile(histogram, total, 0.58);
     const p82 = paperHistogramPercentile(histogram, total, 0.82);
     const spread = Math.max(20, p82 - p08);
     const threshold = Math.round(p08 + spread * 0.43);

     return Math.max(105, Math.min(188, Math.max(threshold, Math.round((p08 + p58) / 2))));
}

/* ---------------------------------------------- 
     Paper Sample Average Luminance
----------------------------------------------  */
function paperSampleAverageLuminance(imageData, width, height, cx, cy, radius) {
     const data = imageData.data;
     let total = 0;
     let samples = 0;

     for (let yy = -radius; yy <= radius; yy += 1) {
          for (let xx = -radius; xx <= radius; xx += 1) {
               const sx = Math.max(0, Math.min(width - 1, Math.round(cx + xx)));
               const sy = Math.max(0, Math.min(height - 1, Math.round(cy + yy)));
               const index = (sy * width + sx) * 4;
               total += paperLuminance(data, index);
               samples += 1;
          }
     }

     return samples ? total / samples : 0;
}

/* ---------------------------------------------- 
     Paper Average Numbers
----------------------------------------------  */
function paperAverageNumbers(values) {
     if (!values.length) { return 0; }
     return values.reduce(function(total, value) { return total + value; }, 0) / values.length;
}

/* ---------------------------------------------- 
     Read Grid From Candidate
----------------------------------------------  */
function paperReadGridFromCandidate(imageData, width, height, box) {
     const pad = 0.086;
     const gap = 0.04;
     const cell = (1 - (pad * 2) - (gap * 5)) / 6;
     const values = [];
     const grid = [];
     const sampleRadius = Math.max(2, Math.min(9, Math.round(Math.min(box.w, box.h) * cell * 0.16)));

     for (let row = 0; row < 6; row += 1) {
          const line = [];
          for (let col = 0; col < 6; col += 1) {
               const rx = pad + (cell / 2) + col * (cell + gap);
               const ry = pad + (cell / 2) + row * (cell + gap);
               const cx = box.x + rx * box.w;
               const cy = box.y + ry * box.h;
               const value = paperSampleAverageLuminance(imageData, width, height, cx, cy, sampleRadius);
               values.push(value);
               line.push(value);
          }
          grid.push(line);
     }

     const sorted = values.slice().sort(function(a, b) { return a - b; });
     const lowAvg = paperAverageNumbers(sorted.slice(0, 12));
     const highAvg = paperAverageNumbers(sorted.slice(-12));
     const contrast = highAvg - lowAvg;
     const threshold = contrast >= 22 ? (lowAvg + highAvg) / 2 : Math.max(132, lowAvg + 18);

     return grid.map(function(row) {
          return row.map(function(value) { return value > threshold; });
     });
}

/* ---------------------------------------------- 
     Find 6x6 Q-Card Candidates
----------------------------------------------  */
function paperFindQCardCandidates(imageData, width, height) {
     const data = imageData.data;
     const total = width * height;
     const dark = new Uint8Array(total);
     const seen = new Uint8Array(total);
     const candidates = [];
     const darkThreshold = paperAdaptiveDarkThreshold(imageData);

     for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
          const lum = paperLuminance(data, i);
          dark[pixel] = lum < darkThreshold ? 1 : 0;
     }

     const queue = [];
     const neighborOffsets = [-1, 1, -width, width, -width - 1, -width + 1, width - 1, width + 1];

     for (let y = 1; y < height - 1; y += 1) {
          for (let x = 1; x < width - 1; x += 1) {
               const start = y * width + x;
               if (!dark[start] || seen[start]) { continue; }

               let minX = x;
               let maxX = x;
               let minY = y;
               let maxY = y;
               let area = 0;
               seen[start] = 1;
               queue.length = 0;
               queue.push(start);

               for (let q = 0; q < queue.length; q += 1) {
                    const current = queue[q];
                    const cx = current % width;
                    const cy = Math.floor(current / width);
                    area += 1;
                    if (cx < minX) { minX = cx; }
                    if (cx > maxX) { maxX = cx; }
                    if (cy < minY) { minY = cy; }
                    if (cy > maxY) { maxY = cy; }

                    for (const offset of neighborOffsets) {
                         const next = current + offset;
                         if (next <= 0 || next >= total || seen[next] || !dark[next]) { continue; }
                         seen[next] = 1;
                         queue.push(next);
                    }
               }

               const boxW = maxX - minX + 1;
               const boxH = maxY - minY + 1;
               const ratio = boxW / Math.max(1, boxH);
               const fill = area / Math.max(1, boxW * boxH);

               if (boxW < 34 || boxH < 34) { continue; }
               if (boxW > width * 0.92 || boxH > height * 0.92) { continue; }
               if (ratio < 0.62 || ratio > 1.62) { continue; }
               if (fill < 0.24 || fill > 0.98) { continue; }

               const grow = Math.max(2, Math.round(Math.min(boxW, boxH) * 0.012));
               candidates.push({
                    x: Math.max(0, minX - grow),
                    y: Math.max(0, minY - grow),
                    w: Math.min(width - minX, boxW + grow * 2),
                    h: Math.min(height - minY, boxH + grow * 2),
                    area: area,
                    threshold: darkThreshold
               });
          }
     }

     return candidates.sort(function(a, b) { return b.area - a.area; }).slice(0, 40);
}

/* ---------------------------------------------- 
     Detect 6x6 Q-Cards From Canvas
----------------------------------------------  */
function paperDetectQCardsFromCanvas(canvas) {
     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
     const candidates = paperFindQCardCandidates(imageData, canvas.width, canvas.height);
     const detections = [];
     const bestByCard = {};

     candidates.forEach(function(box) {
          const grid = paperReadGridFromCandidate(imageData, canvas.width, canvas.height, box);
          const decoded = paperDecodeQCardGrid(grid);
          if (!decoded) { return; }
          decoded.box = box;
          if (!bestByCard[decoded.cardId] || decoded.confidence > bestByCard[decoded.cardId].confidence) {
               bestByCard[decoded.cardId] = decoded;
          }
     });

     Object.keys(bestByCard).forEach(function(cardId) { detections.push(bestByCard[cardId]); });
     return detections.sort(function(a, b) { return b.confidence - a.confidence; });
}

/* ---------------------------------------------- 
     Scan Should Submit
----------------------------------------------  */
function paperScanShouldSubmit(cardId, answer) {
     const paper = paperState();
     const key = `${paper.current || 0}-${cardId}`;
     const previous = paperScanMemory[key];
     const now = Date.now();
     if (previous && previous.answer == answer && now - previous.time < 1200) { return false; }
     paperScanMemory[key] = { answer: answer, time: now };
     return true;
}

/* ---------------------------------------------- 
     Scan Board Frame
----------------------------------------------  */
async function paperScanBoardFrame() {
     const video = document.getElementById("paperScannerVideo");
     const canvas = document.getElementById("paperScannerCanvas");
     if (!video || !canvas || video.readyState < 2) { return; }

     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     const sourceW = video.videoWidth || 1280;
     const sourceH = video.videoHeight || 720;
     const maxW = 1280;
     canvas.width = Math.min(maxW, sourceW);
     canvas.height = Math.round(sourceH * (canvas.width / sourceW));
     ctx.imageSmoothingEnabled = false;
     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

     const detections = paperDetectQCardsFromCanvas(canvas);
     if (detections.length) {
          paperHandleDetectedCodes(detections, "board-camera-6x6-fast");
     }
}

/* ---------------------------------------------- 
     Handle Detected Codes
----------------------------------------------  */
function paperHandleDetectedCodes(codes, source) {
     const paper = paperState();
     const accepted = [];

     for (const code of codes) {
          const payload = code.cardId ? code : paperDecodePayload(code.data, code.location);
          if (!payload) { continue; }
          if (payload.sessionId && paper.sessionId && payload.sessionId != paper.sessionId) { continue; }

          const cardId = paperNormalizeCardId(payload.cardId);
          const card = paper.cards.find(function(item) { return paperNormalizeCardId(item.cardId) == cardId; });
          if (!card) { continue; }
          if (!paperScanShouldSubmit(cardId, payload.answer)) { continue; }

          paperSubmitScan(cardId, payload.answer, source || "board-camera").catch(function(error) { console.warn(error); });
          accepted.push(`${card.name}: ${payload.answer}`);
     }

     if (accepted.length) {
          paperSetScannerStatus(`Scanned ${accepted.length}: ${accepted.join(" | ")}`, false);
     }
}
