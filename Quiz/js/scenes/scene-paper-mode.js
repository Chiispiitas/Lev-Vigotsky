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
     Paper Q-Code Constants 
----------------------------------------------  */
const PAPER_QCODE_FIXED_BITS = {
     "0,0": 1, "0,1": 1, "1,0": 1, "1,1": 0,
     "0,5": 0, "1,5": 1, "5,0": 0, "5,1": 1,
     "5,5": 1, "4,5": 0
};
const PAPER_QCODE_DATA_POSITIONS = (function() {
     const positions = [];
     for (let row = 0; row < 6; row += 1) {
          for (let col = 0; col < 6; col += 1) {
               if (PAPER_QCODE_FIXED_BITS[`${row},${col}`] === undefined) {
                    positions.push([row, col]);
               }
          }
     }
     return positions;
})();

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
     const area = document.getElementById("paperPrintArea");
     if (!area) { return; }

     area.innerHTML = `<div class="paper-print-sheet-title">Mr. David's Whiteboard Game Collection — Universal Paper Q-cards</div>`;
     for (const card of paper.cards) {
          const cardElement = document.createElement("article");
          cardElement.className = "printable-paper-card qcard-printable";
          cardElement.innerHTML = paperBuildQCardHtml(card);
          area.appendChild(cardElement);
          const code = cardElement.querySelector(".paper-qcard-code");
          await paperFillQrImage(code, paperEncodePayload("", card.cardId), 210);
     }
     paperSetLobbyStatus("Universal Q-cards generated. These cards can be reused for every Paper Mode game.", false);
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
          <div class="paper-qcard-brand top-brand">MR. DAVID'S COLLECTION</div>
          <div class="paper-qcard-brand left-brand">WHITEBOARD GAME COLLECTION</div>
          <div class="paper-qcard-brand right-brand">PAPER MODE</div>
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
     Fill Q-Code 
----------------------------------------------  */
async function paperFillQrImage(container, payload, size) {
     if (!container) { return; }
     const parts = String(payload || "").split("|");
     const cardId = parts.length >= 2 ? parts[parts.length - 1] : payload;
     container.innerHTML = paperBuildQCodeSvg(cardId);
}

/* ---------------------------------------------- 
     Encode Payload 
----------------------------------------------  */
function paperEncodePayload(sessionId, cardId) {
     return `WGCQ|${paperNormalizeCardId(cardId)}`;
}

/* ---------------------------------------------- 
     Normalize Card ID 
----------------------------------------------  */
function paperNormalizeCardId(cardId) {
     const number = Math.max(1, Math.min(PAPER_MAX_CARDS, Number(String(cardId || "").replace(/\D/g, "")) || 1));
     return `P${String(number).padStart(2, "0")}`;
}

/* ---------------------------------------------- 
     Q-Code Checksum 
----------------------------------------------  */
function paperQCodeChecksum(value) {
     return ((value * 37) + 23) & 63;
}

/* ---------------------------------------------- 
     Build Q-Code Matrix 
----------------------------------------------  */
function paperBuildQCodeMatrix(cardId) {
     const number = Math.max(1, Math.min(PAPER_MAX_CARDS, Number(String(cardId || "").replace(/\D/g, "")) || 1));
     const value = number - 1;
     const checksum = paperQCodeChecksum(value);
     const bits = [];

     for (let bit = 5; bit >= 0; bit -= 1) { bits.push((value >> bit) & 1); }
     for (let bit = 5; bit >= 0; bit -= 1) { bits.push((checksum >> bit) & 1); }

     const matrix = Array.from({ length: 6 }, function() { return Array(6).fill(0); });
     Object.keys(PAPER_QCODE_FIXED_BITS).forEach(function(key) {
          const parts = key.split(",").map(Number);
          matrix[parts[0]][parts[1]] = PAPER_QCODE_FIXED_BITS[key];
     });

     PAPER_QCODE_DATA_POSITIONS.forEach(function(position, index) {
          if (index < bits.length) { matrix[position[0]][position[1]] = bits[index]; }
     });

     return matrix;
}

