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
var scannerFrame = null;
var scannerBusy = false;
var barcodeDetector = null;
var scanMemory = {};

const elSession = document.getElementById("scannerSessionId");
const elApi = document.getElementById("scannerApiStatus");
const elStatus = document.getElementById("scannerStatus");
const elVideo = document.getElementById("scannerVideo");
const elCanvas = document.getElementById("scannerCanvas");
const elLog = document.getElementById("scanLog");
const elManual = document.getElementById("manualCardId");
const btnStartCamera = document.getElementById("btnStartCamera");

if (elSession) { elSession.textContent = sessionId || "Missing session"; }
if (elApi) { elApi.textContent = "Scanner URL: GitHub Pages · Responses: Wix Velo API"; }

if (btnStartCamera) {
     btnStartCamera.addEventListener("click", startCamera);
     btnStartCamera.addEventListener("touchend", function(event) {
          event.preventDefault();
          startCamera();
     }, { passive: false });
}

document.querySelectorAll("[data-answer]").forEach(function(button) {
     button.addEventListener("click", function() {
          const cardId = (elManual && elManual.value || "").trim().toUpperCase();
          if (!cardId) { setStatus("Type the card ID first.", true); return; }
          submitScan(cardId, button.dataset.answer, "phone-manual");
     });
});

/* ---------------------------------------------- 
     Start Camera 
----------------------------------------------  */
async function startCamera() {
     if (!sessionId) { setStatus("The scanner URL has no session ID.", true); return; }
     if (!window.isSecureContext) {
          setStatus("Camera needs HTTPS. Open the scanner from the GitHub Pages URL.", true);
          return;
     }
     if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setStatus("Camera API is unavailable on this browser.", true);
          return;
     }

     try {
          if (btnStartCamera) { btnStartCamera.disabled = true; btnStartCamera.textContent = "Starting..."; }
          await prepareBarcodeDetector();
          scannerStream = await navigator.mediaDevices.getUserMedia({
               video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
               },
               audio: false
          });
          elVideo.srcObject = scannerStream;
          elVideo.setAttribute("playsinline", "");
          elVideo.setAttribute("webkit-playsinline", "");
          await elVideo.play();
          if (btnStartCamera) { btnStartCamera.textContent = "Scanning"; }
          setStatus("Scanning continuously. Show one or more Q-cards and rotate each card so the chosen answer is above the code.", false);
          startLoop();
     }
     catch (error) {
          if (btnStartCamera) { btnStartCamera.disabled = false; btnStartCamera.textContent = "Start Camera"; }
          setStatus(`Camera could not start: ${error.message || "permission blocked"}. Use manual backup.`, true);
     }
}

/* ---------------------------------------------- 
     Prepare Barcode Detector 
----------------------------------------------  */
async function prepareBarcodeDetector() {
     if (!("BarcodeDetector" in window)) { return; }
     try {
          if (BarcodeDetector.getSupportedFormats) {
               const formats = await BarcodeDetector.getSupportedFormats();
               if (!formats.includes("qr_code")) { return; }
          }
          barcodeDetector = new BarcodeDetector({ formats: ["qr_code"] });
     }
     catch (error) {
          barcodeDetector = null;
     }
}

/* ---------------------------------------------- 
     Start Loop 
----------------------------------------------  */
function startLoop() {
     cancelAnimationFrame(scannerFrame);
     scannerBusy = false;

     const scanFrame = async function() {
          if (!scannerStream) { return; }
          if (!scannerBusy) {
               scannerBusy = true;
               try { await scanCurrentFrame(); }
               catch (error) { console.warn(error); }
               scannerBusy = false;
          }
          scannerFrame = requestAnimationFrame(scanFrame);
     };

     scannerFrame = requestAnimationFrame(scanFrame);
}

