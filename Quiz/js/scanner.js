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


/* ---------------------------------------------- 
     V47 Universal 6x6 Q-Card Scanner Overrides
----------------------------------------------  */

const SCANNER_MAX_CARDS = 60;

/* ---------------------------------------------- 
     Normalize Card ID 
----------------------------------------------  */
function normalizeCardId(cardId) {
     const digits = String(cardId || "").replace(/\D/g, "");
     const number = Math.max(1, Math.min(SCANNER_MAX_CARDS, Number(digits) || 1));
     return `P${String(number).padStart(2, "0")}`;
}

/* ---------------------------------------------- 
     Q-Card Data Positions 
----------------------------------------------  */
function qCardDataPositions() {
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
     Rotate Grid Clockwise 
----------------------------------------------  */
function rotateGrid(grid, times) {
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
function anchorScore(grid) {
     let score = 0;
     if (grid[0][0]) { score += 1; }
     if (grid[0][1]) { score += 1; }
     if (grid[1][0]) { score += 1; }
     if (!grid[1][1]) { score += 1; }
     return score;
}

/* ---------------------------------------------- 
     Corner Noise Score 
----------------------------------------------  */
function cornerNoiseScore(grid) {
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
function decodeQCardGrid(rawGrid) {
     const answers = ["A", "B", "C", "D"];

     for (let rotation = 0; rotation < 4; rotation += 1) {
          const grid = rotateGrid(rawGrid, rotation);
          if (anchorScore(grid) < 3) { continue; }
          if (cornerNoiseScore(grid) > 2) { continue; }

          const positions = qCardDataPositions();
          const bits = positions.slice(0, 10).map(function(position) {
               return grid[position[0]][position[1]] ? 1 : 0;
          });

          let value = 0;
          for (let i = 0; i < 6; i += 1) { value |= bits[i] << i; }
          let checksum = 0;
          for (let i = 0; i < 4; i += 1) { checksum |= bits[6 + i] << i; }

          if (value < 0 || value >= SCANNER_MAX_CARDS) { continue; }
          if (checksum !== ((value * 7 + 11) & 15)) { continue; }

          return {
               cardId: `P${String(value + 1).padStart(2, "0")}`,
               answer: answers[rotation],
               confidence: anchorScore(grid) + 10 - cornerNoiseScore(grid)
          };
     }

     return null;
}

/* ---------------------------------------------- 
     Read Grid From Candidate 
----------------------------------------------  */
function readGridFromCandidate(imageData, width, height, box) {
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
function findQCardCandidates(imageData, width, height) {
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
function detectQCardsFromCanvas(canvas) {
     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
     const candidates = findQCardCandidates(imageData, canvas.width, canvas.height);
     const detections = [];
     const used = {};

     candidates.forEach(function(box) {
          const grid = readGridFromCandidate(imageData, canvas.width, canvas.height, box);
          const decoded = decodeQCardGrid(grid);
          if (!decoded || used[decoded.cardId]) { return; }
          used[decoded.cardId] = true;
          detections.push(decoded);
     });

     return detections;
}

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
          if (btnStartCamera) { btnStartCamera.textContent = "Scanning 6×6"; }
          setStatus("Scanning continuously. Show one or more reusable 6×6 Q-cards and rotate each card so the chosen answer is above the code.", false);
          startLoop();
     }
     catch (error) {
          if (btnStartCamera) { btnStartCamera.disabled = false; btnStartCamera.textContent = "Start Camera"; }
          setStatus(`Camera could not start: ${error.message || "permission blocked"}. Use manual backup.`, true);
     }
}

/* ---------------------------------------------- 
     Scan Current Frame 
----------------------------------------------  */
async function scanCurrentFrame() {
     if (!elVideo || !elCanvas || elVideo.readyState < 2) { return; }

     const ctx = elCanvas.getContext("2d", { willReadFrequently: true });
     const sourceW = elVideo.videoWidth || 1280;
     const sourceH = elVideo.videoHeight || 720;
     const maxW = 960;
     elCanvas.width = Math.min(maxW, sourceW);
     elCanvas.height = Math.round(sourceH * (elCanvas.width / sourceW));
     ctx.drawImage(elVideo, 0, 0, elCanvas.width, elCanvas.height);

     const customDetections = detectQCardsFromCanvas(elCanvas);
     if (customDetections.length) {
          await handleDetectedCodes(customDetections, "phone-camera-6x6");
          return;
     }

     if (barcodeDetector) {
          const barcodes = await barcodeDetector.detect(elVideo);
          if (barcodes && barcodes.length) {
               await handleDetectedCodes(barcodes.map(function(code) {
                    return { data: code.rawValue, location: locationFromBarcode(code) };
               }), "phone-camera-qr-fallback");
               return;
          }
     }

     if (!window.jsQR) { return; }
     const imageData = ctx.getImageData(0, 0, elCanvas.width, elCanvas.height);
     const result = jsQR(imageData.data, elCanvas.width, elCanvas.height, { inversionAttempts: "attemptBoth" });
     if (result && result.data) {
          await handleDetectedCodes([{ data: result.data, location: result.location }], "phone-camera-qr-fallback");
     }
}

/* ---------------------------------------------- 
     Handle Detected Codes 
----------------------------------------------  */
async function handleDetectedCodes(codes, source) {
     const accepted = [];
     for (const code of codes) {
          const payload = code.cardId ? code : decodePayload(code.data, code.location);
          if (!payload) { continue; }
          if (payload.sessionId && payload.sessionId != sessionId) { continue; }
          const cardId = normalizeCardId(payload.cardId);
          if (!scanShouldSubmit(cardId, payload.answer)) { continue; }
          await submitScan(cardId, payload.answer, source || "phone-camera");
          accepted.push(`${cardId}: ${payload.answer}`);
     }
     if (accepted.length) {
          setStatus(`Scanned ${accepted.length}: ${accepted.join(" | ")}`, false);
     }
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