/* ---------------------------------------------- 
     Build Q-Code SVG 
----------------------------------------------  */
function paperBuildQCodeSvg(cardId) {
     const matrix = paperBuildQCodeMatrix(cardId);
     const cells = [];
     for (let row = 0; row < 6; row += 1) {
          for (let col = 0; col < 6; col += 1) {
               const fill = matrix[row][col] ? "#000" : "#fff";
               cells.push(`<rect x="${1 + col}" y="${1 + row}" width="1" height="1" fill="${fill}"/>`);
          }
     }

     return `<svg class="paper-qcode-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" role="img" aria-label="Q-code ${esc(cardId)}"><rect width="8" height="8" fill="#fff"/><rect x="0.22" y="0.22" width="7.56" height="7.56" fill="none" stroke="#000" stroke-width="0.44"/>${cells.join("")}<rect x="0.08" y="0.08" width="7.84" height="7.84" fill="none" stroke="#000" stroke-width="0.16"/></svg>`;
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
     Paper Answer From QR Location 
----------------------------------------------  */
function paperAnswerFromQrLocation(location) {
     if (!location || !location.topLeftCorner || !location.topRightCorner) { return "A"; }
     const dx = location.topRightCorner.x - location.topLeftCorner.x;
     const dy = location.topRightCorner.y - location.topLeftCorner.y;
     let angle = Math.atan2(dy, dx) * 180 / Math.PI;
     if (angle <= -180) { angle += 360; }
     if (angle > 180) { angle -= 360; }

     if (angle > -45 && angle <= 45) { return "A"; }
     if (angle <= -45 && angle > -135) { return "B"; }
     if (angle > 135 || angle <= -135) { return "C"; }
     return "D";
}

/* ---------------------------------------------- 
     Rotate Q-Code Matrix Clockwise 
----------------------------------------------  */
function paperRotateMatrixClockwise(matrix) {
     const result = Array.from({ length: 6 }, function() { return Array(6).fill(0); });
     for (let row = 0; row < 6; row += 1) {
          for (let col = 0; col < 6; col += 1) {
               result[col][5 - row] = matrix[row][col];
          }
     }
     return result;
}

/* ---------------------------------------------- 
     Decode Q-Code Matrix 
----------------------------------------------  */
function paperDecodeQCodeMatrix(observed) {
     let matrix = observed;
     for (let rotation = 0; rotation < 4; rotation += 1) {
          if (paperQCodeFixedBitsMatch(matrix)) {
               const bits = PAPER_QCODE_DATA_POSITIONS.slice(0, 12).map(function(position) {
                    return matrix[position[0]][position[1]] ? 1 : 0;
               });
               let value = 0;
               let checksum = 0;
               bits.slice(0, 6).forEach(function(bit) { value = (value << 1) | bit; });
               bits.slice(6, 12).forEach(function(bit) { checksum = (checksum << 1) | bit; });
               if (value >= 0 && value < PAPER_MAX_CARDS && checksum == paperQCodeChecksum(value)) {
                    return { cardId: `P${String(value + 1).padStart(2, "0")}`, answer: PAPER_ANSWERS[rotation] };
               }
          }
          matrix = paperRotateMatrixClockwise(matrix);
     }
     return null;
}

/* ---------------------------------------------- 
     Q-Code Fixed Bits Match 
----------------------------------------------  */
function paperQCodeFixedBitsMatch(matrix) {
     return Object.keys(PAPER_QCODE_FIXED_BITS).every(function(key) {
          const parts = key.split(",").map(Number);
          return Number(matrix[parts[0]][parts[1]]) == PAPER_QCODE_FIXED_BITS[key];
     });
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
     const printScript = autoPrint ? `<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},550);});<\/script>` : "";

     return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mr. David's Collection Q-cards</title>
<style>${paperPrintCss()}</style>
</head>
<body>
<section class="paper-instructions">
<div class="brand-pill">MR. DAVID'S COLLECTION</div>
<h1>Universal Paper Mode Q-cards</h1>
<p>These cards are <b>not tied to a session</b>. Reuse the same printed set for every Paper Mode game.</p>
<p>Give one card to each student. Students answer by rotating the card so the selected answer letter is above the 6×6 Q-code.</p>
<p>Configured set: <b>${paper.cards.length}</b> cards</p>
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
     return `@page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#123865;font-family:Arial,sans-serif}.paper-instructions{width:210mm;height:297mm;padding:22mm 22mm;break-after:page;page-break-after:always;background:linear-gradient(135deg,#e8f7ff 0%,#fff6a8 52%,#ffd39b 100%)}.brand-pill{display:inline-block;padding:4mm 7mm;border:1.4mm solid #fff;border-radius:99mm;background:linear-gradient(#fff171,#ff9d2f);font:900 18pt Arial,sans-serif;color:#16407d;box-shadow:0 3mm 0 rgba(22,64,125,.18)}.paper-instructions h1{margin:12mm 0 8mm;font-size:28pt;line-height:1;color:#16407d}.paper-instructions p{max-width:150mm;font-size:15pt;line-height:1.5;color:#243d5c}.paper-print-sheet-title{display:none}.qcard-printable{position:relative;display:block;width:210mm;height:297mm;margin:0;background:#fff;break-after:page;page-break-after:always;overflow:hidden}.qcard-printable:last-child{break-after:auto;page-break-after:auto}.paper-qcard-code{position:absolute;left:50%;top:50%;width:72mm;height:72mm;transform:translate(-50%,-50%);display:grid;place-items:center;background:#fff;border:.7mm solid #111}.paper-qcode-svg{width:64mm;height:64mm;display:block;image-rendering:pixelated}.paper-qcard-letter{position:absolute;font:900 13pt Arial,sans-serif;color:#333}.paper-qcard-letter.a{left:50%;top:74mm;transform:translateX(-50%)}.paper-qcard-letter.b{right:44mm;top:50%;transform:translateY(-50%)}.paper-qcard-letter.c{left:50%;bottom:74mm;transform:translateX(-50%)}.paper-qcard-letter.d{left:44mm;top:50%;transform:translateY(-50%)}.paper-qcard-corner{position:absolute;font:900 15pt Arial,sans-serif;color:#222}.top-left{left:9mm;top:15mm;writing-mode:vertical-rl;transform:rotate(180deg)}.top-right{right:16mm;top:15mm}.bottom-left{left:9mm;bottom:15mm;transform:rotate(180deg)}.bottom-right{right:16mm;bottom:15mm;writing-mode:vertical-rl}.paper-qcard-brand{position:absolute;font:900 8pt Arial,sans-serif;color:#bfc5cf;letter-spacing:.4mm}.top-brand{left:50%;top:30mm;transform:translateX(-50%)}.left-brand{left:22mm;top:50%;transform:translateY(-50%) rotate(-90deg)}.right-brand{right:22mm;top:50%;transform:translateY(-50%) rotate(90deg)}.paper-qcard-name{position:absolute;left:50%;top:18mm;transform:translateX(-50%);font:900 12pt Arial,sans-serif;color:#222;max-width:95mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.paper-qcard-cut{position:absolute;left:0;right:0;text-align:center;font:700 8pt Arial,sans-serif;color:#999;border-top:1px dashed #aaa}.top-cut{top:42mm}.bottom-cut{bottom:42mm}@media screen{body{background:#e9edf5}.paper-instructions,.qcard-printable{margin:12px auto;box-shadow:0 6px 20px rgba(0,0,0,.18)}}@media print{.paper-instructions{display:block}.qcard-printable{box-shadow:none}}`;
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
     Detect Q-Codes From Image Data 
----------------------------------------------  */
function paperDetectQCodesFromImageData(imageData, width, height) {
     const data = imageData.data;
     const visited = new Uint8Array(width * height);
     const results = [];

     function isDark(index) {
          const offset = index * 4;
          return data[offset] + data[offset + 1] + data[offset + 2] < 250;
     }

     for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
               const start = y * width + x;
               if (visited[start] || !isDark(start)) { continue; }

               const stack = [start];
               visited[start] = 1;
               let minX = x, maxX = x, minY = y, maxY = y, count = 0;

               while (stack.length) {
                    const current = stack.pop();
                    const cx = current % width;
                    const cy = Math.floor(current / width);
                    count += 1;
                    if (cx < minX) { minX = cx; }
                    if (cx > maxX) { maxX = cx; }
                    if (cy < minY) { minY = cy; }
                    if (cy > maxY) { maxY = cy; }

                    const neighbors = [current - 1, current + 1, current - width, current + width];
                    for (const next of neighbors) {
                         if (next < 0 || next >= visited.length || visited[next]) { continue; }
                         const nx = next % width;
                         if ((next == current - 1 && nx > cx) || (next == current + 1 && nx < cx)) { continue; }
                         if (!isDark(next)) { continue; }
                         visited[next] = 1;
                         stack.push(next);
                    }
               }

               const boxW = maxX - minX + 1;
               const boxH = maxY - minY + 1;
               const ratio = boxW / Math.max(1, boxH);
               const fill = count / Math.max(1, boxW * boxH);
               if (boxW < 34 || boxH < 34 || boxW > width * 0.55 || boxH > height * 0.75) { continue; }
               if (ratio < 0.72 || ratio > 1.38) { continue; }
               if (fill < 0.035 || fill > 0.78) { continue; }

               const decoded = paperDecodeQCodeFromBox(data, width, height, { minX, minY, maxX, maxY });
               if (decoded && !results.some(function(item) { return item.cardId == decoded.cardId; })) {
                    results.push(decoded);
               }
          }
     }
     return results;
}

