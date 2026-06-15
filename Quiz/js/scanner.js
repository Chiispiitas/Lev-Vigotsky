"use strict";
/* ---------------------------------------------- 
     Paper Scanner Made by: David Santana 
----------------------------------------------  */

const params = new URLSearchParams(location.search);
const sessionId = params.get("session") || "";
const PAPER_API_BASE = "https://chiispiitas.wixsite.com/mr-david-collection/_functions";
const apiBase = PAPER_API_BASE;
const localPrefix = "wgc-paper-";

const PAPER_MAX_CARDS = 60;
const PAPER_ANSWERS = ["A", "B", "C", "D"];
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

     const ctx = elCanvas.getContext("2d", { willReadFrequently: true });
     const targetWidth = Math.min(720, elVideo.videoWidth || 720);
     const scale = targetWidth / Math.max(1, elVideo.videoWidth || targetWidth);
     elCanvas.width = targetWidth;
     elCanvas.height = Math.max(1, Math.round((elVideo.videoHeight || 405) * scale));
     ctx.drawImage(elVideo, 0, 0, elCanvas.width, elCanvas.height);
     const imageData = ctx.getImageData(0, 0, elCanvas.width, elCanvas.height);

     const qcodes = detectQCodesFromImageData(imageData, elCanvas.width, elCanvas.height);
     if (qcodes.length) {
          await handleDetectedCodes(qcodes, "phone-qcode");
          return;
     }

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
          const payload = code && code.cardId ? code : decodePayload(code.data, code.location);
          if (!payload) { continue; }
          if (payload.sessionId && payload.sessionId != sessionId) { continue; }
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
          return { sessionId: parts[1], cardId: normalizeCardId(parts[2]), answer: parts[3] };
     }
     if (parts.length == 3 && parts[0] == "WGCQ") {
          return { sessionId: parts[1], cardId: normalizeCardId(parts[2]), answer: answerFromQrLocation(location) };
     }
     if (parts.length == 2 && parts[0] == "WGCQ") {
          return { sessionId: "", cardId: normalizeCardId(parts[1]), answer: answerFromQrLocation(location) };
     }
     return null;
}

/* ---------------------------------------------- 
     Normalize Card ID 
----------------------------------------------  */
function normalizeCardId(cardId) {
     const number = Math.max(1, Math.min(PAPER_MAX_CARDS, Number(String(cardId || "").replace(/\D/g, "")) || 1));
     return `P${String(number).padStart(2, "0")}`;
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
     if (angle <= -45 && angle > -135) { return "B"; }
     if (angle > 135 || angle <= -135) { return "C"; }
     return "D";
}

/* ---------------------------------------------- 
     Q-Code Checksum 
----------------------------------------------  */
function qCodeChecksum(value) {
     return ((value * 37) + 23) & 63;
}

/* ---------------------------------------------- 
     Rotate Matrix Clockwise 
----------------------------------------------  */
function rotateMatrixClockwise(matrix) {
     const result = Array.from({ length: 6 }, function() { return Array(6).fill(0); });
     for (let row = 0; row < 6; row += 1) {
          for (let col = 0; col < 6; col += 1) {
               result[col][5 - row] = matrix[row][col];
          }
     }
     return result;
}

/* ---------------------------------------------- 
     Fixed Bits Match 
----------------------------------------------  */
function qCodeFixedBitsMatch(matrix) {
     return Object.keys(PAPER_QCODE_FIXED_BITS).every(function(key) {
          const parts = key.split(",").map(Number);
          return Number(matrix[parts[0]][parts[1]]) == PAPER_QCODE_FIXED_BITS[key];
     });
}

/* ---------------------------------------------- 
     Decode Q-Code Matrix 
----------------------------------------------  */
function decodeQCodeMatrix(observed) {
     let matrix = observed;
     for (let rotation = 0; rotation < 4; rotation += 1) {
          if (qCodeFixedBitsMatch(matrix)) {
               const bits = PAPER_QCODE_DATA_POSITIONS.slice(0, 12).map(function(position) {
                    return matrix[position[0]][position[1]] ? 1 : 0;
               });
               let value = 0;
               let checksum = 0;
               bits.slice(0, 6).forEach(function(bit) { value = (value << 1) | bit; });
               bits.slice(6, 12).forEach(function(bit) { checksum = (checksum << 1) | bit; });
               if (value >= 0 && value < PAPER_MAX_CARDS && checksum == qCodeChecksum(value)) {
                    return { cardId: `P${String(value + 1).padStart(2, "0")}`, answer: PAPER_ANSWERS[rotation] };
               }
          }
          matrix = rotateMatrixClockwise(matrix);
     }
     return null;
}

/* ---------------------------------------------- 
     Detect Q-Codes From Image Data 
----------------------------------------------  */
function detectQCodesFromImageData(imageData, width, height) {
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
               const decoded = decodeQCodeFromBox(data, width, height, { minX, minY, maxX, maxY });
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
function decodeQCodeFromBox(data, width, height, box) {
     const boxW = box.maxX - box.minX + 1;
     const boxH = box.maxY - box.minY + 1;
     const matrix = [];
     for (let row = 0; row < 6; row += 1) {
          const rowBits = [];
          for (let col = 0; col < 6; col += 1) {
               const sampleX = Math.round(box.minX + ((1.5 + col) / 8) * boxW);
               const sampleY = Math.round(box.minY + ((1.5 + row) / 8) * boxH);
               rowBits.push(sampleIsDark(data, width, height, sampleX, sampleY) ? 1 : 0);
          }
          matrix.push(rowBits);
     }
     return decodeQCodeMatrix(matrix);
}

/* ---------------------------------------------- 
     Sample Is Dark 
----------------------------------------------  */
function sampleIsDark(data, width, height, x, y) {
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
