"use strict";
/* ---------------------------------------------- 
     Paper Scanner Made by: David Santana 
----------------------------------------------  */

const params = new URLSearchParams(location.search);
const sessionId = params.get("session") || "";
const PAPER_API_BASE = "https://chiispiitas.wixsite.com/mr-david-collection/_functions";
const apiBase = PAPER_API_BASE;
const localPrefix = "wgc-paper-";
var scannerStream = null;
var scannerTimer = null;

const elSession = document.getElementById("scannerSessionId");
const elApi = document.getElementById("scannerApiStatus");
const elStatus = document.getElementById("scannerStatus");
const elVideo = document.getElementById("scannerVideo");
const elCanvas = document.getElementById("scannerCanvas");
const elLog = document.getElementById("scanLog");
const elManual = document.getElementById("manualCardId");

elSession.textContent = sessionId || "Missing session";
elApi.textContent = "Connected to hardcoded Wix Velo API";

document.getElementById("btnStartCamera").addEventListener("click", startCamera);
document.querySelectorAll("[data-answer]").forEach(function(button) {
     button.addEventListener("click", function() {
          const cardId = (elManual.value || "").trim().toUpperCase();
          if (!cardId) { setStatus("Type the card ID first.", true); return; }
          submitScan(cardId, button.dataset.answer, "phone-manual");
     });
});

/* ---------------------------------------------- 
     Start Camera 
----------------------------------------------  */
async function startCamera() {
     if (!sessionId) { setStatus("The scanner URL has no session ID.", true); return; }
     if (location.protocol == "file:") {
          setStatus("Camera cannot open from file://. Open this scanner from the QR on the Wix/HTTPS site or run a local server.", true);
          return;
     }
     if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setStatus("Camera API is unavailable on this browser.", true);
          return;
     }
     if (!window.jsQR) {
          setStatus("Scanner library did not load. Check internet connection or use manual backup.", true);
          return;
     }
     try {
          scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
          elVideo.srcObject = scannerStream;
          await elVideo.play();
          setStatus("Scanning. Aim at one Q-card. Rotate the card so the chosen answer is above the code.", false);
          startLoop();
     }
     catch (error) {
          setStatus("Camera permission was blocked. Use manual backup.", true);
     }
}

/* ---------------------------------------------- 
     Start Loop 
----------------------------------------------  */
function startLoop() {
     clearInterval(scannerTimer);
     scannerTimer = setInterval(function() {
          if (!window.jsQR || elVideo.readyState < 2) { return; }
          const ctx = elCanvas.getContext("2d", { willReadFrequently: true });
          elCanvas.width = elVideo.videoWidth;
          elCanvas.height = elVideo.videoHeight;
          ctx.drawImage(elVideo, 0, 0, elCanvas.width, elCanvas.height);
          const imageData = ctx.getImageData(0, 0, elCanvas.width, elCanvas.height);
          const result = jsQR(imageData.data, elCanvas.width, elCanvas.height, { inversionAttempts: "attemptBoth" });
          if (!result || !result.data) { return; }
          const payload = decodePayload(result.data, result.location);
          if (!payload) { setStatus("QR found, but it is not a paper answer card.", true); return; }
          if (payload.sessionId != sessionId) { setStatus("This card belongs to another session.", true); return; }
          submitScan(payload.cardId, payload.answer, "phone-camera");
     }, 600);
}

/* ---------------------------------------------- 
     Decode Payload 
----------------------------------------------  */
function decodePayload(value, location) {
     const parts = String(value || "").trim().split("|");
     if (parts.length == 4 && parts[0] == "WGC") {
          return { sessionId: parts[1], cardId: parts[2], answer: parts[3] };
     }
     if (parts.length == 3 && parts[0] == "WGCQ") {
          return { sessionId: parts[1], cardId: parts[2], answer: answerFromQrLocation(location) };
     }
     return null;
}

/* ---------------------------------------------- 
     Answer From QR Location 
----------------------------------------------  */
function answerFromQrLocation(location) {
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
     Get Current Question Index 
----------------------------------------------  */
async function getCurrentQuestionIndex() {
     if (!apiBase || !sessionId) { return 0; }
     try {
          const response = await fetch(`${apiBase}/quizSession?sessionId=${encodeURIComponent(sessionId)}`);
          if (!response.ok) { return 0; }
          const data = await response.json();
          return Number(data.item && data.item.currentQuestionIndex || 0);
     }
     catch (error) {
          return 0;
     }
}

/* ---------------------------------------------- 
     Submit Scan 
----------------------------------------------  */
async function submitScan(cardId, answer, source) {
     if (!sessionId) { setStatus("Missing session ID.", true); return; }
     const questionIndex = await getCurrentQuestionIndex();
     const scan = { sessionId, questionIndex, cardId, answer, source, timestamp: new Date().toISOString() };
     try {
          if (apiBase) {
               await fetch(`${apiBase}/quizScan`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(scan)
               });
          }
          else {
               const key = `${localPrefix}${sessionId}-phone-scans`;
               const existing = JSON.parse(localStorage.getItem(key) || "[]");
               existing.push(scan);
               localStorage.setItem(key, JSON.stringify(existing));
          }
          addLog(cardId, answer);
          setStatus(`${cardId}: ${answer} sent.`, false);
     }
     catch (error) {
          setStatus(`Could not send scan. ${error.message}`, true);
     }
}

/* ---------------------------------------------- 
     Add Log 
----------------------------------------------  */
function addLog(cardId, answer) {
     const row = document.createElement("div");
     row.className = "log-row";
     row.innerHTML = `<span>${escapeHtml(cardId)}</span><span>${escapeHtml(answer)}</span>`;
     elLog.prepend(row);
}

/* ---------------------------------------------- 
     Set Status 
----------------------------------------------  */
function setStatus(message, bad) {
     elStatus.textContent = message;
     elStatus.classList.toggle("bad", !!bad);
}

/* ---------------------------------------------- 
     Escape HTML 
----------------------------------------------  */
function escapeHtml(value) {
     return String(value || "").replace(/[&<>"]/g, function(match) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[match];
     });
}