/* ---------------------------------------------- 
     Decode Q-Code From Box 
----------------------------------------------  */
function paperDecodeQCodeFromBox(data, width, height, box) {
     const boxW = box.maxX - box.minX + 1;
     const boxH = box.maxY - box.minY + 1;
     const matrix = [];
     for (let row = 0; row < 6; row += 1) {
          const rowBits = [];
          for (let col = 0; col < 6; col += 1) {
               const sampleX = Math.round(box.minX + ((1.5 + col) / 8) * boxW);
               const sampleY = Math.round(box.minY + ((1.5 + row) / 8) * boxH);
               rowBits.push(paperSampleIsDark(data, width, height, sampleX, sampleY) ? 1 : 0);
          }
          matrix.push(rowBits);
     }
     return paperDecodeQCodeMatrix(matrix);
}

/* ---------------------------------------------- 
     Sample Is Dark 
----------------------------------------------  */
function paperSampleIsDark(data, width, height, x, y) {
     let total = 0;
     let samples = 0;
     for (let dy = -2; dy <= 2; dy += 1) {
          for (let dx = -2; dx <= 2; dx += 1) {
               const sx = Math.max(0, Math.min(width - 1, x + dx));
               const sy = Math.max(0, Math.min(height - 1, y + dy));
               const offset = (sy * width + sx) * 4;
               total += data[offset] + data[offset + 1] + data[offset + 2];
               samples += 1;
          }
     }
     return (total / samples) < 380;
}