/* ---------------------------------------------- 
     Scan Current Frame 
----------------------------------------------  */
async function scanCurrentFrame() {
     if (!elVideo || !elCanvas || elVideo.readyState < 2) { return; }

     if (barcodeDetector) {
          const barcodes = await barcodeDetector.detect(elVideo);
          if (barcodes && barcodes.length) {
               await handleDetectedCodes(barcodes.map(function(code) {
                    return { data: code.rawValue, location: locationFromBarcode(code) };
               }), "phone-camera");
               return;
          }
     }

     if (!window.jsQR) { return; }
     const ctx = elCanvas.getContext("2d", { willReadFrequently: true });
     elCanvas.width = elVideo.videoWidth;
     elCanvas.height = elVideo.videoHeight;
     ctx.drawImage(elVideo, 0, 0, elCanvas.width, elCanvas.height);
     const imageData = ctx.getImageData(0, 0, elCanvas.width, elCanvas.height);
     const result = jsQR(imageData.data, elCanvas.width, elCanvas.height, { inversionAttempts: "attemptBoth" });
     if (result && result.data) {
          await handleDetectedCodes([{ data: result.data, location: result.location }], "phone-camera");
     }
}

/* ---------------------------------------------- 
     Location From Barcode 
----------------------------------------------  */
function locationFromBarcode(code) {
     if (!code || !code.cornerPoints || code.cornerPoints.length < 2) { return null; }
     return {
          topLeftCorner: code.cornerPoints[0],
          topRightCorner: code.cornerPoints[1]
     };
}

/* ---------------------------------------------- 
     Handle Detected Codes 
----------------------------------------------  */
async function handleDetectedCodes(codes, source) {
     const accepted = [];
     for (const code of codes) {
          const payload = decodePayload(code.data, code.location);
          if (!payload) { continue; }
          if (payload.sessionId != sessionId) { continue; }
          if (!scanShouldSubmit(payload.cardId, payload.answer)) { continue; }
          await submitScan(payload.cardId, payload.answer, source || "phone-camera");
          accepted.push(`${payload.cardId}: ${payload.answer}`);
     }
     if (accepted.length) {
          setStatus(`Scanned ${accepted.length}: ${accepted.join(" | ")}`, false);
     }
}

/* ---------------------------------------------- 
     Scan Should Submit 
----------------------------------------------  */
function scanShouldSubmit(cardId, answer) {
     const key = `${cardId}`;
     const previous = scanMemory[key];
     if (previous && previous.answer == answer) { return false; }
     scanMemory[key] = { answer: answer, time: Date.now() };
     return true;
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
     let angle = Math.atan2(dy, dx) * 180 / Math.PI;
     if (angle <= -180) { angle += 360; }
     if (angle > 180) { angle -= 360; }

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
          await fetch(`${apiBase}/quizScan`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(scan)
          });
          addLog(cardId, answer);
     }
     catch (error) {
          const key = `${localPrefix}${sessionId}-phone-scans`;
          const existing = JSON.parse(localStorage.getItem(key) || "[]");
          existing.push(scan);
          localStorage.setItem(key, JSON.stringify(existing));
          addLog(cardId, answer);
          setStatus(`Saved locally because Wix did not respond: ${error.message}`, true);
     }
}

/* ---------------------------------------------- 
     Add Log 
----------------------------------------------  */
function addLog(cardId, answer) {
     if (!elLog) { return; }
     const row = document.createElement("div");
     row.className = "log-row";
     row.innerHTML = `<span>${escapeHtml(cardId)}</span><span>${escapeHtml(answer)}</span>`;
     elLog.prepend(row);
}

/* ---------------------------------------------- 
     Set Status 
----------------------------------------------  */
function setStatus(message, bad) {
     if (!elStatus) { return; }
     elStatus.textContent = message;
     elStatus.classList.toggle("bad", !!bad);
}

/* ---------------------------------------------- 
     Escape HTML 
----------------------------------------------  */
function escapeHtml(value) {
     return String(value || "").replace(/[&<>\"]/g, function(match) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" }[match];
     });
}