/* ---------------------------------------------- 
     Scan Board Frame 
----------------------------------------------  */
async function paperScanBoardFrame() {
     const video = document.getElementById("paperScannerVideo");
     const canvas = document.getElementById("paperScannerCanvas");
     if (!video || !canvas || video.readyState < 2) { return; }

     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     const targetWidth = Math.min(720, video.videoWidth || 720);
     const scale = targetWidth / Math.max(1, video.videoWidth || targetWidth);
     canvas.width = targetWidth;
     canvas.height = Math.max(1, Math.round((video.videoHeight || 405) * scale));
     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

     const qcodes = paperDetectQCodesFromImageData(imageData, canvas.width, canvas.height);
     if (qcodes.length) {
          await paperHandleDetectedCodes(qcodes, "board-qcode");
          return;
     }

     if (paperBarcodeDetector) {
          const barcodes = await paperBarcodeDetector.detect(video);
          if (barcodes && barcodes.length) {
               await paperHandleDetectedCodes(barcodes.map(function(code) {
                    return { data: code.rawValue, location: paperLocationFromBarcode(code) };
               }), "board-camera");
               return;
          }
     }

     if (!window.jsQR) { return; }
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
          const payload = code && code.cardId ? code : paperDecodePayload(code.data, code.location);
          if (!payload) { continue; }
          if (payload.sessionId && payload.sessionId != paper.sessionId) { continue; }
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
