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
     V51 Reinforced Gray Print 6x6 Q-Card Scanner
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
     Scanner Luminance
----------------------------------------------  */
function scannerLuminance(data, index) {
     return (data[index] * 0.299) + (data[index + 1] * 0.587) + (data[index + 2] * 0.114);
}

/* ---------------------------------------------- 
     Scanner Histogram Percentile
----------------------------------------------  */
function scannerHistogramPercentile(histogram, total, percentile) {
     const target = Math.max(0, Math.min(total - 1, Math.floor(total * percentile)));
     let sum = 0;
     for (let i = 0; i < histogram.length; i += 1) {
          sum += histogram[i];
          if (sum >= target) { return i; }
     }
     return 128;
}

/* ---------------------------------------------- 
     Scanner Adaptive Dark Threshold
----------------------------------------------  */
function scannerAdaptiveDarkThreshold(imageData) {
     const data = imageData.data;
     const histogram = new Uint32Array(256);
     let total = 0;

     for (let i = 0; i < data.length; i += 16) {
          const lum = Math.max(0, Math.min(255, Math.round(scannerLuminance(data, i))));
          histogram[lum] += 1;
          total += 1;
     }

     const p08 = scannerHistogramPercentile(histogram, total, 0.08);
     const p58 = scannerHistogramPercentile(histogram, total, 0.58);
     const p82 = scannerHistogramPercentile(histogram, total, 0.82);
     const spread = Math.max(20, p82 - p08);
     const threshold = Math.round(p08 + spread * 0.43);

     return Math.max(105, Math.min(188, Math.max(threshold, Math.round((p08 + p58) / 2))));
}

/* ---------------------------------------------- 
     Scanner Q-Card Data Positions
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
     Scanner Sample Average Luminance
----------------------------------------------  */
function scannerSampleAverageLuminance(imageData, width, height, cx, cy, radius) {
     const data = imageData.data;
     let total = 0;
     let samples = 0;

     for (let yy = -radius; yy <= radius; yy += 1) {
          for (let xx = -radius; xx <= radius; xx += 1) {
               const sx = Math.max(0, Math.min(width - 1, Math.round(cx + xx)));
               const sy = Math.max(0, Math.min(height - 1, Math.round(cy + yy)));
               const index = (sy * width + sx) * 4;
               total += scannerLuminance(data, index);
               samples += 1;
          }
     }

     return samples ? total / samples : 0;
}

/* ---------------------------------------------- 
     Scanner Average Numbers
----------------------------------------------  */
function scannerAverageNumbers(values) {
     if (!values.length) { return 0; }
     return values.reduce(function(total, value) { return total + value; }, 0) / values.length;
}

/* ---------------------------------------------- 
     Read Grid From Candidate
----------------------------------------------  */
function readGridFromCandidate(imageData, width, height, box) {
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
               const value = scannerSampleAverageLuminance(imageData, width, height, cx, cy, sampleRadius);
               values.push(value);
               line.push(value);
          }
          grid.push(line);
     }

     const sorted = values.slice().sort(function(a, b) { return a - b; });
     const lowAvg = scannerAverageNumbers(sorted.slice(0, 12));
     const highAvg = scannerAverageNumbers(sorted.slice(-12));
     const contrast = highAvg - lowAvg;
     const threshold = contrast >= 22 ? (lowAvg + highAvg) / 2 : Math.max(132, lowAvg + 18);

     return grid.map(function(row) {
          return row.map(function(value) { return value > threshold; });
     });
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
     const darkThreshold = scannerAdaptiveDarkThreshold(imageData);

     for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
          const lum = scannerLuminance(data, i);
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
function detectQCardsFromCanvas(canvas) {
     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
     const candidates = findQCardCandidates(imageData, canvas.width, canvas.height);
     const detections = [];
     const bestByCard = {};

     candidates.forEach(function(box) {
          const grid = readGridFromCandidate(imageData, canvas.width, canvas.height, box);
          const decoded = decodeQCardGrid(grid);
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
function scanShouldSubmit(cardId, answer) {
     const key = `${cardId}-${answer}`;
     const previous = scanMemory[key];
     const now = Date.now();
     if (previous && now - previous.time < 1200) { return false; }
     scanMemory[key] = { answer: answer, time: now };
     return true;
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
          scannerStream = await navigator.mediaDevices.getUserMedia({
               video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
               },
               audio: false
          });
          elVideo.srcObject = scannerStream;
          elVideo.setAttribute("playsinline", "");
          elVideo.setAttribute("webkit-playsinline", "");
          await elVideo.play();
          if (btnStartCamera) { btnStartCamera.textContent = "Scanning 6×6"; }
          setStatus("Fast scanning is active. Gray printed cards are supported. Rotate each card so the chosen answer is above the code.", false);
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
     const maxW = 1280;
     elCanvas.width = Math.min(maxW, sourceW);
     elCanvas.height = Math.round(sourceH * (elCanvas.width / sourceW));
     ctx.imageSmoothingEnabled = false;
     ctx.drawImage(elVideo, 0, 0, elCanvas.width, elCanvas.height);

     const detections = detectQCardsFromCanvas(elCanvas);
     if (detections.length) {
          handleDetectedCodes(detections, "phone-camera-6x6-fast");
     }
}

/* ---------------------------------------------- 
     Handle Detected Codes
----------------------------------------------  */
function handleDetectedCodes(codes, source) {
     const accepted = [];
     for (const code of codes) {
          const payload = code.cardId ? code : decodePayload(code.data, code.location);
          if (!payload) { continue; }
          if (payload.sessionId && payload.sessionId != sessionId) { continue; }
          const cardId = normalizeCardId(payload.cardId);
          if (!scanShouldSubmit(cardId, payload.answer)) { continue; }
          submitScan(cardId, payload.answer, source || "phone-camera").catch(function(error) { console.warn(error); });
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

/* ---------------------------------------------- 
     V52 Faster 6x6 Scan + Stable Orientation + Overlay Labels
----------------------------------------------  */

var scannerWorkCanvas = document.createElement("canvas");
var scannerLastOverlay = [];
var scannerSessionCache = null;
var scannerSessionLoadedAt = 0;
var scanConfirmMemory = {};

/* ---------------------------------------------- 
     Setup Scanner Overlay
----------------------------------------------  */
function setupScannerOverlay() {
     if (!elVideo || !elCanvas) { return; }
     const parent = elVideo.parentElement;
     if (parent) { parent.style.position = "relative"; }
     elCanvas.hidden = false;
     elCanvas.removeAttribute("hidden");
     elCanvas.id = "scannerOverlay";
     elCanvas.style.position = "absolute";
     elCanvas.style.pointerEvents = "none";
     elCanvas.style.zIndex = "5";
     elCanvas.style.borderRadius = "18px";
}

/* ---------------------------------------------- 
     Sync Scanner Overlay Size
----------------------------------------------  */
function syncScannerOverlaySize(workWidth, workHeight) {
     if (!elVideo || !elCanvas) { return; }
     const parent = elVideo.parentElement;
     if (!parent) { return; }
     elCanvas.width = workWidth || 960;
     elCanvas.height = workHeight || 540;
     elCanvas.style.left = `${elVideo.offsetLeft}px`;
     elCanvas.style.top = `${elVideo.offsetTop}px`;
     elCanvas.style.width = `${elVideo.offsetWidth}px`;
     elCanvas.style.height = `${elVideo.offsetHeight}px`;
}

/* ---------------------------------------------- 
     Refresh Scanner Session Cache
----------------------------------------------  */
async function refreshScannerSessionCache(force) {
     const now = Date.now();
     if (!force && scannerSessionCache && now - scannerSessionLoadedAt < 900) { return scannerSessionCache; }
     if (!apiBase || !sessionId) { return scannerSessionCache; }
     try {
          const response = await fetch(`${apiBase}/quizSession?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
          if (!response.ok) { return scannerSessionCache; }
          const data = await response.json();
          scannerSessionCache = data.item || data || scannerSessionCache;
          scannerSessionLoadedAt = now;
     }
     catch (error) {}
     return scannerSessionCache;
}

/* ---------------------------------------------- 
     Get Scanner Card Name
----------------------------------------------  */
function getScannerCardName(cardId) {
     const normalized = normalizeCardId(cardId);
     const cards = scannerSessionCache && scannerSessionCache.cards ? scannerSessionCache.cards : [];
     const card = cards.find(function(item) { return normalizeCardId(item.cardId) == normalized; });
     return card && card.name ? card.name : normalized;
}

/* ---------------------------------------------- 
     Q-Card Orientation Score
----------------------------------------------  */
function qCardOrientationScore(grid) {
     let score = 0;
     if (grid[0][0]) { score += 3; }
     if (grid[0][1]) { score += 3; }
     if (grid[1][0]) { score += 3; }
     if (!grid[1][1]) { score += 3; }

     const quietCorners = [
          [0,4],[0,5],[1,4],[1,5],
          [4,0],[4,1],[5,0],[5,1],
          [4,4],[4,5],[5,4],[5,5]
     ];
     quietCorners.forEach(function(item) {
          score += grid[item[0]][item[1]] ? -2 : 1;
     });
     return score;
}

/* ---------------------------------------------- 
     Decode 6x6 Q-Card Grid
----------------------------------------------  */
function decodeQCardGrid(rawGrid) {
     const answersByRotation = ["A", "B", "C", "D"];
     let best = null;

     for (let rotation = 0; rotation < 4; rotation += 1) {
          const grid = rotateGrid(rawGrid, rotation);
          const anchor = anchorScore(grid);
          const cornerNoise = cornerNoiseScore(grid);
          if (anchor < 3) { continue; }
          if (cornerNoise > 3) { continue; }

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

          const orientationConfidence = qCardOrientationScore(grid);
          const confidence = orientationConfidence + (anchor * 3) + Math.max(0, 12 - cornerNoise);
          const decoded = {
               cardId: `P${String(value + 1).padStart(2, "0")}`,
               answer: answersByRotation[rotation],
               confidence: confidence,
               rotation: rotation
          };

          if (!best || decoded.confidence > best.confidence) { best = decoded; }
     }

     return best;
}

/* ---------------------------------------------- 
     Scan Confirmed Fast
----------------------------------------------  */
function scanConfirmedFast(cardId, answer, confidence) {
     const key = normalizeCardId(cardId);
     const now = Date.now();
     const previous = scanConfirmMemory[key];
     scanConfirmMemory[key] = { answer: answer, confidence: confidence || 0, time: now };

     if ((confidence || 0) >= 30) { return true; }
     if (previous && previous.answer == answer && now - previous.time < 420) { return true; }
     return false;
}

/* ---------------------------------------------- 
     Draw Scanner Overlay
----------------------------------------------  */
function drawScannerOverlay(detections) {
     if (!elCanvas) { return; }
     const ctx = elCanvas.getContext("2d");
     ctx.clearRect(0, 0, elCanvas.width, elCanvas.height);
     if (!detections || !detections.length) { return; }

     detections.forEach(function(item) {
          if (!item.box) { return; }
          const box = item.box;
          const name = getScannerCardName(item.cardId);
          const label = `${name} • ${item.answer}`;
          const x = Math.max(0, box.x);
          const y = Math.max(0, box.y);
          const w = Math.max(1, box.w);
          const h = Math.max(1, box.h);
          const fontSize = Math.max(24, Math.min(46, Math.round(w * 0.12)));

          ctx.save();
          ctx.lineWidth = Math.max(6, Math.round(w * 0.025));
          ctx.strokeStyle = "#ffe04a";
          ctx.shadowColor = "rgba(0,0,0,.45)";
          ctx.shadowBlur = 10;
          ctx.strokeRect(x, y, w, h);
          ctx.shadowBlur = 0;
          ctx.font = `900 ${fontSize}px Arial, sans-serif`;
          const metrics = ctx.measureText(label);
          const padX = Math.round(fontSize * 0.45);
          const padY = Math.round(fontSize * 0.28);
          const badgeW = Math.min(elCanvas.width - 8, metrics.width + padX * 2);
          const badgeH = fontSize + padY * 2;
          const badgeX = Math.max(4, Math.min(elCanvas.width - badgeW - 4, x + w / 2 - badgeW / 2));
          const badgeY = Math.max(4, y - badgeH - 8);

          ctx.fillStyle = "rgba(18,56,101,.94)";
          ctx.beginPath();
          if (ctx.roundRect) { ctx.roundRect(badgeX, badgeY, badgeW, badgeH, Math.round(badgeH * 0.34)); }
          else { ctx.rect(badgeX, badgeY, badgeW, badgeH); }
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.textBaseline = "middle";
          ctx.fillText(label, badgeX + padX, badgeY + badgeH / 2);
          ctx.restore();
     });
}

/* ---------------------------------------------- 
     Start Loop
----------------------------------------------  */
function startLoop() {
     cancelAnimationFrame(scannerFrame);
     scannerBusy = false;
     setupScannerOverlay();
     refreshScannerSessionCache(true);

     const scanFrame = function() {
          if (!scannerStream) { return; }
          if (!scannerBusy) {
               scannerBusy = true;
               Promise.resolve(scanCurrentFrame())
                    .catch(function(error) { console.warn(error); })
                    .finally(function() {
                         scannerBusy = false;
                         scannerFrame = requestAnimationFrame(scanFrame);
                    });
               return;
          }
          scannerFrame = requestAnimationFrame(scanFrame);
     };

     scannerFrame = requestAnimationFrame(scanFrame);
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
          await refreshScannerSessionCache(true);
          scannerStream = await navigator.mediaDevices.getUserMedia({
               video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 60, min: 24 }
               },
               audio: false
          });
          elVideo.srcObject = scannerStream;
          elVideo.setAttribute("playsinline", "");
          elVideo.setAttribute("webkit-playsinline", "");
          await elVideo.play();
          if (btnStartCamera) { btnStartCamera.textContent = "Scanning 6×6"; }
          setStatus("Fast scanning is active. Hold cards steady for a moment; names and options appear over each detected code.", false);
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
     if (!elVideo || elVideo.readyState < 2) { return; }

     const work = scannerWorkCanvas;
     const ctx = work.getContext("2d", { willReadFrequently: true });
     const sourceW = elVideo.videoWidth || 1280;
     const sourceH = elVideo.videoHeight || 720;
     const maxW = 980;
     work.width = Math.min(maxW, sourceW);
     work.height = Math.round(sourceH * (work.width / sourceW));
     ctx.imageSmoothingEnabled = false;
     ctx.drawImage(elVideo, 0, 0, work.width, work.height);
     syncScannerOverlaySize(work.width, work.height);

     if (!scannerSessionCache || Date.now() - scannerSessionLoadedAt > 900) {
          refreshScannerSessionCache(false);
     }

     const detections = detectQCardsFromCanvas(work);
     drawScannerOverlay(detections);
     if (detections.length) {
          handleDetectedCodes(detections, "phone-camera-6x6-fast");
     }
}

/* ---------------------------------------------- 
     Get Current Question Index
----------------------------------------------  */
async function getCurrentQuestionIndex() {
     const cached = await refreshScannerSessionCache(false);
     return Number(cached && cached.currentQuestionIndex || cached && cached.item && cached.item.currentQuestionIndex || 0);
}

/* ---------------------------------------------- 
     Handle Detected Codes
----------------------------------------------  */
function handleDetectedCodes(codes, source) {
     const accepted = [];
     for (const code of codes) {
          const payload = code.cardId ? code : decodePayload(code.data, code.location);
          if (!payload) { continue; }
          if (payload.sessionId && payload.sessionId != sessionId) { continue; }
          const cardId = normalizeCardId(payload.cardId);
          if (!scanConfirmedFast(cardId, payload.answer, payload.confidence)) { continue; }
          if (!scanShouldSubmit(cardId, payload.answer)) { continue; }
          submitScan(cardId, payload.answer, source || "phone-camera").catch(function(error) { console.warn(error); });
          accepted.push(`${getScannerCardName(cardId)}: ${payload.answer}`);
     }
     if (accepted.length) {
          setStatus(`Scanned ${accepted.length}: ${accepted.join(" | ")}`, false);
     }
}

/* ---------------------------------------------- 
     V53 Controlled Answer Scanner + Feedback States
----------------------------------------------  */

var scannerResponsesCache = {};
var scannerResponsesLoadedAt = 0;
var scannerPendingAck = {};
var scannerTapDetections = [];
var scannerDataTimer = null;
var scannerAutoSubmitMemory = {};
var scannerTapReady = false;

/* ---------------------------------------------- 
     Current Scanner Question Index
----------------------------------------------  */
function scannerCurrentQuestionIndex() {
     const source = scannerSessionCache || {};
     return Number(source.currentQuestionIndex || source.item && source.item.currentQuestionIndex || 0);
}

/* ---------------------------------------------- 
     Response Key
----------------------------------------------  */
function scannerResponseKey(questionIndex, cardId) {
     return `${Number(questionIndex) || 0}-${normalizeCardId(cardId)}`;
}

/* ---------------------------------------------- 
     Refresh Scanner Responses
----------------------------------------------  */
async function refreshScannerResponses(force) {
     const now = Date.now();
     if (!force && now - scannerResponsesLoadedAt < 320) { return scannerResponsesCache; }
     if (!apiBase || !sessionId) { return scannerResponsesCache; }

     const questionIndex = scannerCurrentQuestionIndex();
     try {
          const response = await fetch(`${apiBase}/quizResponses?sessionId=${encodeURIComponent(sessionId)}&questionIndex=${encodeURIComponent(questionIndex)}`, { cache: "no-store" });
          if (!response.ok) { return scannerResponsesCache; }
          const data = await response.json();
          const mapped = {};
          (data.items || []).forEach(function(item) {
               mapped[normalizeCardId(item.cardId)] = item;
          });
          scannerResponsesCache = mapped;
          scannerResponsesLoadedAt = now;

          Object.keys(scannerPendingAck).forEach(function(key) {
               const pending = scannerPendingAck[key];
               const parts = key.split("-");
               const pendingQuestion = Number(parts[0]) || 0;
               const pendingCard = parts.slice(1).join("-");
               const recorded = scannerResponsesCache[pendingCard];
               if (pendingQuestion == questionIndex && recorded && recorded.answer == pending.answer && Date.now() > pending.keepYellowUntil) {
                    delete scannerPendingAck[key];
               }
          });

          renderPendingStudents();
     }
     catch (error) {}
     return scannerResponsesCache;
}

/* ---------------------------------------------- 
     Start Scanner Data Polling
----------------------------------------------  */
function startScannerDataPolling() {
     clearInterval(scannerDataTimer);
     Promise.resolve(refreshScannerSessionCache(true)).then(function() { return refreshScannerResponses(true); });
     scannerDataTimer = setInterval(function() {
          refreshScannerSessionCache(false).then(function() { return refreshScannerResponses(false); });
     }, 360);
}

/* ---------------------------------------------- 
     Get Scanner Cards
----------------------------------------------  */
function getScannerCards() {
     const cards = scannerSessionCache && scannerSessionCache.cards ? scannerSessionCache.cards : [];
     return cards.map(function(card, index) {
          return {
               cardId: normalizeCardId(card.cardId || `P${index + 1}`),
               name: card.name || normalizeCardId(card.cardId || `P${index + 1}`)
          };
     });
}

/* ---------------------------------------------- 
     Render Pending Students
----------------------------------------------  */
function renderPendingStudents() {
     const count = document.getElementById("pendingCount");
     const list = document.getElementById("pendingStudentList");
     if (!count || !list) { return; }

     const cards = getScannerCards();
     const answered = Object.keys(scannerResponsesCache || {}).length;
     const missing = cards.filter(function(card) { return !scannerResponsesCache[card.cardId]; });

     count.textContent = `${missing.length} left`;
     if (!cards.length) {
          list.textContent = "Waiting for session roster...";
          return;
     }
     if (!missing.length) {
          list.innerHTML = `<span class="pending-chip done">All students scanned for this question ✅</span>`;
          return;
     }

     list.innerHTML = missing.map(function(card) {
          return `<span class="pending-chip missing">${escapeHtml(card.name)}</span>`;
     }).join("");
}

/* ---------------------------------------------- 
     Setup Scanner Overlay
----------------------------------------------  */
function setupScannerOverlay() {
     if (!elVideo || !elCanvas) { return; }
     const parent = elVideo.parentElement;
     if (parent) { parent.style.position = "relative"; }
     elCanvas.hidden = false;
     elCanvas.removeAttribute("hidden");
     elCanvas.id = "scannerOverlay";
     elCanvas.style.position = "absolute";
     elCanvas.style.pointerEvents = "auto";
     elCanvas.style.zIndex = "5";
     elCanvas.style.borderRadius = "18px";
     setupScannerTapToUpdate();
}

/* ---------------------------------------------- 
     Setup Scanner Tap To Update
----------------------------------------------  */
function setupScannerTapToUpdate() {
     if (!elCanvas || scannerTapReady) { return; }
     scannerTapReady = true;

     const handleTap = function(event) {
          if (!scannerTapDetections.length) { return; }
          const rect = elCanvas.getBoundingClientRect();
          const point = event.touches && event.touches[0] ? event.touches[0] : event;
          const x = (point.clientX - rect.left) * (elCanvas.width / Math.max(1, rect.width));
          const y = (point.clientY - rect.top) * (elCanvas.height / Math.max(1, rect.height));
          const hit = scannerTapDetections.slice().reverse().find(function(item) {
               const box = item.box;
               return box && x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
          });
          if (!hit) { return; }
          event.preventDefault();
          const cardId = normalizeCardId(hit.cardId);
          const name = getScannerCardName(cardId);
          submitScan(cardId, hit.answer, "phone-camera-tap-update", true).then(function(result) {
               if (result && result.status == "existing-same") {
                    setStatus(`${name} is already recorded as ${hit.answer}.`, false);
               }
               else {
                    setStatus(`Updating ${name} to ${hit.answer}. Waiting for game confirmation...`, false);
               }
          });
     };

     elCanvas.addEventListener("click", handleTap);
     elCanvas.addEventListener("touchend", handleTap, { passive: false });
}

/* ---------------------------------------------- 
     Detection State
----------------------------------------------  */
function scannerDetectionState(cardId, answer) {
     const questionIndex = scannerCurrentQuestionIndex();
     const normalized = normalizeCardId(cardId);
     const key = scannerResponseKey(questionIndex, normalized);
     const pending = scannerPendingAck[key];
     const recorded = scannerResponsesCache[normalized];

     if (pending) {
          return { state: "new", label: "NEW!", answer: pending.answer || answer, color: "#ffe04a", fill: "rgba(255, 224, 74, .96)", text: "#123865" };
     }
     if (recorded) {
          return { state: "ok", label: "OK", answer: recorded.answer || answer, color: "#45d66b", fill: "rgba(69, 214, 107, .96)", text: "#123865" };
     }
     return { state: "ready", label: "READY", answer: answer, color: "#62c8ff", fill: "rgba(18, 56, 101, .94)", text: "#ffffff" };
}

/* ---------------------------------------------- 
     Draw Scanner Overlay
----------------------------------------------  */
function drawScannerOverlay(detections) {
     if (!elCanvas) { return; }
     const ctx = elCanvas.getContext("2d");
     ctx.clearRect(0, 0, elCanvas.width, elCanvas.height);
     scannerTapDetections = detections || [];
     if (!detections || !detections.length) { return; }

     detections.forEach(function(item) {
          if (!item.box) { return; }
          const box = item.box;
          const cardId = normalizeCardId(item.cardId);
          const name = getScannerCardName(cardId);
          const state = scannerDetectionState(cardId, item.answer);
          const label = `${name} • ${state.answer} • ${state.label}`;
          const x = Math.max(0, box.x);
          const y = Math.max(0, box.y);
          const w = Math.max(1, box.w);
          const h = Math.max(1, box.h);
          const fontSize = Math.max(22, Math.min(44, Math.round(w * 0.115)));

          ctx.save();
          ctx.lineWidth = Math.max(8, Math.round(w * 0.032));
          ctx.strokeStyle = state.color;
          ctx.shadowColor = "rgba(0,0,0,.55)";
          ctx.shadowBlur = 12;
          ctx.strokeRect(x, y, w, h);
          ctx.shadowBlur = 0;

          ctx.font = `900 ${fontSize}px Arial, sans-serif`;
          const metrics = ctx.measureText(label);
          const padX = Math.round(fontSize * 0.48);
          const padY = Math.round(fontSize * 0.30);
          const badgeW = Math.min(elCanvas.width - 8, metrics.width + padX * 2);
          const badgeH = fontSize + padY * 2;
          const badgeX = Math.max(4, Math.min(elCanvas.width - badgeW - 4, x + w / 2 - badgeW / 2));
          const badgeY = Math.max(4, y - badgeH - 8);

          ctx.fillStyle = state.fill;
          ctx.beginPath();
          if (ctx.roundRect) { ctx.roundRect(badgeX, badgeY, badgeW, badgeH, Math.round(badgeH * 0.34)); }
          else { ctx.rect(badgeX, badgeY, badgeW, badgeH); }
          ctx.fill();
          ctx.fillStyle = state.text;
          ctx.textBaseline = "middle";
          ctx.fillText(label, badgeX + padX, badgeY + badgeH / 2);
          ctx.restore();
     });
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
          await refreshScannerSessionCache(true);
          await refreshScannerResponses(true);
          startScannerDataPolling();
          scannerStream = await navigator.mediaDevices.getUserMedia({
               video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 60, min: 24 }
               },
               audio: false
          });
          elVideo.srcObject = scannerStream;
          elVideo.setAttribute("playsinline", "");
          elVideo.setAttribute("webkit-playsinline", "");
          await elVideo.play();
          if (btnStartCamera) { btnStartCamera.textContent = "Scanning 6×6"; }
          setStatus("Scanning active. Yellow NEW! means recorded locally; green OK means the answer is already registered for this question. Tap a detected card to update it.", false);
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
     if (!elVideo || elVideo.readyState < 2) { return; }

     const work = scannerWorkCanvas;
     const ctx = work.getContext("2d", { willReadFrequently: true });
     const sourceW = elVideo.videoWidth || 1280;
     const sourceH = elVideo.videoHeight || 720;
     const maxW = 860;
     work.width = Math.min(maxW, sourceW);
     work.height = Math.round(sourceH * (work.width / sourceW));
     ctx.imageSmoothingEnabled = false;
     ctx.drawImage(elVideo, 0, 0, work.width, work.height);
     syncScannerOverlaySize(work.width, work.height);

     const detections = detectQCardsFromCanvas(work);
     drawScannerOverlay(detections);
     if (detections.length) {
          handleDetectedCodes(detections, "phone-camera-6x6-controlled");
     }
}

/* ---------------------------------------------- 
     Scan Confirmed Fast
----------------------------------------------  */
function scanConfirmedFast(cardId, answer, confidence) {
     const key = normalizeCardId(cardId);
     const now = Date.now();
     const previous = scanConfirmMemory[key];
     scanConfirmMemory[key] = { answer: answer, confidence: confidence || 0, time: now };

     if ((confidence || 0) >= 38) { return true; }
     if (previous && previous.answer == answer && now - previous.time < 300) { return true; }
     return false;
}

/* ---------------------------------------------- 
     Handle Detected Codes
----------------------------------------------  */
function handleDetectedCodes(codes, source) {
     const accepted = [];
     const questionIndex = scannerCurrentQuestionIndex();

     for (const code of codes) {
          const payload = code.cardId ? code : decodePayload(code.data, code.location);
          if (!payload) { continue; }
          if (payload.sessionId && payload.sessionId != sessionId) { continue; }
          const cardId = normalizeCardId(payload.cardId);
          const responseKey = scannerResponseKey(questionIndex, cardId);
          if (scannerResponsesCache[cardId] || scannerPendingAck[responseKey]) { continue; }
          if (!scanConfirmedFast(cardId, payload.answer, payload.confidence)) { continue; }
          if (!scanShouldSubmit(cardId, payload.answer)) { continue; }
          submitScan(cardId, payload.answer, source || "phone-camera").catch(function(error) { console.warn(error); });
          accepted.push(`${getScannerCardName(cardId)}: ${payload.answer}`);
     }

     if (accepted.length) {
          setStatus(`NEW! ${accepted.join(" | ")} · waiting for game confirmation`, false);
     }
}

/* ---------------------------------------------- 
     Scan Should Submit
----------------------------------------------  */
function scanShouldSubmit(cardId, answer) {
     const key = `${scannerCurrentQuestionIndex()}-${normalizeCardId(cardId)}`;
     const previous = scannerAutoSubmitMemory[key];
     const now = Date.now();
     if (previous && previous.answer == answer && now - previous.time < 1400) { return false; }
     scannerAutoSubmitMemory[key] = { answer: answer, time: now };
     return true;
}

/* ---------------------------------------------- 
     Get Current Question Index
----------------------------------------------  */
async function getCurrentQuestionIndex() {
     return scannerCurrentQuestionIndex();
}

/* ---------------------------------------------- 
     Submit Scan
----------------------------------------------  */
async function submitScan(cardId, answer, source, forceUpdate) {
     if (!sessionId) { setStatus("Missing session ID.", true); return { status: "missing-session" }; }
     await refreshScannerSessionCache(false);
     await refreshScannerResponses(false);

     const questionIndex = scannerCurrentQuestionIndex();
     const normalized = normalizeCardId(cardId);
     const name = getScannerCardName(normalized);
     const existing = scannerResponsesCache[normalized];
     const key = scannerResponseKey(questionIndex, normalized);

     if (existing && !forceUpdate) {
          addLog(normalized, existing.answer || answer, "ok", "OK");
          setStatus(`${name} already has ${existing.answer || answer}. Tap the card preview to update.`, false);
          return { status: "existing" };
     }
     if (existing && forceUpdate && existing.answer == answer) {
          addLog(normalized, answer, "ok", "OK");
          return { status: "existing-same" };
     }

     const scan = { sessionId, questionIndex, cardId: normalized, answer, source, timestamp: new Date().toISOString() };
     scannerPendingAck[key] = { answer: answer, time: Date.now(), keepYellowUntil: Date.now() + 700 };
     renderPendingStudents();
     addLog(normalized, answer, "new", "NEW!");

     try {
          await fetch(`${apiBase}/quizScan`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(scan)
          });
          setTimeout(function() { refreshScannerResponses(true); }, 220);
          return { status: "new" };
     }
     catch (error) {
          const localKey = `${localPrefix}${sessionId}-phone-scans`;
          const existingLocal = JSON.parse(localStorage.getItem(localKey) || "[]");
          existingLocal.push(scan);
          localStorage.setItem(localKey, JSON.stringify(existingLocal));
          setStatus(`Saved locally because Wix did not respond: ${error.message}`, true);
          return { status: "local" };
     }
}

/* ---------------------------------------------- 
     Add Log
----------------------------------------------  */
function addLog(cardId, answer, mode, badge) {
     if (!elLog) { return; }
     const row = document.createElement("div");
     row.className = `log-row ${mode || ""}`;
     row.innerHTML = `<span>${escapeHtml(getScannerCardName(cardId))}</span><span>${escapeHtml(badge || answer)}</span>`;
     elLog.prepend(row);
}

/* ---------------------------------------------- 
     Initial Session Roster Load
----------------------------------------------  */
refreshScannerSessionCache(true).then(function() { return refreshScannerResponses(true); });

/* ---------------------------------------------- 
     V54 Scanner Overlay Ghost Time
----------------------------------------------  */
var scannerOverlayGhosts = scannerOverlayGhosts || {};
const SCANNER_OVERLAY_GHOST_MS = 3000;

/* ---------------------------------------------- 
     Remember Scanner Overlay Detections
----------------------------------------------  */
function rememberScannerOverlayDetections(detections) {
     const now = Date.now();
     (detections || []).forEach(function(item) {
          if (!item || !item.box || !item.cardId) { return; }
          const cardId = normalizeCardId(item.cardId);
          scannerOverlayGhosts[cardId] = {
               cardId: cardId,
               answer: item.answer,
               box: {
                    x: item.box.x,
                    y: item.box.y,
                    w: item.box.w,
                    h: item.box.h
               },
               confidence: item.confidence || 0,
               lastSeen: now,
               expiresAt: now + SCANNER_OVERLAY_GHOST_MS
          };
     });
}

/* ---------------------------------------------- 
     Get Scanner Overlay Ghosts
----------------------------------------------  */
function getScannerOverlayGhosts() {
     const now = Date.now();
     return Object.keys(scannerOverlayGhosts).map(function(key) {
          const item = scannerOverlayGhosts[key];
          if (!item || item.expiresAt < now) {
               delete scannerOverlayGhosts[key];
               return null;
          }
          item.ghostAge = now - item.lastSeen;
          item.isGhost = item.ghostAge > 80;
          return item;
     }).filter(Boolean);
}

/* ---------------------------------------------- 
     Draw Rounded Scanner Badge
----------------------------------------------  */
function drawRoundedScannerBadge(ctx, x, y, w, h, radius) {
     ctx.beginPath();
     if (ctx.roundRect) { ctx.roundRect(x, y, w, h, radius); }
     else { ctx.rect(x, y, w, h); }
     ctx.fill();
}

/* ---------------------------------------------- 
     Draw Scanner Overlay
----------------------------------------------  */
function drawScannerOverlay(detections) {
     if (!elCanvas) { return; }
     rememberScannerOverlayDetections(detections);

     const ctx = elCanvas.getContext("2d");
     ctx.clearRect(0, 0, elCanvas.width, elCanvas.height);

     const visibleItems = getScannerOverlayGhosts();
     scannerTapDetections = visibleItems;
     if (!visibleItems.length) { return; }

     visibleItems.forEach(function(item) {
          if (!item.box) { return; }
          const box = item.box;
          const cardId = normalizeCardId(item.cardId);
          const name = getScannerCardName(cardId);
          const state = scannerDetectionState(cardId, item.answer);
          const label = `${name} • ${state.answer} • ${state.label}`;
          const x = Math.max(0, box.x);
          const y = Math.max(0, box.y);
          const w = Math.max(1, box.w);
          const h = Math.max(1, box.h);
          const fontSize = Math.max(22, Math.min(44, Math.round(w * 0.115)));
          const ghostFade = item.isGhost ? Math.max(.48, 1 - (item.ghostAge / SCANNER_OVERLAY_GHOST_MS) * .52) : 1;

          ctx.save();
          ctx.globalAlpha = ghostFade;
          ctx.lineWidth = Math.max(8, Math.round(w * 0.032));
          ctx.strokeStyle = state.color;
          ctx.shadowColor = "rgba(0,0,0,.55)";
          ctx.shadowBlur = item.isGhost ? 8 : 12;
          ctx.strokeRect(x, y, w, h);
          ctx.shadowBlur = 0;

          ctx.font = `900 ${fontSize}px Arial, sans-serif`;
          const metrics = ctx.measureText(label);
          const padX = Math.round(fontSize * 0.48);
          const padY = Math.round(fontSize * 0.30);
          const badgeW = Math.min(elCanvas.width - 8, metrics.width + padX * 2);
          const badgeH = fontSize + padY * 2;
          const badgeX = Math.max(4, Math.min(elCanvas.width - badgeW - 4, x + w / 2 - badgeW / 2));
          const badgeY = Math.max(4, y - badgeH - 8);

          ctx.fillStyle = state.fill;
          drawRoundedScannerBadge(ctx, badgeX, badgeY, badgeW, badgeH, Math.round(badgeH * 0.34));
          ctx.fillStyle = state.text;
          ctx.textBaseline = "middle";
          ctx.fillText(label, badgeX + padX, badgeY + badgeH / 2);

          if (item.isGhost) {
               ctx.globalAlpha = Math.min(.92, ghostFade + .1);
               ctx.font = `900 ${Math.max(14, Math.round(fontSize * .46))}px Arial, sans-serif`;
               ctx.fillStyle = "rgba(255,255,255,.92)";
               ctx.textBaseline = "top";
               ctx.fillText("last seen", badgeX + padX, badgeY + badgeH + 4);
          }

          ctx.restore();
     });
}

/* ---------------------------------------------- 
     V55 Less Sensitive Q-Card Scanner Guard Rails
----------------------------------------------  */

var scannerStrictSeenMemory = scannerStrictSeenMemory || {};
const SCANNER_STRICT_CONFIRM_MS = 360;
const SCANNER_STRICT_GHOST_MIN_CONFIDENCE = 49;

/* ---------------------------------------------- 
     Get Scanner Valid Card IDs
----------------------------------------------  */
function getScannerValidCardIds() {
     const cards = getScannerCards ? getScannerCards() : [];
     const ids = {};
     cards.forEach(function(card) {
          ids[normalizeCardId(card.cardId)] = true;
     });
     return ids;
}

/* ---------------------------------------------- 
     Scanner Candidate Is Reasonable
----------------------------------------------  */
function scannerCandidateIsReasonable(box, width, height) {
     if (!box) { return false; }
     const side = Math.min(box.w, box.h);
     const ratio = box.w / Math.max(1, box.h);
     const frameMin = Math.min(width, height);

     if (side < Math.max(42, frameMin * 0.045)) { return false; }
     if (box.w > width * 0.94 || box.h > height * 0.94) { return false; }
     if (ratio < 0.70 || ratio > 1.42) { return false; }
     if (typeof box.fill == "number" && (box.fill < 0.28 || box.fill > 0.97)) { return false; }
     return true;
}

/* ---------------------------------------------- 
     Scanner Sample Average Luminance Radius
----------------------------------------------  */
function scannerSampleAverageLuminanceRadius(imageData, width, height, cx, cy, rx, ry) {
     const data = imageData.data;
     let total = 0;
     let samples = 0;

     for (let yy = -ry; yy <= ry; yy += 1) {
          for (let xx = -rx; xx <= rx; xx += 1) {
               const sx = Math.max(0, Math.min(width - 1, Math.round(cx + xx)));
               const sy = Math.max(0, Math.min(height - 1, Math.round(cy + yy)));
               const index = (sy * width + sx) * 4;
               total += scannerLuminance(data, index);
               samples += 1;
          }
     }

     return samples ? total / samples : 0;
}

/* ---------------------------------------------- 
     Read Grid From Candidate Detailed
----------------------------------------------  */
function readGridFromCandidateDetailed(imageData, width, height, box) {
     const pad = 0.086;
     const gap = 0.04;
     const cell = (1 - (pad * 2) - (gap * 5)) / 6;
     const values = [];
     const gridValues = [];
     const sampleRadius = Math.max(2, Math.min(9, Math.round(Math.min(box.w, box.h) * cell * 0.16)));

     for (let row = 0; row < 6; row += 1) {
          const line = [];
          for (let col = 0; col < 6; col += 1) {
               const rx = pad + (cell / 2) + col * (cell + gap);
               const ry = pad + (cell / 2) + row * (cell + gap);
               const cx = box.x + rx * box.w;
               const cy = box.y + ry * box.h;
               const value = scannerSampleAverageLuminanceRadius(imageData, width, height, cx, cy, sampleRadius, sampleRadius);
               values.push(value);
               line.push(value);
          }
          gridValues.push(line);
     }

     const sorted = values.slice().sort(function(a, b) { return a - b; });
     const lowAvg = scannerAverageNumbers(sorted.slice(0, 12));
     const highAvg = scannerAverageNumbers(sorted.slice(-12));
     const contrast = highAvg - lowAvg;
     const threshold = contrast >= 20 ? (lowAvg + highAvg) / 2 : Math.max(130, lowAvg + 16);
     const boolGrid = gridValues.map(function(row) {
          return row.map(function(value) { return value > threshold; });
     });

     const blackSamples = [];
     const edgeSamples = [
          [0.025, 0.025], [0.5, 0.025], [0.975, 0.025],
          [0.025, 0.5], [0.975, 0.5],
          [0.025, 0.975], [0.5, 0.975], [0.975, 0.975]
     ];
     edgeSamples.forEach(function(point) {
          blackSamples.push(scannerSampleAverageLuminanceRadius(imageData, width, height, box.x + point[0] * box.w, box.y + point[1] * box.h, sampleRadius, sampleRadius));
     });

     return {
          grid: boolGrid,
          values: gridValues,
          threshold: threshold,
          contrast: contrast,
          lowAvg: lowAvg,
          highAvg: highAvg,
          borderDarkness: scannerAverageNumbers(blackSamples),
          box: box
     };
}

/* ---------------------------------------------- 
     Decode Q-Card Detailed Strict
----------------------------------------------  */
function decodeQCardDetailedStrict(detail) {
     if (!detail || !detail.grid) { return null; }
     const answersByRotation = ["A", "B", "C", "D"];
     const positions = qCardDataPositions();
     let best = null;

     for (let rotation = 0; rotation < 4; rotation += 1) {
          const grid = rotateGrid(detail.grid, rotation);
          const values = rotateGrid(detail.values, rotation);
          const anchor = anchorScore(grid);
          const cornerNoise = cornerNoiseScore(grid);

          if (anchor < 3) { continue; }
          if (cornerNoise > 2) { continue; }

          const bits = positions.slice(0, 10).map(function(position) {
               return grid[position[0]][position[1]] ? 1 : 0;
          });

          let value = 0;
          for (let i = 0; i < 6; i += 1) { value |= bits[i] << i; }
          let checksum = 0;
          for (let i = 0; i < 4; i += 1) { checksum |= bits[6 + i] << i; }

          if (value < 0 || value >= SCANNER_MAX_CARDS) { continue; }
          if (checksum !== ((value * 7 + 11) & 15)) { continue; }

          const cardId = `P${String(value + 1).padStart(2, "0")}`;
          const validIds = getScannerValidCardIds();
          if (Object.keys(validIds).length && !validIds[cardId]) { continue; }

          let cellConfidenceTotal = 0;
          let cellConfidenceMin = 999;
          let tested = 0;
          positions.slice(0, 10).forEach(function(position, index) {
               const row = position[0];
               const col = position[1];
               const expectedWhite = !!bits[index];
               const distance = Math.abs(values[row][col] - detail.threshold);
               if (expectedWhite && values[row][col] < detail.threshold + 2) { cellConfidenceMin = Math.min(cellConfidenceMin, distance - 5); }
               if (!expectedWhite && values[row][col] > detail.threshold - 2) { cellConfidenceMin = Math.min(cellConfidenceMin, distance - 5); }
               cellConfidenceTotal += distance;
               if (distance < cellConfidenceMin) { cellConfidenceMin = distance; }
               tested += 1;
          });

          const avgCellConfidence = tested ? cellConfidenceTotal / tested : 0;
          if (detail.contrast < 20) { continue; }
          if (avgCellConfidence < 8) { continue; }
          if (cellConfidenceMin < -3) { continue; }
          if (detail.borderDarkness > detail.threshold + 12) { continue; }

          const orientationConfidence = qCardOrientationScore(grid);
          const confidence = orientationConfidence + (anchor * 5) + Math.max(0, 16 - (cornerNoise * 3)) + Math.round(detail.contrast / 4) + Math.round(avgCellConfidence / 2);
          const decoded = {
               cardId: cardId,
               answer: answersByRotation[rotation],
               confidence: confidence,
               rotation: rotation,
               box: detail.box,
               strict: true
          };

          if (!best || decoded.confidence > best.confidence) { best = decoded; }
     }

     return best;
}

/* ---------------------------------------------- 
     Find 6x6 Q-Card Candidates Strict
----------------------------------------------  */
function findQCardCandidates(imageData, width, height) {
     const data = imageData.data;
     const total = width * height;
     const dark = new Uint8Array(total);
     const seen = new Uint8Array(total);
     const candidates = [];
     const darkThreshold = scannerAdaptiveDarkThreshold(imageData);

     for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
          const lum = scannerLuminance(data, i);
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
               const grow = Math.max(2, Math.round(Math.min(boxW, boxH) * 0.01));
               const box = {
                    x: Math.max(0, minX - grow),
                    y: Math.max(0, minY - grow),
                    w: Math.min(width - minX, boxW + grow * 2),
                    h: Math.min(height - minY, boxH + grow * 2),
                    area: area,
                    threshold: darkThreshold,
                    fill: fill,
                    ratio: ratio
               };

               if (!scannerCandidateIsReasonable(box, width, height)) { continue; }
               candidates.push(box);
          }
     }

     return candidates.sort(function(a, b) { return b.area - a.area; }).slice(0, 24);
}

/* ---------------------------------------------- 
     Detect 6x6 Q-Cards From Canvas Strict
----------------------------------------------  */
function detectQCardsFromCanvas(canvas) {
     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
     const candidates = findQCardCandidates(imageData, canvas.width, canvas.height);
     const bestByCard = {};

     candidates.forEach(function(box) {
          const detail = readGridFromCandidateDetailed(imageData, canvas.width, canvas.height, box);
          const decoded = decodeQCardDetailedStrict(detail);
          if (!decoded) { return; }
          if (!bestByCard[decoded.cardId] || decoded.confidence > bestByCard[decoded.cardId].confidence) {
               bestByCard[decoded.cardId] = decoded;
          }
     });

     return Object.keys(bestByCard)
          .map(function(cardId) { return bestByCard[cardId]; })
          .sort(function(a, b) { return b.confidence - a.confidence; });
}

/* ---------------------------------------------- 
     Strict Stable Detections
----------------------------------------------  */
function strictStableDetections(detections) {
     const now = Date.now();
     const stable = [];

     Object.keys(scannerStrictSeenMemory).forEach(function(key) {
          if (now - scannerStrictSeenMemory[key].lastSeen > SCANNER_STRICT_CONFIRM_MS) {
               delete scannerStrictSeenMemory[key];
          }
     });

     (detections || []).forEach(function(item) {
          const cardId = normalizeCardId(item.cardId);
          const key = `${cardId}-${item.answer}`;
          const previous = scannerStrictSeenMemory[key];
          const count = previous && now - previous.lastSeen < SCANNER_STRICT_CONFIRM_MS ? previous.count + 1 : 1;
          const strongest = previous ? Math.max(previous.confidence || 0, item.confidence || 0) : (item.confidence || 0);
          scannerStrictSeenMemory[key] = {
               count: count,
               confidence: strongest,
               firstSeen: previous ? previous.firstSeen : now,
               lastSeen: now
          };

          if (count >= 2 || strongest >= SCANNER_STRICT_GHOST_MIN_CONFIDENCE) {
               item.confidence = strongest;
               stable.push(item);
          }
     });

     return stable;
}

/* ---------------------------------------------- 
     Scan Confirmed Fast Strict
----------------------------------------------  */
function scanConfirmedFast(cardId, answer, confidence) {
     const key = normalizeCardId(cardId);
     const now = Date.now();
     const previous = scanConfirmMemory[key];
     scanConfirmMemory[key] = { answer: answer, confidence: confidence || 0, time: now };

     if ((confidence || 0) >= SCANNER_STRICT_GHOST_MIN_CONFIDENCE) { return true; }
     if (previous && previous.answer == answer && now - previous.time < 420) { return true; }
     return false;
}

/* ---------------------------------------------- 
     Scan Current Frame Strict
----------------------------------------------  */
async function scanCurrentFrame() {
     if (!elVideo || elVideo.readyState < 2) { return; }

     const work = scannerWorkCanvas;
     const ctx = work.getContext("2d", { willReadFrequently: true });
     const sourceW = elVideo.videoWidth || 1280;
     const sourceH = elVideo.videoHeight || 720;
     const maxW = 960;
     work.width = Math.min(maxW, sourceW);
     work.height = Math.round(sourceH * (work.width / sourceW));
     ctx.imageSmoothingEnabled = false;
     ctx.drawImage(elVideo, 0, 0, work.width, work.height);
     syncScannerOverlaySize(work.width, work.height);

     const rawDetections = detectQCardsFromCanvas(work);
     const detections = strictStableDetections(rawDetections);
     drawScannerOverlay(detections);
     if (detections.length) {
          handleDetectedCodes(detections, "phone-camera-6x6-balanced");
     }
}

/* ---------------------------------------------- 
     Scanner Warning Text
----------------------------------------------  */
function scannerSetStrictReadyMessage() {
     setStatus("Balanced scanner active. Hold a Q-card steady for a moment; background shapes are still filtered.", false);
}

/* ---------------------------------------------- 
     V57 Forgiving Q-Card Detection Recovery
----------------------------------------------  */

var scannerV57SeenMemory = scannerV57SeenMemory || {};
const SCANNER_V57_CONFIRM_MS = 850;
const SCANNER_V57_FAST_CONFIDENCE = 34;
const SCANNER_V57_SECOND_FRAME_CONFIDENCE = 24;
const SCANNER_V57_MAX_WORK_WIDTH = 1280;

/* ---------------------------------------------- 
     V57 Clamp Box
----------------------------------------------  */
function scannerV57ClampBox(box, width, height) {
     const x = Math.max(0, Math.min(width - 2, Math.round(box.x)));
     const y = Math.max(0, Math.min(height - 2, Math.round(box.y)));
     const w = Math.max(2, Math.min(width - x, Math.round(box.w)));
     const h = Math.max(2, Math.min(height - y, Math.round(box.h)));
     return { x: x, y: y, w: w, h: h, area: box.area || (w * h), fill: box.fill || 0, ratio: w / Math.max(1, h) };
}

/* ---------------------------------------------- 
     V57 Boxes Overlap
----------------------------------------------  */
function scannerV57BoxesOverlap(a, b) {
     const left = Math.max(a.x, b.x);
     const top = Math.max(a.y, b.y);
     const right = Math.min(a.x + a.w, b.x + b.w);
     const bottom = Math.min(a.y + a.h, b.y + b.h);
     const overlap = Math.max(0, right - left) * Math.max(0, bottom - top);
     const smaller = Math.max(1, Math.min(a.w * a.h, b.w * b.h));
     return overlap / smaller > 0.54;
}

/* ---------------------------------------------- 
     V57 Add Candidate
----------------------------------------------  */
function scannerV57AddCandidate(list, box, width, height) {
     const candidate = scannerV57ClampBox(box, width, height);
     if (!scannerCandidateIsReasonable(candidate, width, height)) { return; }
     for (let i = 0; i < list.length; i += 1) {
          if (scannerV57BoxesOverlap(list[i], candidate)) {
               if ((candidate.area || 0) > (list[i].area || 0)) { list[i] = candidate; }
               return;
          }
     }
     list.push(candidate);
}

/* ---------------------------------------------- 
     Scanner Candidate Is Reasonable
----------------------------------------------  */
function scannerCandidateIsReasonable(box, width, height) {
     if (!box) { return false; }
     const side = Math.min(box.w, box.h);
     const ratio = box.w / Math.max(1, box.h);
     const frameMin = Math.min(width, height);

     if (side < Math.max(30, frameMin * 0.032)) { return false; }
     if (box.w > width * 0.985 || box.h > height * 0.985) { return false; }
     if (ratio < 0.54 || ratio > 1.86) { return false; }
     if (typeof box.fill == "number" && box.fill > 0 && (box.fill < 0.16 || box.fill > 0.992)) { return false; }
     return true;
}

/* ---------------------------------------------- 
     V57 Find Connected Candidates At Threshold
----------------------------------------------  */
function scannerV57FindCandidatesAtThreshold(imageData, width, height, threshold) {
     const data = imageData.data;
     const total = width * height;
     const dark = new Uint8Array(total);
     const seen = new Uint8Array(total);
     const candidates = [];

     for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
          dark[pixel] = scannerLuminance(data, i) < threshold ? 1 : 0;
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
               const fill = area / Math.max(1, boxW * boxH);
               const grow = Math.max(3, Math.round(Math.min(boxW, boxH) * 0.018));
               scannerV57AddCandidate(candidates, {
                    x: minX - grow,
                    y: minY - grow,
                    w: boxW + grow * 2,
                    h: boxH + grow * 2,
                    area: area,
                    fill: fill
               }, width, height);
          }
     }

     return candidates;
}

/* ---------------------------------------------- 
     V57 Add Center Fallback Candidates
----------------------------------------------  */
function scannerV57AddCenterFallbackCandidates(candidates, width, height) {
     const sideBase = Math.min(width, height);
     const ratios = [0.88, 0.74, 0.60, 0.46, 0.34];
     ratios.forEach(function(ratio) {
          const side = Math.round(sideBase * ratio);
          scannerV57AddCandidate(candidates, {
               x: Math.round((width - side) / 2),
               y: Math.round((height - side) / 2),
               w: side,
               h: side,
               area: side * side,
               fill: .5
          }, width, height);
     });
}

/* ---------------------------------------------- 
     Find 6x6 Q-Card Candidates
----------------------------------------------  */
function findQCardCandidates(imageData, width, height) {
     const baseThreshold = scannerAdaptiveDarkThreshold(imageData);
     const thresholds = [baseThreshold + 34, baseThreshold + 18, baseThreshold, baseThreshold - 18, baseThreshold - 34]
          .map(function(value) { return Math.max(70, Math.min(224, Math.round(value))); });
     const candidates = [];

     thresholds.forEach(function(threshold) {
          scannerV57FindCandidatesAtThreshold(imageData, width, height, threshold).forEach(function(box) {
               scannerV57AddCandidate(candidates, box, width, height);
          });
     });

     scannerV57AddCenterFallbackCandidates(candidates, width, height);
     return candidates.sort(function(a, b) { return (b.area || 0) - (a.area || 0); }).slice(0, 42);
}

/* ---------------------------------------------- 
     Decode Q-Card Detailed Strict
----------------------------------------------  */
function decodeQCardDetailedStrict(detail) {
     if (!detail || !detail.grid) { return null; }
     const answersByRotation = ["A", "B", "C", "D"];
     const positions = qCardDataPositions();
     let best = null;

     for (let rotation = 0; rotation < 4; rotation += 1) {
          const grid = rotateGrid(detail.grid, rotation);
          const values = rotateGrid(detail.values, rotation);
          const anchor = anchorScore(grid);
          const cornerNoise = cornerNoiseScore(grid);

          if (anchor < 3) { continue; }
          if (cornerNoise > 4) { continue; }

          const bits = positions.slice(0, 10).map(function(position) {
               return grid[position[0]][position[1]] ? 1 : 0;
          });

          let value = 0;
          for (let i = 0; i < 6; i += 1) { value |= bits[i] << i; }
          let checksum = 0;
          for (let i = 0; i < 4; i += 1) { checksum |= bits[6 + i] << i; }

          if (value < 0 || value >= SCANNER_MAX_CARDS) { continue; }
          if (checksum !== ((value * 7 + 11) & 15)) { continue; }

          const cardId = `P${String(value + 1).padStart(2, "0")}`;
          const validIds = getScannerValidCardIds();
          if (Object.keys(validIds).length && !validIds[cardId]) { continue; }

          let cellConfidenceTotal = 0;
          let cellConfidenceMin = 999;
          let tested = 0;
          positions.slice(0, 10).forEach(function(position, index) {
               const row = position[0];
               const col = position[1];
               const expectedWhite = !!bits[index];
               const distance = Math.abs(values[row][col] - detail.threshold);
               if (expectedWhite && values[row][col] < detail.threshold - 2) { cellConfidenceMin = Math.min(cellConfidenceMin, distance - 6); }
               else if (!expectedWhite && values[row][col] > detail.threshold + 2) { cellConfidenceMin = Math.min(cellConfidenceMin, distance - 6); }
               else if (distance < cellConfidenceMin) { cellConfidenceMin = distance; }
               cellConfidenceTotal += distance;
               tested += 1;
          });

          const avgCellConfidence = tested ? cellConfidenceTotal / tested : 0;
          if (detail.contrast < 10) { continue; }
          if (avgCellConfidence < 4) { continue; }
          if (cellConfidenceMin < -8) { continue; }

          const orientationConfidence = qCardOrientationScore(grid);
          const confidence = orientationConfidence + (anchor * 5) + Math.max(0, 18 - (cornerNoise * 3)) + Math.round(detail.contrast / 5) + Math.round(avgCellConfidence / 2);
          const decoded = {
               cardId: cardId,
               answer: answersByRotation[rotation],
               confidence: confidence,
               rotation: rotation,
               box: detail.box,
               strict: false
          };

          if (!best || decoded.confidence > best.confidence) { best = decoded; }
     }

     return best;
}

/* ---------------------------------------------- 
     V57 Stable Detections
----------------------------------------------  */
function strictStableDetections(detections) {
     const now = Date.now();
     const stable = [];

     Object.keys(scannerV57SeenMemory).forEach(function(key) {
          if (now - scannerV57SeenMemory[key].lastSeen > SCANNER_V57_CONFIRM_MS) {
               delete scannerV57SeenMemory[key];
          }
     });

     (detections || []).forEach(function(item) {
          const cardId = normalizeCardId(item.cardId);
          const key = `${cardId}-${item.answer}`;
          const previous = scannerV57SeenMemory[key];
          const count = previous && now - previous.lastSeen < SCANNER_V57_CONFIRM_MS ? previous.count + 1 : 1;
          const strongest = previous ? Math.max(previous.confidence || 0, item.confidence || 0) : (item.confidence || 0);
          scannerV57SeenMemory[key] = {
               count: count,
               confidence: strongest,
               firstSeen: previous ? previous.firstSeen : now,
               lastSeen: now
          };

          if (strongest >= SCANNER_V57_FAST_CONFIDENCE || (count >= 2 && strongest >= SCANNER_V57_SECOND_FRAME_CONFIDENCE)) {
               item.confidence = strongest;
               stable.push(item);
          }
     });

     return stable;
}

/* ---------------------------------------------- 
     Scan Confirmed Fast
----------------------------------------------  */
function scanConfirmedFast(cardId, answer, confidence) {
     const key = normalizeCardId(cardId);
     const now = Date.now();
     const previous = scanConfirmMemory[key];
     scanConfirmMemory[key] = { answer: answer, confidence: confidence || 0, time: now };

     if ((confidence || 0) >= SCANNER_V57_FAST_CONFIDENCE) { return true; }
     if (previous && previous.answer == answer && now - previous.time < SCANNER_V57_CONFIRM_MS) { return true; }
     return false;
}

/* ---------------------------------------------- 
     V57 QR Fallback Detections
----------------------------------------------  */
async function scannerV57QrFallbackDetections(work) {
     const detections = [];

     if (barcodeDetector && elVideo) {
          try {
               const barcodes = await barcodeDetector.detect(elVideo);
               (barcodes || []).forEach(function(code) {
                    const payload = decodePayload(code.rawValue, locationFromBarcode(code));
                    if (payload) { detections.push(payload); }
               });
          }
          catch (error) {}
     }

     if (!detections.length && window.jsQR && work) {
          try {
               const ctx = work.getContext("2d", { willReadFrequently: true });
               const imageData = ctx.getImageData(0, 0, work.width, work.height);
               const result = jsQR(imageData.data, work.width, work.height, { inversionAttempts: "attemptBoth" });
               if (result && result.data) {
                    const payload = decodePayload(result.data, result.location);
                    if (payload) { detections.push(payload); }
               }
          }
          catch (error) {}
     }

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
          await refreshScannerSessionCache(true);
          await refreshScannerResponses(true);
          startScannerDataPolling();
          scannerStream = await navigator.mediaDevices.getUserMedia({
               video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 60, min: 24 }
               },
               audio: false
          });
          elVideo.srcObject = scannerStream;
          elVideo.setAttribute("playsinline", "");
          elVideo.setAttribute("webkit-playsinline", "");
          await elVideo.play();
          if (btnStartCamera) { btnStartCamera.textContent = "Scanning 6×6"; }
          setStatus("Recovery scanner active. It accepts gray printed Q-cards more easily and still checks the card checksum before recording.", false);
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
     if (!elVideo || elVideo.readyState < 2) { return; }

     const work = scannerWorkCanvas;
     const ctx = work.getContext("2d", { willReadFrequently: true });
     const sourceW = elVideo.videoWidth || 1280;
     const sourceH = elVideo.videoHeight || 720;
     work.width = Math.min(SCANNER_V57_MAX_WORK_WIDTH, sourceW);
     work.height = Math.round(sourceH * (work.width / sourceW));
     ctx.imageSmoothingEnabled = false;
     ctx.drawImage(elVideo, 0, 0, work.width, work.height);
     syncScannerOverlaySize(work.width, work.height);

     const rawDetections = detectQCardsFromCanvas(work);
     const stableDetections = strictStableDetections(rawDetections);
     drawScannerOverlay(rawDetections.length ? rawDetections : stableDetections);

     if (stableDetections.length) {
          handleDetectedCodes(stableDetections, "phone-camera-6x6-recovery");
          return;
     }

     if (!rawDetections.length) {
          const qrFallback = await scannerV57QrFallbackDetections(work);
          if (qrFallback.length) {
               handleDetectedCodes(qrFallback, "phone-camera-qr-recovery");
          }
     }
}

/* ---------------------------------------------- 
     V58 Real Q-Card Validation Against Full Pattern
----------------------------------------------  */

var scannerV58SeenMemory = scannerV58SeenMemory || {};
const SCANNER_V58_CONFIRM_MS = 720;
const SCANNER_V58_FAST_CONFIDENCE = 66;
const SCANNER_V58_SECOND_FRAME_CONFIDENCE = 44;
const SCANNER_V58_MAX_WORK_WIDTH = 1180;

/* ---------------------------------------------- 
     V58 Expected 6x6 Pattern
----------------------------------------------  */
function scannerV58ExpectedGridFromValue(value) {
     const checksum = (value * 7 + 11) & 15;
     const bits = [];

     for (let i = 0; i < 6; i += 1) { bits.push((value >> i) & 1); }
     for (let i = 0; i < 4; i += 1) { bits.push((checksum >> i) & 1); }

     const grid = Array.from({ length: 6 }, function() {
          return Array.from({ length: 6 }, function() { return false; });
     });

     grid[0][0] = true;
     grid[0][1] = true;
     grid[1][0] = true;
     grid[1][1] = false;

     qCardDataPositions().forEach(function(position, index) {
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
     V58 Grid Pattern Match
----------------------------------------------  */
function scannerV58PatternMatchScore(grid, values, threshold, expected) {
     let mismatch = 0;
     let weak = 0;
     let totalDistance = 0;

     for (let row = 0; row < 6; row += 1) {
          for (let col = 0; col < 6; col += 1) {
               const expectedWhite = !!expected[row][col];
               const actualWhite = !!grid[row][col];
               const distance = Math.abs(values[row][col] - threshold);
               totalDistance += distance;
               if (expectedWhite !== actualWhite) { mismatch += 1; }
               if (distance < 5) { weak += 1; }
          }
     }

     return {
          mismatch: mismatch,
          weak: weak,
          averageDistance: totalDistance / 36
     };
}

/* ---------------------------------------------- 
     V58 Candidate Is Reasonable
----------------------------------------------  */
function scannerCandidateIsReasonable(box, width, height) {
     if (!box) { return false; }
     const side = Math.min(box.w, box.h);
     const ratio = box.w / Math.max(1, box.h);
     const frameMin = Math.min(width, height);
     const frameMax = Math.max(width, height);

     if (side < Math.max(50, frameMin * 0.062)) { return false; }
     if (box.w > frameMax * 0.88 || box.h > frameMax * 0.88) { return false; }
     if (ratio < 0.66 || ratio > 1.52) { return false; }
     if (typeof box.fill == "number" && box.fill > 0 && (box.fill < 0.30 || box.fill > 0.93)) { return false; }
     return true;
}

/* ---------------------------------------------- 
     V58 Add Candidate
----------------------------------------------  */
function scannerV58AddCandidate(list, box, width, height) {
     const candidate = scannerV57ClampBox ? scannerV57ClampBox(box, width, height) : box;
     if (!scannerCandidateIsReasonable(candidate, width, height)) { return; }

     for (let i = 0; i < list.length; i += 1) {
          if (scannerV57BoxesOverlap && scannerV57BoxesOverlap(list[i], candidate)) {
               if ((candidate.area || 0) > (list[i].area || 0)) { list[i] = candidate; }
               return;
          }
     }

     list.push(candidate);
}

/* ---------------------------------------------- 
     V58 Connected Candidates At Threshold
----------------------------------------------  */
function scannerV58FindCandidatesAtThreshold(imageData, width, height, threshold) {
     const data = imageData.data;
     const total = width * height;
     const dark = new Uint8Array(total);
     const seen = new Uint8Array(total);
     const candidates = [];

     for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
          dark[pixel] = scannerLuminance(data, i) < threshold ? 1 : 0;
     }

     const queue = [];
     const neighborOffsets = [-1, 1, -width, width];

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
               const fill = area / Math.max(1, boxW * boxH);
               const grow = Math.max(3, Math.round(Math.min(boxW, boxH) * 0.018));

               scannerV58AddCandidate(candidates, {
                    x: minX - grow,
                    y: minY - grow,
                    w: boxW + grow * 2,
                    h: boxH + grow * 2,
                    area: area,
                    fill: fill
               }, width, height);
          }
     }

     return candidates;
}

/* ---------------------------------------------- 
     Find 6x6 Q-Card Candidates
----------------------------------------------  */
function findQCardCandidates(imageData, width, height) {
     const baseThreshold = scannerAdaptiveDarkThreshold(imageData);
     const thresholds = [baseThreshold + 24, baseThreshold + 10, baseThreshold, baseThreshold - 14]
          .map(function(value) { return Math.max(74, Math.min(214, Math.round(value))); });
     const candidates = [];

     thresholds.forEach(function(threshold) {
          scannerV58FindCandidatesAtThreshold(imageData, width, height, threshold).forEach(function(box) {
               scannerV58AddCandidate(candidates, box, width, height);
          });
     });

     return candidates.sort(function(a, b) { return (b.area || 0) - (a.area || 0); }).slice(0, 28);
}

/* ---------------------------------------------- 
     Decode Q-Card With Full Pattern Check
----------------------------------------------  */
function decodeQCardDetailedStrict(detail) {
     if (!detail || !detail.grid) { return null; }
     const answersByRotation = ["A", "B", "C", "D"];
     const positions = qCardDataPositions();
     const validIds = getScannerValidCardIds();
     const hasRoster = Object.keys(validIds).length > 0;
     let best = null;

     for (let rotation = 0; rotation < 4; rotation += 1) {
          const grid = rotateGrid(detail.grid, rotation);
          const values = rotateGrid(detail.values, rotation);
          const anchor = anchorScore(grid);
          const cornerNoise = cornerNoiseScore(grid);

          if (anchor < 3) { continue; }
          if (cornerNoise > 3) { continue; }

          const bits = positions.slice(0, 10).map(function(position) {
               return grid[position[0]][position[1]] ? 1 : 0;
          });

          let value = 0;
          for (let i = 0; i < 6; i += 1) { value |= bits[i] << i; }
          let checksum = 0;
          for (let i = 0; i < 4; i += 1) { checksum |= bits[6 + i] << i; }

          if (value < 0 || value >= SCANNER_MAX_CARDS) { continue; }
          if (checksum !== ((value * 7 + 11) & 15)) { continue; }

          const cardId = `P${String(value + 1).padStart(2, "0")}`;
          if (hasRoster && !validIds[cardId]) { continue; }

          const expected = scannerV58ExpectedGridFromValue(value);
          const pattern = scannerV58PatternMatchScore(grid, values, detail.threshold, expected);
          const maxMismatch = detail.contrast >= 22 ? 4 : 3;

          if (pattern.mismatch > maxMismatch) { continue; }
          if (pattern.weak > 13) { continue; }
          if (detail.contrast < 12) { continue; }
          if (detail.borderDarkness > detail.threshold + 6) { continue; }

          const orientationConfidence = qCardOrientationScore(grid);
          const confidence = 90 - (pattern.mismatch * 13) - (pattern.weak * 2) + orientationConfidence + Math.round(detail.contrast / 3) + Math.round(pattern.averageDistance / 2);
          const decoded = {
               cardId: cardId,
               answer: answersByRotation[rotation],
               confidence: confidence,
               rotation: rotation,
               box: detail.box,
               mismatch: pattern.mismatch,
               strict: true
          };

          if (!best || decoded.confidence > best.confidence) { best = decoded; }
     }

     return best;
}

/* ---------------------------------------------- 
     V58 Stable Detections
----------------------------------------------  */
function strictStableDetections(detections) {
     const now = Date.now();
     const stable = [];

     Object.keys(scannerV58SeenMemory).forEach(function(key) {
          if (now - scannerV58SeenMemory[key].lastSeen > SCANNER_V58_CONFIRM_MS) {
               delete scannerV58SeenMemory[key];
          }
     });

     (detections || []).forEach(function(item) {
          const cardId = normalizeCardId(item.cardId);
          const key = `${cardId}-${item.answer}`;
          const previous = scannerV58SeenMemory[key];
          const count = previous && now - previous.lastSeen < SCANNER_V58_CONFIRM_MS ? previous.count + 1 : 1;
          const strongest = previous ? Math.max(previous.confidence || 0, item.confidence || 0) : (item.confidence || 0);
          const box = item.box || previous && previous.box;

          scannerV58SeenMemory[key] = {
               count: count,
               confidence: strongest,
               firstSeen: previous ? previous.firstSeen : now,
               lastSeen: now,
               box: box
          };

          if (strongest >= SCANNER_V58_FAST_CONFIDENCE || (count >= 2 && strongest >= SCANNER_V58_SECOND_FRAME_CONFIDENCE)) {
               item.confidence = strongest;
               item.box = box;
               stable.push(item);
          }
     });

     return stable;
}

/* ---------------------------------------------- 
     Scan Confirmed Fast
----------------------------------------------  */
function scanConfirmedFast(cardId, answer, confidence) {
     const key = normalizeCardId(cardId);
     const now = Date.now();
     const previous = scanConfirmMemory[key];
     scanConfirmMemory[key] = { answer: answer, confidence: confidence || 0, time: now };

     if ((confidence || 0) >= SCANNER_V58_FAST_CONFIDENCE) { return true; }
     if (previous && previous.answer == answer && now - previous.time < SCANNER_V58_CONFIRM_MS) { return true; }
     return false;
}

/* ---------------------------------------------- 
     Scan Current Frame
----------------------------------------------  */
async function scanCurrentFrame() {
     if (!elVideo || elVideo.readyState < 2) { return; }

     const work = scannerWorkCanvas;
     const ctx = work.getContext("2d", { willReadFrequently: true });
     const sourceW = elVideo.videoWidth || 1280;
     const sourceH = elVideo.videoHeight || 720;
     work.width = Math.min(SCANNER_V58_MAX_WORK_WIDTH, sourceW);
     work.height = Math.round(sourceH * (work.width / sourceW));
     ctx.imageSmoothingEnabled = false;
     ctx.drawImage(elVideo, 0, 0, work.width, work.height);
     syncScannerOverlaySize(work.width, work.height);

     const rawDetections = detectQCardsFromCanvas(work);
     const stableDetections = strictStableDetections(rawDetections);
     drawScannerOverlay(stableDetections);

     if (stableDetections.length) {
          handleDetectedCodes(stableDetections, "phone-camera-6x6-v58");
          return;
     }

     if (!rawDetections.length) {
          const qrFallback = await scannerV57QrFallbackDetections(work);
          if (qrFallback.length) {
               handleDetectedCodes(qrFallback, "phone-camera-qr-v58");
          }
     }
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
          await refreshScannerSessionCache(true);
          await refreshScannerResponses(true);
          startScannerDataPolling();
          scannerStream = await navigator.mediaDevices.getUserMedia({
               video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 60, min: 24 }
               },
               audio: false
          });
          elVideo.srcObject = scannerStream;
          elVideo.setAttribute("playsinline", "");
          elVideo.setAttribute("webkit-playsinline", "");
          await elVideo.play();
          if (btnStartCamera) { btnStartCamera.textContent = "Scanning 6×6"; }
          setStatus("Scanner active. It now validates the full Q-card pattern before showing or recording, so wall drawings and background shapes are ignored.", false);
          startLoop();
     }
     catch (error) {
          if (btnStartCamera) { btnStartCamera.disabled = false; btnStartCamera.textContent = "Start Camera"; }
          setStatus(`Camera could not start: ${error.message || "permission blocked"}. Use manual backup.`, true);
     }
}

/* ---------------------------------------------- 
     V59 Real Paper Q-Card Guard Rails
----------------------------------------------  */

var scannerV59SeenMemory = scannerV59SeenMemory || {};
var SCANNER_V59_MAX_WORK_WIDTH = 1240;
var SCANNER_V59_CONFIRM_MS = 620;
var SCANNER_V59_FAST_CONFIDENCE = 92;
var SCANNER_V59_SECOND_FRAME_CONFIDENCE = 58;
var SCANNER_V59_MIN_SIDE_RATIO = 0.108;

/* ---------------------------------------------- 
     V59 Clamp Number
----------------------------------------------  */
function scannerV59Clamp(value, min, max) {
     return Math.max(min, Math.min(max, value));
}

/* ---------------------------------------------- 
     V59 Box Clamp
----------------------------------------------  */
function scannerV59ClampBox(box, width, height) {
     const x = scannerV59Clamp(Math.round(box.x), 0, width - 2);
     const y = scannerV59Clamp(Math.round(box.y), 0, height - 2);
     const w = scannerV59Clamp(Math.round(box.w), 2, width - x);
     const h = scannerV59Clamp(Math.round(box.h), 2, height - y);
     return {
          x: x,
          y: y,
          w: w,
          h: h,
          area: box.area || (w * h),
          fill: box.fill || 0,
          threshold: box.threshold || 0,
          ratio: w / Math.max(1, h)
     };
}

/* ---------------------------------------------- 
     V59 Sample Patch
----------------------------------------------  */
function scannerV59SamplePatch(imageData, width, height, x, y, radius) {
     return scannerSampleAverageLuminanceRadius(
          imageData,
          width,
          height,
          scannerV59Clamp(x, 0, width - 1),
          scannerV59Clamp(y, 0, height - 1),
          radius,
          radius
     );
}

/* ---------------------------------------------- 
     V59 Sample Relative Point
----------------------------------------------  */
function scannerV59SampleRelative(imageData, width, height, box, rx, ry, radius) {
     return scannerV59SamplePatch(
          imageData,
          width,
          height,
          box.x + rx * box.w,
          box.y + ry * box.h,
          radius
     );
}

/* ---------------------------------------------- 
     V59 Box Looks Like Printed Marker
----------------------------------------------  */
function scannerV59BoxLooksLikePrintedMarker(box, width, height) {
     if (!box) { return false; }
     const side = Math.min(box.w, box.h);
     const ratio = box.w / Math.max(1, box.h);
     const frameMin = Math.min(width, height);
     const frameMax = Math.max(width, height);

     if (side < Math.max(86, frameMin * SCANNER_V59_MIN_SIDE_RATIO)) { return false; }
     if (side > frameMax * 0.74) { return false; }
     if (ratio < 0.74 || ratio > 1.34) { return false; }
     if (typeof box.fill == "number" && box.fill > 0 && (box.fill < 0.40 || box.fill > 0.88)) { return false; }
     return true;
}

/* ---------------------------------------------- 
     V59 Add Candidate
----------------------------------------------  */
function scannerV59AddCandidate(list, box, width, height) {
     const candidate = scannerV59ClampBox(box, width, height);
     if (!scannerV59BoxLooksLikePrintedMarker(candidate, width, height)) { return; }

     for (let i = 0; i < list.length; i += 1) {
          if (scannerV57BoxesOverlap && scannerV57BoxesOverlap(list[i], candidate)) {
               const oldScore = (list[i].area || 0) * (list[i].fill || 0.5);
               const newScore = (candidate.area || 0) * (candidate.fill || 0.5);
               if (newScore > oldScore) { list[i] = candidate; }
               return;
          }
     }

     list.push(candidate);
}

/* ---------------------------------------------- 
     V59 Candidates At Threshold
----------------------------------------------  */
function scannerV59FindCandidatesAtThreshold(imageData, width, height, threshold) {
     const data = imageData.data;
     const total = width * height;
     const dark = new Uint8Array(total);
     const seen = new Uint8Array(total);
     const candidates = [];

     for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
          dark[pixel] = scannerLuminance(data, i) < threshold ? 1 : 0;
     }

     const queue = [];
     const neighborOffsets = [-1, 1, -width, width];

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
               const fill = area / Math.max(1, boxW * boxH);
               const grow = Math.max(4, Math.round(Math.min(boxW, boxH) * 0.012));

               scannerV59AddCandidate(candidates, {
                    x: minX - grow,
                    y: minY - grow,
                    w: boxW + grow * 2,
                    h: boxH + grow * 2,
                    area: area,
                    fill: fill,
                    threshold: threshold
               }, width, height);
          }
     }

     return candidates;
}

/* ---------------------------------------------- 
     Find 6x6 Q-Card Candidates
----------------------------------------------  */
function findQCardCandidates(imageData, width, height) {
     const adaptive = scannerAdaptiveDarkThreshold(imageData);
     const thresholdSet = {};
     const rawThresholds = [
          92,
          112,
          132,
          150,
          Math.round(adaptive - 16),
          Math.round(adaptive),
          Math.round(adaptive + 10)
     ];
     const candidates = [];

     rawThresholds.forEach(function(value) {
          const threshold = scannerV59Clamp(Math.round(value), 78, 166);
          thresholdSet[threshold] = true;
     });

     Object.keys(thresholdSet).map(Number).forEach(function(threshold) {
          scannerV59FindCandidatesAtThreshold(imageData, width, height, threshold).forEach(function(box) {
               scannerV59AddCandidate(candidates, box, width, height);
          });
     });

     return candidates.sort(function(a, b) { return (b.area || 0) - (a.area || 0); }).slice(0, 18);
}

/* ---------------------------------------------- 
     V59 Read Grid From Printed Marker
----------------------------------------------  */
function readGridFromCandidateDetailed(imageData, width, height, box) {
     const pad = 0.086;
     const gap = 0.04;
     const cell = (1 - (pad * 2) - (gap * 5)) / 6;
     const sampleRadius = Math.max(2, Math.min(9, Math.round(Math.min(box.w, box.h) * cell * 0.14)));
     const values = [];
     const gridValues = [];

     for (let row = 0; row < 6; row += 1) {
          const line = [];
          for (let col = 0; col < 6; col += 1) {
               const rx = pad + (cell / 2) + col * (cell + gap);
               const ry = pad + (cell / 2) + row * (cell + gap);
               const value = scannerV59SampleRelative(imageData, width, height, box, rx, ry, sampleRadius);
               values.push(value);
               line.push(value);
          }
          gridValues.push(line);
     }

     const sorted = values.slice().sort(function(a, b) { return a - b; });
     const lowAvg = scannerAverageNumbers(sorted.slice(0, 14));
     const highAvg = scannerAverageNumbers(sorted.slice(-10));
     const contrast = highAvg - lowAvg;
     const threshold = contrast >= 26 ? (lowAvg + highAvg) / 2 : Math.max(124, lowAvg + 18);
     const boolGrid = gridValues.map(function(row) {
          return row.map(function(value) { return value > threshold; });
     });

     const backgroundSamples = [];
     const gapCenters = [];
     for (let i = 0; i <= 6; i += 1) {
          const p = i === 0 ? pad / 2 : i === 6 ? 1 - pad / 2 : pad + (i * cell) + ((i - 0.5) * gap);
          gapCenters.push(scannerV59Clamp(p, 0.018, 0.982));
     }
     gapCenters.forEach(function(rx) {
          gapCenters.forEach(function(ry) {
               backgroundSamples.push(scannerV59SampleRelative(imageData, width, height, box, rx, ry, sampleRadius));
          });
     });

     const edgeInside = [
          [0.035, 0.035], [0.5, 0.035], [0.965, 0.035],
          [0.035, 0.5], [0.965, 0.5],
          [0.035, 0.965], [0.5, 0.965], [0.965, 0.965]
     ];
     edgeInside.forEach(function(point) {
          backgroundSamples.push(scannerV59SampleRelative(imageData, width, height, box, point[0], point[1], sampleRadius));
     });

     const outsideSamples = [
          [-0.055, 0.25], [-0.055, 0.5], [-0.055, 0.75],
          [1.055, 0.25], [1.055, 0.5], [1.055, 0.75],
          [0.25, -0.055], [0.5, -0.055], [0.75, -0.055],
          [0.25, 1.055], [0.5, 1.055], [0.75, 1.055]
     ].map(function(point) {
          return scannerV59SampleRelative(imageData, width, height, box, point[0], point[1], sampleRadius);
     });

     const backgroundAvg = scannerAverageNumbers(backgroundSamples);
     const outsideAvg = scannerAverageNumbers(outsideSamples);
     const darkBackgroundCount = backgroundSamples.filter(function(value) {
          return value < Math.min(158, threshold - 3);
     }).length;
     const brightOutsideCount = outsideSamples.filter(function(value) {
          return value > Math.max(142, backgroundAvg + 34);
     }).length;

     return {
          grid: boolGrid,
          values: gridValues,
          threshold: threshold,
          contrast: contrast,
          lowAvg: lowAvg,
          highAvg: highAvg,
          backgroundAvg: backgroundAvg,
          outsideAvg: outsideAvg,
          darkBackgroundRatio: darkBackgroundCount / Math.max(1, backgroundSamples.length),
          brightOutsideRatio: brightOutsideCount / Math.max(1, outsideSamples.length),
          borderDarkness: backgroundAvg,
          box: box
     };
}

/* ---------------------------------------------- 
     V59 Pattern Shape Score
----------------------------------------------  */
function scannerV59PatternShapeScore(detail, expected) {
     let mismatch = 0;
     let weak = 0;
     let whiteDistinct = 0;
     let whiteTotal = 0;
     let blackDistinct = 0;
     let blackTotal = 0;
     let totalDistance = 0;
     const background = detail.backgroundAvg;
     const threshold = detail.threshold;

     for (let row = 0; row < 6; row += 1) {
          for (let col = 0; col < 6; col += 1) {
               const expectedWhite = !!expected[row][col];
               const actualWhite = !!detail.grid[row][col];
               const value = detail.values[row][col];
               const distance = Math.abs(value - threshold);
               totalDistance += distance;

               if (expectedWhite !== actualWhite) { mismatch += 1; }
               if (distance < 8) { weak += 1; }

               if (expectedWhite) {
                    whiteTotal += 1;
                    if (value > background + 48 && value > threshold + 8) { whiteDistinct += 1; }
               }
               else {
                    blackTotal += 1;
                    if (value < Math.min(threshold - 4, background + 38)) { blackDistinct += 1; }
               }
          }
     }

     return {
          mismatch: mismatch,
          weak: weak,
          whiteRatio: whiteDistinct / Math.max(1, whiteTotal),
          blackRatio: blackDistinct / Math.max(1, blackTotal),
          averageDistance: totalDistance / 36
     };
}

/* ---------------------------------------------- 
     Decode Q-Card With Printed Marker Guard
----------------------------------------------  */
function decodeQCardDetailedStrict(detail) {
     if (!detail || !detail.grid) { return null; }
     const answersByRotation = ["A", "B", "C", "D"];
     const positions = qCardDataPositions();
     const validIds = getScannerValidCardIds();
     const hasRoster = Object.keys(validIds).length > 0;
     let best = null;

     if (detail.backgroundAvg > 156) { return null; }
     if (detail.contrast < 32) { return null; }
     if (detail.highAvg < detail.backgroundAvg + 50) { return null; }
     if (detail.darkBackgroundRatio < 0.62) { return null; }
     if (detail.brightOutsideRatio < 0.34 && detail.outsideAvg < detail.backgroundAvg + 42) { return null; }

     for (let rotation = 0; rotation < 4; rotation += 1) {
          const grid = rotateGrid(detail.grid, rotation);
          const values = rotateGrid(detail.values, rotation);
          const anchor = anchorScore(grid);
          const cornerNoise = cornerNoiseScore(grid);

          if (anchor < 3) { continue; }
          if (cornerNoise > 2) { continue; }

          const bits = positions.slice(0, 10).map(function(position) {
               return grid[position[0]][position[1]] ? 1 : 0;
          });

          let value = 0;
          for (let i = 0; i < 6; i += 1) { value |= bits[i] << i; }
          let checksum = 0;
          for (let i = 0; i < 4; i += 1) { checksum |= bits[6 + i] << i; }

          if (value < 0 || value >= SCANNER_MAX_CARDS) { continue; }
          if (checksum !== ((value * 7 + 11) & 15)) { continue; }

          const cardId = `P${String(value + 1).padStart(2, "0")}`;
          if (hasRoster && !validIds[cardId]) { continue; }

          const rotatedDetail = {
               grid: grid,
               values: values,
               threshold: detail.threshold,
               backgroundAvg: detail.backgroundAvg
          };
          const expected = scannerV58ExpectedGridFromValue(value);
          const pattern = scannerV59PatternShapeScore(rotatedDetail, expected);

          if (pattern.mismatch > 2) { continue; }
          if (pattern.weak > 8) { continue; }
          if (pattern.whiteRatio < 0.68) { continue; }
          if (pattern.blackRatio < 0.70) { continue; }

          const orientationConfidence = qCardOrientationScore(grid);
          const confidence = 118
               - (pattern.mismatch * 18)
               - (pattern.weak * 3)
               + Math.round(detail.contrast / 2)
               + Math.round(pattern.averageDistance / 3)
               + Math.round(pattern.whiteRatio * 14)
               + Math.round(pattern.blackRatio * 10)
               + orientationConfidence;

          const decoded = {
               cardId: cardId,
               answer: answersByRotation[rotation],
               confidence: confidence,
               rotation: rotation,
               box: detail.box,
               mismatch: pattern.mismatch,
               strict: true
          };

          if (!best || decoded.confidence > best.confidence) { best = decoded; }
     }

     return best;
}

/* ---------------------------------------------- 
     Detect 6x6 Q-Cards From Canvas
----------------------------------------------  */
function detectQCardsFromCanvas(canvas) {
     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
     const candidates = findQCardCandidates(imageData, canvas.width, canvas.height);
     const bestByCard = {};

     candidates.forEach(function(box) {
          const detail = readGridFromCandidateDetailed(imageData, canvas.width, canvas.height, box);
          const decoded = decodeQCardDetailedStrict(detail);
          if (!decoded) { return; }
          if (!bestByCard[decoded.cardId] || decoded.confidence > bestByCard[decoded.cardId].confidence) {
               bestByCard[decoded.cardId] = decoded;
          }
     });

     return Object.keys(bestByCard)
          .map(function(cardId) { return bestByCard[cardId]; })
          .sort(function(a, b) { return b.confidence - a.confidence; });
}

/* ---------------------------------------------- 
     V59 Stable Detections
----------------------------------------------  */
function strictStableDetections(detections) {
     const now = Date.now();
     const stable = [];

     Object.keys(scannerV59SeenMemory).forEach(function(key) {
          if (now - scannerV59SeenMemory[key].lastSeen > SCANNER_V59_CONFIRM_MS) {
               delete scannerV59SeenMemory[key];
          }
     });

     (detections || []).forEach(function(item) {
          const cardId = normalizeCardId(item.cardId);
          const key = `${cardId}-${item.answer}`;
          const previous = scannerV59SeenMemory[key];
          const count = previous && now - previous.lastSeen < SCANNER_V59_CONFIRM_MS ? previous.count + 1 : 1;
          const strongest = previous ? Math.max(previous.confidence || 0, item.confidence || 0) : (item.confidence || 0);
          const box = item.box || previous && previous.box;

          scannerV59SeenMemory[key] = {
               count: count,
               confidence: strongest,
               firstSeen: previous ? previous.firstSeen : now,
               lastSeen: now,
               box: box
          };

          if (strongest >= SCANNER_V59_FAST_CONFIDENCE || (count >= 2 && strongest >= SCANNER_V59_SECOND_FRAME_CONFIDENCE)) {
               item.confidence = strongest;
               item.box = box;
               stable.push(item);
          }
     });

     return stable;
}

/* ---------------------------------------------- 
     Scan Confirmed Fast
----------------------------------------------  */
function scanConfirmedFast(cardId, answer, confidence) {
     const key = normalizeCardId(cardId);
     const now = Date.now();
     const previous = scanConfirmMemory[key];
     scanConfirmMemory[key] = { answer: answer, confidence: confidence || 0, time: now };

     if ((confidence || 0) >= SCANNER_V59_FAST_CONFIDENCE) { return true; }
     if (previous && previous.answer == answer && now - previous.time < SCANNER_V59_CONFIRM_MS) { return true; }
     return false;
}

/* ---------------------------------------------- 
     Scan Current Frame
----------------------------------------------  */
async function scanCurrentFrame() {
     if (!elVideo || elVideo.readyState < 2) { return; }

     const work = scannerWorkCanvas;
     const ctx = work.getContext("2d", { willReadFrequently: true });
     const sourceW = elVideo.videoWidth || 1280;
     const sourceH = elVideo.videoHeight || 720;
     work.width = Math.min(SCANNER_V59_MAX_WORK_WIDTH, sourceW);
     work.height = Math.round(sourceH * (work.width / sourceW));
     ctx.imageSmoothingEnabled = false;
     ctx.drawImage(elVideo, 0, 0, work.width, work.height);
     syncScannerOverlaySize(work.width, work.height);

     const rawDetections = detectQCardsFromCanvas(work);
     const stableDetections = strictStableDetections(rawDetections);
     drawScannerOverlay(stableDetections);

     if (stableDetections.length) {
          handleDetectedCodes(stableDetections, "phone-camera-6x6-v59");
     }
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
          await refreshScannerSessionCache(true);
          await refreshScannerResponses(true);
          startScannerDataPolling();
          scannerStream = await navigator.mediaDevices.getUserMedia({
               video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 60, min: 24 }
               },
               audio: false
          });
          elVideo.srcObject = scannerStream;
          elVideo.setAttribute("playsinline", "");
          elVideo.setAttribute("webkit-playsinline", "");
          await elVideo.play();
          if (btnStartCamera) { btnStartCamera.textContent = "Scanning 6×6"; }
          setStatus("Scanner active. It now only accepts a real printed Q-card marker: dark square, white paper border, and exact 6×6 pattern.", false);
          startLoop();
     }
     catch (error) {
          if (btnStartCamera) { btnStartCamera.disabled = false; btnStartCamera.textContent = "Start Camera"; }
          setStatus(`Camera could not start: ${error.message || "permission blocked"}. Use manual backup.`, true);
     }
}

/* ---------------------------------------------- 
     V60 Faster Bend-Tolerant Q-Card Scanner
----------------------------------------------  */

var scannerV60SeenMemory = scannerV60SeenMemory || {};
var SCANNER_V60_MAX_WORK_WIDTH = 1020;
var SCANNER_V60_CONFIRM_MS = 460;
var SCANNER_V60_FAST_CONFIDENCE = 72;
var SCANNER_V60_SECOND_FRAME_CONFIDENCE = 34;
var SCANNER_V60_MIN_SIDE_RATIO = 0.064;

/* ---------------------------------------------- 
     V60 Printed Marker Candidate Check
----------------------------------------------  */
function scannerV59BoxLooksLikePrintedMarker(box, width, height) {
     if (!box) { return false; }
     const side = Math.min(box.w, box.h);
     const ratio = box.w / Math.max(1, box.h);
     const frameMin = Math.min(width, height);
     const frameMax = Math.max(width, height);

     if (side < Math.max(54, frameMin * SCANNER_V60_MIN_SIDE_RATIO)) { return false; }
     if (side > frameMax * 0.86) { return false; }
     if (ratio < 0.56 || ratio > 1.78) { return false; }
     if (typeof box.fill == "number" && box.fill > 0 && (box.fill < 0.22 || box.fill > 0.96)) { return false; }
     return true;
}

/* ---------------------------------------------- 
     V60 Average Cell For Bent Paper
----------------------------------------------  */
function scannerV60SampleBentCell(imageData, width, height, box, rx, ry, radius, step) {
     const offsets = [
          [0, 0],
          [-step, 0], [step, 0],
          [0, -step], [0, step],
          [-step * .72, -step * .72], [step * .72, -step * .72],
          [-step * .72, step * .72], [step * .72, step * .72]
     ];
     const samples = offsets.map(function(offset) {
          return scannerV59SampleRelative(
               imageData,
               width,
               height,
               box,
               rx + offset[0],
               ry + offset[1],
               radius
          );
     }).sort(function(a, b) { return a - b; });

     /* A trimmed average is more tolerant when a bent sheet shifts the cell slightly. */
     return scannerAverageNumbers(samples.slice(2, 7));
}

/* ---------------------------------------------- 
     V60 Read Grid From Printed Marker
----------------------------------------------  */
function readGridFromCandidateDetailed(imageData, width, height, box) {
     const pad = 0.086;
     const gap = 0.04;
     const cell = (1 - (pad * 2) - (gap * 5)) / 6;
     const sampleRadius = Math.max(2, Math.min(7, Math.round(Math.min(box.w, box.h) * cell * 0.105)));
     const bendStep = Math.min(cell * .22, .024);
     const values = [];
     const gridValues = [];

     for (let row = 0; row < 6; row += 1) {
          const line = [];
          for (let col = 0; col < 6; col += 1) {
               const rx = pad + (cell / 2) + col * (cell + gap);
               const ry = pad + (cell / 2) + row * (cell + gap);
               const value = scannerV60SampleBentCell(imageData, width, height, box, rx, ry, sampleRadius, bendStep);
               values.push(value);
               line.push(value);
          }
          gridValues.push(line);
     }

     const sorted = values.slice().sort(function(a, b) { return a - b; });
     const lowAvg = scannerAverageNumbers(sorted.slice(0, 13));
     const highAvg = scannerAverageNumbers(sorted.slice(-11));
     const contrast = highAvg - lowAvg;
     const threshold = contrast >= 18 ? (lowAvg + highAvg) / 2 : Math.max(118, lowAvg + 14);
     const boolGrid = gridValues.map(function(row) {
          return row.map(function(value) { return value > threshold; });
     });

     const backgroundSamples = [];
     const gapCenters = [];
     for (let i = 0; i <= 6; i += 1) {
          const p = i === 0 ? pad / 2 : i === 6 ? 1 - pad / 2 : pad + (i * cell) + ((i - 0.5) * gap);
          gapCenters.push(scannerV59Clamp(p, 0.018, 0.982));
     }
     gapCenters.forEach(function(rx) {
          gapCenters.forEach(function(ry) {
               backgroundSamples.push(scannerV59SampleRelative(imageData, width, height, box, rx, ry, sampleRadius));
          });
     });

     const outsideSamples = [
          [-0.045, 0.25], [-0.045, 0.5], [-0.045, 0.75],
          [1.045, 0.25], [1.045, 0.5], [1.045, 0.75],
          [0.25, -0.045], [0.5, -0.045], [0.75, -0.045],
          [0.25, 1.045], [0.5, 1.045], [0.75, 1.045]
     ].map(function(point) {
          return scannerV59SampleRelative(imageData, width, height, box, point[0], point[1], sampleRadius);
     });

     const backgroundAvg = scannerAverageNumbers(backgroundSamples);
     const outsideAvg = scannerAverageNumbers(outsideSamples);
     const darkBackgroundCount = backgroundSamples.filter(function(value) {
          return value < Math.min(170, threshold + 8);
     }).length;
     const brightOutsideCount = outsideSamples.filter(function(value) {
          return value > Math.max(132, backgroundAvg + 24);
     }).length;

     return {
          grid: boolGrid,
          values: gridValues,
          threshold: threshold,
          contrast: contrast,
          lowAvg: lowAvg,
          highAvg: highAvg,
          backgroundAvg: backgroundAvg,
          outsideAvg: outsideAvg,
          darkBackgroundRatio: darkBackgroundCount / Math.max(1, backgroundSamples.length),
          brightOutsideRatio: brightOutsideCount / Math.max(1, outsideSamples.length),
          borderDarkness: backgroundAvg,
          box: box
     };
}

/* ---------------------------------------------- 
     V60 Pattern Score From Continuous Values
----------------------------------------------  */
function scannerV60ExpectedPatternScore(values, threshold, expected) {
     let mismatch = 0;
     let weak = 0;
     let strong = 0;
     let marginTotal = 0;

     for (let row = 0; row < 6; row += 1) {
          for (let col = 0; col < 6; col += 1) {
               const expectedWhite = !!expected[row][col];
               const value = values[row][col];
               const margin = expectedWhite ? value - threshold : threshold - value;
               marginTotal += margin;
               if (margin < -2) { mismatch += 1; }
               if (margin < 6) { weak += 1; }
               if (margin > 14) { strong += 1; }
          }
     }

     return {
          mismatch: mismatch,
          weak: weak,
          strong: strong,
          averageMargin: marginTotal / 36
     };
}

/* ---------------------------------------------- 
     V60 Candidate Values Are Card-Like
----------------------------------------------  */
function scannerV60DetailLooksCardLike(detail) {
     if (!detail) { return false; }
     if (detail.contrast < 13) { return false; }
     if (detail.highAvg < detail.lowAvg + 12) { return false; }

     /* Keep the paper-border idea, but make it tolerant of shadows, yellow walls and fingers. */
     if (detail.backgroundAvg > 190 && detail.contrast < 24) { return false; }
     if (detail.darkBackgroundRatio < 0.34 && detail.contrast < 24) { return false; }
     if (detail.brightOutsideRatio < 0.12 && detail.outsideAvg < detail.backgroundAvg + 14 && detail.contrast < 28) { return false; }
     return true;
}

/* ---------------------------------------------- 
     V60 Decode By Searching Every Valid Card Pattern
----------------------------------------------  */
function decodeQCardDetailedStrict(detail) {
     if (!detail || !detail.grid || !scannerV60DetailLooksCardLike(detail)) { return null; }

     const answersByRotation = ["A", "B", "C", "D"];
     const validIds = getScannerValidCardIds();
     const rosterIds = Object.keys(validIds);
     const valueList = rosterIds.length
          ? rosterIds.map(function(cardId) { return Math.max(0, Math.min(SCANNER_MAX_CARDS - 1, Number(String(cardId).replace(/\D/g, "")) - 1)); })
          : Array.from({ length: SCANNER_MAX_CARDS }, function(_, index) { return index; });
     let best = null;

     for (let rotation = 0; rotation < 4; rotation += 1) {
          const values = rotateGrid(detail.values, rotation);
          const grid = rotateGrid(detail.grid, rotation);
          const orientationConfidence = qCardOrientationScore(grid);

          valueList.forEach(function(value) {
               if (value < 0 || value >= SCANNER_MAX_CARDS) { return; }
               const cardId = `P${String(value + 1).padStart(2, "0")}`;
               if (rosterIds.length && !validIds[cardId]) { return; }

               const expected = scannerV58ExpectedGridFromValue(value);
               const pattern = scannerV60ExpectedPatternScore(values, detail.threshold, expected);
               const mismatchLimit = detail.contrast >= 30 ? 5 : 4;
               const weakLimit = detail.contrast >= 28 ? 18 : 14;

               if (pattern.mismatch > mismatchLimit) { return; }
               if (pattern.weak > weakLimit) { return; }
               if (pattern.strong < 14 && detail.contrast < 22) { return; }

               const confidence = 96
                    - (pattern.mismatch * 12)
                    - (pattern.weak * 1.8)
                    + Math.round(Math.max(0, pattern.averageMargin) * 2.4)
                    + Math.round(detail.contrast * 1.4)
                    + Math.round(orientationConfidence * 1.1);

               const decoded = {
                    cardId: cardId,
                    answer: answersByRotation[rotation],
                    confidence: confidence,
                    rotation: rotation,
                    box: detail.box,
                    mismatch: pattern.mismatch,
                    weak: pattern.weak,
                    bendTolerant: true
               };

               if (!best || decoded.confidence > best.confidence) { best = decoded; }
          });
     }

     return best;
}

/* ---------------------------------------------- 
     V60 Find 6x6 Q-Card Candidates
----------------------------------------------  */
function findQCardCandidates(imageData, width, height) {
     const adaptive = scannerAdaptiveDarkThreshold(imageData);
     const thresholdSet = {};
     const rawThresholds = [
          Math.round(adaptive - 18),
          Math.round(adaptive - 6),
          Math.round(adaptive + 8),
          Math.round(adaptive + 22),
          118,
          146
     ];
     const candidates = [];

     rawThresholds.forEach(function(value) {
          const threshold = scannerV59Clamp(Math.round(value), 72, 188);
          thresholdSet[threshold] = true;
     });

     Object.keys(thresholdSet).map(Number).forEach(function(threshold) {
          scannerV59FindCandidatesAtThreshold(imageData, width, height, threshold).forEach(function(box) {
               scannerV59AddCandidate(candidates, box, width, height);
          });
     });

     return candidates.sort(function(a, b) { return (b.area || 0) - (a.area || 0); }).slice(0, 26);
}

/* ---------------------------------------------- 
     V60 Stable Detections
----------------------------------------------  */
function strictStableDetections(detections) {
     const now = Date.now();
     const stable = [];

     Object.keys(scannerV60SeenMemory).forEach(function(key) {
          if (now - scannerV60SeenMemory[key].lastSeen > SCANNER_V60_CONFIRM_MS) {
               delete scannerV60SeenMemory[key];
          }
     });

     (detections || []).forEach(function(item) {
          const cardId = normalizeCardId(item.cardId);
          const key = `${cardId}-${item.answer}`;
          const previous = scannerV60SeenMemory[key];
          const count = previous && now - previous.lastSeen < SCANNER_V60_CONFIRM_MS ? previous.count + 1 : 1;
          const strongest = previous ? Math.max(previous.confidence || 0, item.confidence || 0) : (item.confidence || 0);
          const box = item.box || previous && previous.box;

          scannerV60SeenMemory[key] = {
               count: count,
               confidence: strongest,
               firstSeen: previous ? previous.firstSeen : now,
               lastSeen: now,
               box: box
          };

          if (strongest >= SCANNER_V60_FAST_CONFIDENCE || (count >= 2 && strongest >= SCANNER_V60_SECOND_FRAME_CONFIDENCE)) {
               item.confidence = strongest;
               item.box = box;
               stable.push(item);
          }
     });

     return stable;
}

/* ---------------------------------------------- 
     V60 Scan Confirmed Fast
----------------------------------------------  */
function scanConfirmedFast(cardId, answer, confidence) {
     const key = normalizeCardId(cardId);
     const now = Date.now();
     const previous = scanConfirmMemory[key];
     scanConfirmMemory[key] = { answer: answer, confidence: confidence || 0, time: now };

     if ((confidence || 0) >= SCANNER_V60_FAST_CONFIDENCE) { return true; }
     if (previous && previous.answer == answer && now - previous.time < SCANNER_V60_CONFIRM_MS) { return true; }
     return false;
}

/* ---------------------------------------------- 
     V60 Scan Current Frame
----------------------------------------------  */
async function scanCurrentFrame() {
     if (!elVideo || elVideo.readyState < 2) { return; }

     const work = scannerWorkCanvas;
     const ctx = work.getContext("2d", { willReadFrequently: true });
     const sourceW = elVideo.videoWidth || 1280;
     const sourceH = elVideo.videoHeight || 720;
     work.width = Math.min(SCANNER_V60_MAX_WORK_WIDTH, sourceW);
     work.height = Math.round(sourceH * (work.width / sourceW));
     ctx.imageSmoothingEnabled = false;
     ctx.drawImage(elVideo, 0, 0, work.width, work.height);
     syncScannerOverlaySize(work.width, work.height);

     const rawDetections = detectQCardsFromCanvas(work);
     const stableDetections = strictStableDetections(rawDetections);
     drawScannerOverlay(stableDetections);

     if (stableDetections.length) {
          handleDetectedCodes(stableDetections, "phone-camera-6x6-v60-bend-fast");
     }
}

/* ---------------------------------------------- 
     V60 Start Camera
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
          await refreshScannerSessionCache(true);
          await refreshScannerResponses(true);
          startScannerDataPolling();
          scannerStream = await navigator.mediaDevices.getUserMedia({
               video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 60, min: 24 }
               },
               audio: false
          });
          elVideo.srcObject = scannerStream;
          elVideo.setAttribute("playsinline", "");
          elVideo.setAttribute("webkit-playsinline", "");
          await elVideo.play();
          if (btnStartCamera) { btnStartCamera.textContent = "Scanning 6×6"; }
          setStatus("Faster bend-tolerant scanner active. It checks every valid card pattern and accepts slightly curved or shadowed paper.", false);
          startLoop();
     }
     catch (error) {
          if (btnStartCamera) { btnStartCamera.disabled = false; btnStartCamera.textContent = "Start Camera"; }
          setStatus(`Camera could not start: ${error.message || "permission blocked"}. Use manual backup.`, true);
     }
}

/* ---------------------------------------------- 
     V61 Sensitive Scanner + Correct Rotation Preview
----------------------------------------------  */

var scannerV61SeenMemory = scannerV61SeenMemory || {};
var SCANNER_V61_MAX_WORK_WIDTH = 1120;
var SCANNER_V61_CONFIRM_MS = 380;
var SCANNER_V61_FAST_CONFIDENCE = 48;
var SCANNER_V61_SECOND_FRAME_CONFIDENCE = 20;
var SCANNER_V61_MIN_SIDE_RATIO = 0.038;

/* ---------------------------------------------- 
     V61 More Forgiving Marker Candidate Check
----------------------------------------------  */
function scannerV59BoxLooksLikePrintedMarker(box, width, height) {
     if (!box) { return false; }
     const side = Math.min(box.w, box.h);
     const ratio = box.w / Math.max(1, box.h);
     const frameMin = Math.min(width, height);
     const frameMax = Math.max(width, height);

     if (side < Math.max(30, frameMin * SCANNER_V61_MIN_SIDE_RATIO)) { return false; }
     if (side > frameMax * 0.92) { return false; }
     if (ratio < 0.46 || ratio > 2.18) { return false; }
     if (typeof box.fill == "number" && box.fill > 0 && (box.fill < 0.10 || box.fill > 0.992)) { return false; }
     return true;
}

/* ---------------------------------------------- 
     V61 Rotated Relative Sample
----------------------------------------------  */
function scannerV61SampleRotatedRelative(imageData, width, height, box, rx, ry, radius, angleRad, actualSide) {
     const cx = box.x + box.w / 2;
     const cy = box.y + box.h / 2;
     const side = actualSide || Math.min(box.w, box.h);
     const lx = (rx - .5) * side;
     const ly = (ry - .5) * side;
     const cos = Math.cos(angleRad || 0);
     const sin = Math.sin(angleRad || 0);
     const sx = cx + lx * cos - ly * sin;
     const sy = cy + lx * sin + ly * cos;
     return scannerV59SamplePatch(imageData, width, height, sx, sy, radius);
}

/* ---------------------------------------------- 
     V61 Read Grid Variant With Small Tilt Correction
----------------------------------------------  */
function scannerV61ReadGridVariant(imageData, width, height, box, angleDeg) {
     const pad = 0.086;
     const gap = 0.04;
     const cell = (1 - (pad * 2) - (gap * 5)) / 6;
     const angleRad = angleDeg * Math.PI / 180;
     const absAngle = Math.abs(angleRad);
     const sideFactor = Math.max(.70, Math.cos(absAngle) + Math.sin(absAngle));
     const actualSide = Math.min(box.w, box.h) / sideFactor;
     const sampleRadius = Math.max(1, Math.min(6, Math.round(actualSide * cell * 0.095)));
     const bendStep = Math.min(cell * .25, .026);
     const values = [];
     const gridValues = [];

     for (let row = 0; row < 6; row += 1) {
          const line = [];
          for (let col = 0; col < 6; col += 1) {
               const rx = pad + (cell / 2) + col * (cell + gap);
               const ry = pad + (cell / 2) + row * (cell + gap);
               const samples = [
                    scannerV61SampleRotatedRelative(imageData, width, height, box, rx, ry, sampleRadius, angleRad, actualSide),
                    scannerV61SampleRotatedRelative(imageData, width, height, box, rx - bendStep, ry, sampleRadius, angleRad, actualSide),
                    scannerV61SampleRotatedRelative(imageData, width, height, box, rx + bendStep, ry, sampleRadius, angleRad, actualSide),
                    scannerV61SampleRotatedRelative(imageData, width, height, box, rx, ry - bendStep, sampleRadius, angleRad, actualSide),
                    scannerV61SampleRotatedRelative(imageData, width, height, box, rx, ry + bendStep, sampleRadius, angleRad, actualSide)
               ].sort(function(a, b) { return a - b; });
               const value = scannerAverageNumbers(samples.slice(1, 4));
               values.push(value);
               line.push(value);
          }
          gridValues.push(line);
     }

     const sorted = values.slice().sort(function(a, b) { return a - b; });
     const lowAvg = scannerAverageNumbers(sorted.slice(0, 13));
     const highAvg = scannerAverageNumbers(sorted.slice(-11));
     const contrast = highAvg - lowAvg;
     const threshold = contrast >= 14 ? (lowAvg + highAvg) / 2 : Math.max(112, lowAvg + 12);
     const boolGrid = gridValues.map(function(row) {
          return row.map(function(value) { return value > threshold; });
     });

     const backgroundSamples = [];
     const gapCenters = [];
     for (let i = 0; i <= 6; i += 1) {
          const p = i === 0 ? pad / 2 : i === 6 ? 1 - pad / 2 : pad + (i * cell) + ((i - 0.5) * gap);
          gapCenters.push(scannerV59Clamp(p, 0.018, 0.982));
     }
     gapCenters.forEach(function(rx) {
          gapCenters.forEach(function(ry) {
               backgroundSamples.push(scannerV61SampleRotatedRelative(imageData, width, height, box, rx, ry, sampleRadius, angleRad, actualSide));
          });
     });

     const backgroundAvg = scannerAverageNumbers(backgroundSamples);
     const darkBackgroundCount = backgroundSamples.filter(function(value) {
          return value < Math.min(172, threshold + 10);
     }).length;

     return {
          grid: boolGrid,
          values: gridValues,
          threshold: threshold,
          contrast: contrast,
          lowAvg: lowAvg,
          highAvg: highAvg,
          backgroundAvg: backgroundAvg,
          outsideAvg: backgroundAvg + 20,
          darkBackgroundRatio: darkBackgroundCount / Math.max(1, backgroundSamples.length),
          brightOutsideRatio: .25,
          borderDarkness: backgroundAvg,
          sampleAngle: angleDeg,
          box: box
     };
}

/* ---------------------------------------------- 
     V61 Pattern Score
----------------------------------------------  */
function scannerV61ExpectedPatternScore(values, threshold, expected) {
     let mismatch = 0;
     let weak = 0;
     let strong = 0;
     let marginTotal = 0;

     for (let row = 0; row < 6; row += 1) {
          for (let col = 0; col < 6; col += 1) {
               const expectedWhite = !!expected[row][col];
               const value = values[row][col];
               const margin = expectedWhite ? value - threshold : threshold - value;
               marginTotal += margin;
               if (margin < -3) { mismatch += 1; }
               if (margin < 5) { weak += 1; }
               if (margin > 10) { strong += 1; }
          }
     }

     return {
          mismatch: mismatch,
          weak: weak,
          strong: strong,
          averageMargin: marginTotal / 36
     };
}

/* ---------------------------------------------- 
     V61 Card-Like Detail Check
----------------------------------------------  */
function scannerV61DetailLooksCardLike(detail) {
     if (!detail) { return false; }
     if (detail.contrast < 9) { return false; }
     if (detail.highAvg < detail.lowAvg + 9) { return false; }
     if (detail.darkBackgroundRatio < 0.18 && detail.contrast < 22) { return false; }
     return true;
}

/* ---------------------------------------------- 
     V61 Decode With Rotation Chosen From Best Pattern Match
----------------------------------------------  */
function decodeQCardDetailedStrict(detail) {
     if (!detail || !detail.grid || !scannerV61DetailLooksCardLike(detail)) { return null; }

     const answersByRotation = ["A", "B", "C", "D"];
     const validIds = getScannerValidCardIds();
     const rosterIds = Object.keys(validIds);
     const valueList = rosterIds.length
          ? rosterIds.map(function(cardId) { return Math.max(0, Math.min(SCANNER_MAX_CARDS - 1, Number(String(cardId).replace(/\D/g, "")) - 1)); })
          : Array.from({ length: SCANNER_MAX_CARDS }, function(_, index) { return index; });
     let best = null;

     for (let rotation = 0; rotation < 4; rotation += 1) {
          const values = rotateGrid(detail.values, rotation);
          const grid = rotateGrid(detail.grid, rotation);
          const orientationConfidence = qCardOrientationScore(grid);

          valueList.forEach(function(value) {
               if (value < 0 || value >= SCANNER_MAX_CARDS) { return; }
               const cardId = `P${String(value + 1).padStart(2, "0")}`;
               if (rosterIds.length && !validIds[cardId]) { return; }

               const expected = scannerV58ExpectedGridFromValue(value);
               const pattern = scannerV61ExpectedPatternScore(values, detail.threshold, expected);
               const mismatchLimit = detail.contrast >= 28 ? 8 : detail.contrast >= 18 ? 7 : 6;
               const weakLimit = detail.contrast >= 28 ? 24 : detail.contrast >= 18 ? 22 : 19;

               if (pattern.mismatch > mismatchLimit) { return; }
               if (pattern.weak > weakLimit) { return; }
               if (pattern.strong < 7 && detail.contrast < 17) { return; }

               const confidence = 72
                    - (pattern.mismatch * 8)
                    - (pattern.weak * 1.15)
                    + Math.round(Math.max(0, pattern.averageMargin) * 2.15)
                    + Math.round(detail.contrast * 1.55)
                    + Math.round(pattern.strong * 1.4)
                    + Math.round(orientationConfidence * .65);

               const decoded = {
                    cardId: cardId,
                    answer: answersByRotation[rotation],
                    confidence: confidence,
                    rotation: rotation,
                    box: detail.box,
                    mismatch: pattern.mismatch,
                    weak: pattern.weak,
                    sampleAngle: detail.sampleAngle || 0,
                    sensitive: true
               };

               if (!best || decoded.confidence > best.confidence) { best = decoded; }
          });
     }

     return best;
}

/* ---------------------------------------------- 
     V61 Candidate Add
----------------------------------------------  */
function scannerV61AddCandidate(list, box, width, height) {
     const candidate = scannerV59ClampBox(box, width, height);
     if (!scannerV59BoxLooksLikePrintedMarker(candidate, width, height)) { return; }

     for (let i = 0; i < list.length; i += 1) {
          if (scannerV57BoxesOverlap && scannerV57BoxesOverlap(list[i], candidate)) {
               const oldScore = (list[i].area || 0) * Math.max(.18, list[i].fill || 0.5);
               const newScore = (candidate.area || 0) * Math.max(.18, candidate.fill || 0.5);
               if (newScore > oldScore) { list[i] = candidate; }
               return;
          }
     }

     list.push(candidate);
}

/* ---------------------------------------------- 
     V61 Add Center Fallbacks
----------------------------------------------  */
function scannerV61AddCenterFallbackCandidates(candidates, width, height) {
     const sideBase = Math.min(width, height);
     [0.76, 0.62, 0.50, 0.39, 0.30].forEach(function(ratio) {
          const side = Math.round(sideBase * ratio);
          scannerV61AddCandidate(candidates, {
               x: Math.round((width - side) / 2),
               y: Math.round((height - side) / 2),
               w: side,
               h: side,
               area: side * side,
               fill: .5
          }, width, height);
     });
}

/* ---------------------------------------------- 
     V61 Find Candidates
----------------------------------------------  */
function findQCardCandidates(imageData, width, height) {
     const adaptive = scannerAdaptiveDarkThreshold(imageData);
     const thresholdSet = {};
     const rawThresholds = [
          adaptive - 26,
          adaptive - 14,
          adaptive - 4,
          adaptive + 8,
          adaptive + 22,
          adaptive + 38,
          96,
          118,
          138,
          160,
          182
     ];
     const candidates = [];

     rawThresholds.forEach(function(value) {
          thresholdSet[scannerV59Clamp(Math.round(value), 62, 206)] = true;
     });

     Object.keys(thresholdSet).map(Number).forEach(function(threshold) {
          scannerV59FindCandidatesAtThreshold(imageData, width, height, threshold).forEach(function(box) {
               scannerV61AddCandidate(candidates, box, width, height);
          });
     });

     scannerV61AddCenterFallbackCandidates(candidates, width, height);
     return candidates.sort(function(a, b) { return (b.area || 0) - (a.area || 0); }).slice(0, 36);
}

/* ---------------------------------------------- 
     V61 Detect Q-Cards From Canvas
----------------------------------------------  */
function detectQCardsFromCanvas(canvas) {
     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
     const candidates = findQCardCandidates(imageData, canvas.width, canvas.height);
     const bestByCard = {};
     const tiltAngles = [-16, -10, -5, 0, 5, 10, 16];

     candidates.forEach(function(box) {
          let bestForBox = null;
          tiltAngles.forEach(function(angle) {
               const detail = scannerV61ReadGridVariant(imageData, canvas.width, canvas.height, box, angle);
               const decoded = decodeQCardDetailedStrict(detail);
               if (!decoded) { return; }
               if (!bestForBox || decoded.confidence > bestForBox.confidence) { bestForBox = decoded; }
          });
          if (!bestForBox) { return; }
          if (!bestByCard[bestForBox.cardId] || bestForBox.confidence > bestByCard[bestForBox.cardId].confidence) {
               bestByCard[bestForBox.cardId] = bestForBox;
          }
     });

     return Object.keys(bestByCard)
          .map(function(cardId) { return bestByCard[cardId]; })
          .sort(function(a, b) { return b.confidence - a.confidence; });
}

/* ---------------------------------------------- 
     V61 Stable Detections
----------------------------------------------  */
function strictStableDetections(detections) {
     const now = Date.now();
     const stable = [];

     Object.keys(scannerV61SeenMemory).forEach(function(key) {
          if (now - scannerV61SeenMemory[key].lastSeen > SCANNER_V61_CONFIRM_MS) {
               delete scannerV61SeenMemory[key];
          }
     });

     (detections || []).forEach(function(item) {
          const cardId = normalizeCardId(item.cardId);
          const key = `${cardId}-${item.answer}`;
          const previous = scannerV61SeenMemory[key];
          const count = previous && now - previous.lastSeen < SCANNER_V61_CONFIRM_MS ? previous.count + 1 : 1;
          const strongest = previous ? Math.max(previous.confidence || 0, item.confidence || 0) : (item.confidence || 0);
          const box = item.box || previous && previous.box;

          scannerV61SeenMemory[key] = {
               count: count,
               confidence: strongest,
               firstSeen: previous ? previous.firstSeen : now,
               lastSeen: now,
               box: box
          };

          if (strongest >= SCANNER_V61_FAST_CONFIDENCE || (count >= 2 && strongest >= SCANNER_V61_SECOND_FRAME_CONFIDENCE)) {
               item.confidence = strongest;
               item.box = box;
               stable.push(item);
          }
     });

     return stable;
}

/* ---------------------------------------------- 
     V61 Scan Confirmed Fast
----------------------------------------------  */
function scanConfirmedFast(cardId, answer, confidence) {
     const key = normalizeCardId(cardId);
     const now = Date.now();
     const previous = scanConfirmMemory[key];
     scanConfirmMemory[key] = { answer: answer, confidence: confidence || 0, time: now };

     if ((confidence || 0) >= SCANNER_V61_FAST_CONFIDENCE) { return true; }
     if (previous && previous.answer == answer && now - previous.time < SCANNER_V61_CONFIRM_MS) { return true; }
     return false;
}

/* ---------------------------------------------- 
     V61 Detection State Shows Detected Orientation
----------------------------------------------  */
function scannerDetectionState(cardId, answer) {
     const questionIndex = scannerCurrentQuestionIndex();
     const normalized = normalizeCardId(cardId);
     const key = scannerResponseKey(questionIndex, normalized);
     const pending = scannerPendingAck[key];
     const recorded = scannerResponsesCache[normalized];

     if (pending) {
          return { state: "new", label: "NEW!", answer: pending.answer || answer, color: "#ffe04a", fill: "rgba(255, 224, 74, .96)", text: "#123865" };
     }
     if (recorded) {
          const saved = recorded.answer || answer;
          const label = saved == answer ? "OK" : `OK ${saved} saved`;
          return { state: "ok", label: label, answer: answer, color: "#45d66b", fill: "rgba(69, 214, 107, .96)", text: "#123865" };
     }
     return { state: "ready", label: "READY", answer: answer, color: "#62c8ff", fill: "rgba(18, 56, 101, .94)", text: "#ffffff" };
}

/* ---------------------------------------------- 
     V61 Scan Current Frame
----------------------------------------------  */
async function scanCurrentFrame() {
     if (!elVideo || elVideo.readyState < 2) { return; }

     const work = scannerWorkCanvas;
     const ctx = work.getContext("2d", { willReadFrequently: true });
     const sourceW = elVideo.videoWidth || 1280;
     const sourceH = elVideo.videoHeight || 720;
     work.width = Math.min(SCANNER_V61_MAX_WORK_WIDTH, sourceW);
     work.height = Math.round(sourceH * (work.width / sourceW));
     ctx.imageSmoothingEnabled = false;
     ctx.drawImage(elVideo, 0, 0, work.width, work.height);
     syncScannerOverlaySize(work.width, work.height);

     const rawDetections = detectQCardsFromCanvas(work);
     const stableDetections = strictStableDetections(rawDetections);
     drawScannerOverlay(stableDetections.length ? stableDetections : rawDetections);

     if (stableDetections.length) {
          handleDetectedCodes(stableDetections, "phone-camera-6x6-v61-sensitive-rotation");
     }
}

/* ---------------------------------------------- 
     V61 Start Camera
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
          await refreshScannerSessionCache(true);
          await refreshScannerResponses(true);
          startScannerDataPolling();
          scannerStream = await navigator.mediaDevices.getUserMedia({
               video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 60, min: 24 }
               },
               audio: false
          });
          elVideo.srcObject = scannerStream;
          elVideo.setAttribute("playsinline", "");
          elVideo.setAttribute("webkit-playsinline", "");
          await elVideo.play();
          if (btnStartCamera) { btnStartCamera.textContent = "Scanning 6×6"; }
          setStatus("Sensitive rotation scanner active. It checks small paper tilt/bend and shows the currently detected option; tap a saved card to update it.", false);
          startLoop();
     }
     catch (error) {
          if (btnStartCamera) { btnStartCamera.disabled = false; btnStartCamera.textContent = "Start Camera"; }
          setStatus(`Camera could not start: ${error.message || "permission blocked"}. Use manual backup.`, true);
     }
}

/* ---------------------------------------------- 
     V62 Flexible Scanner + Reliable Game Confirmation
----------------------------------------------  */

var scannerV62SeenMemory = scannerV62SeenMemory || {};
var scannerV62PostAckTimers = scannerV62PostAckTimers || {};
var SCANNER_V62_MAX_WORK_WIDTH = 1180;
var SCANNER_V62_CONFIRM_MS = 260;
var SCANNER_V62_FAST_CONFIDENCE = 31;
var SCANNER_V62_SECOND_FRAME_CONFIDENCE = 7;
var SCANNER_V62_MIN_SIDE_RATIO = 0.024;
var SCANNER_V62_POLL_MS = 170;

/* ---------------------------------------------- 
     V62 Clamp Box
----------------------------------------------  */
function scannerV62ClampBox(box, width, height) {
     const x = Math.max(0, Math.min(width - 1, Math.round(box.x || 0)));
     const y = Math.max(0, Math.min(height - 1, Math.round(box.y || 0)));
     const right = Math.max(x + 1, Math.min(width, Math.round((box.x || 0) + (box.w || 1))));
     const bottom = Math.max(y + 1, Math.min(height, Math.round((box.y || 0) + (box.h || 1))));
     return {
          x: x,
          y: y,
          w: right - x,
          h: bottom - y,
          area: box.area || ((right - x) * (bottom - y)),
          fill: typeof box.fill == "number" ? box.fill : .5,
          threshold: box.threshold
     };
}

/* ---------------------------------------------- 
     V62 Flexible Marker Shape Check
----------------------------------------------  */
function scannerV62BoxLooksFlexible(box, width, height) {
     if (!box) { return false; }
     const side = Math.min(box.w, box.h);
     const ratio = box.w / Math.max(1, box.h);
     const frameMin = Math.min(width, height);
     const frameMax = Math.max(width, height);

     if (side < Math.max(20, frameMin * SCANNER_V62_MIN_SIDE_RATIO)) { return false; }
     if (side > frameMax * .92) { return false; }
     if (ratio < .48 || ratio > 2.08) { return false; }
     if (typeof box.fill == "number" && box.fill > 0 && (box.fill < .045 || box.fill > .985)) { return false; }
     return true;
}

/* ---------------------------------------------- 
     V62 Add Flexible Candidate
----------------------------------------------  */
function scannerV62AddCandidate(list, box, width, height) {
     const candidate = scannerV62ClampBox(box, width, height);
     if (!scannerV62BoxLooksFlexible(candidate, width, height)) { return; }

     for (let i = 0; i < list.length; i += 1) {
          if (scannerV57BoxesOverlap && scannerV57BoxesOverlap(list[i], candidate)) {
               const oldScore = (list[i].area || 0) * Math.max(.10, Math.min(.95, list[i].fill || .45));
               const newScore = (candidate.area || 0) * Math.max(.10, Math.min(.95, candidate.fill || .45));
               if (newScore > oldScore) { list[i] = candidate; }
               return;
          }
     }

     list.push(candidate);
}

/* ---------------------------------------------- 
     V62 Component Candidates At Threshold
----------------------------------------------  */
function scannerV62FindCandidatesAtThreshold(imageData, width, height, threshold) {
     const data = imageData.data;
     const total = width * height;
     const dark = new Uint8Array(total);
     const seen = new Uint8Array(total);
     const candidates = [];

     for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
          dark[pixel] = scannerLuminance(data, i) < threshold ? 1 : 0;
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
               const fill = area / Math.max(1, boxW * boxH);
               const grow = Math.max(2, Math.round(Math.min(boxW, boxH) * 0.026));

               scannerV62AddCandidate(candidates, {
                    x: minX - grow,
                    y: minY - grow,
                    w: boxW + grow * 2,
                    h: boxH + grow * 2,
                    area: area,
                    fill: fill,
                    threshold: threshold
               }, width, height);
          }
     }

     return candidates;
}

/* ---------------------------------------------- 
     V62 Add Center And Near Center Fallbacks
----------------------------------------------  */
function scannerV62AddFallbackCandidates(candidates, width, height) {
     const sideBase = Math.min(width, height);
     const shifts = [0, -.08, .08];
     [0.82, 0.70, 0.58, 0.46, 0.36, 0.27, 0.20].forEach(function(ratio) {
          const side = Math.round(sideBase * ratio);
          shifts.forEach(function(dx) {
               shifts.forEach(function(dy) {
                    if (Math.abs(dx) + Math.abs(dy) > .12) { return; }
                    scannerV62AddCandidate(candidates, {
                         x: Math.round((width - side) / 2 + dx * sideBase),
                         y: Math.round((height - side) / 2 + dy * sideBase),
                         w: side,
                         h: side,
                         area: side * side,
                         fill: .5
                    }, width, height);
               });
          });
     });
}

/* ---------------------------------------------- 
     V62 Find More Flexible Candidates
----------------------------------------------  */
function findQCardCandidates(imageData, width, height) {
     const adaptive = scannerAdaptiveDarkThreshold(imageData);
     const thresholdSet = {};
     const rawThresholds = [
          adaptive - 42,
          adaptive - 28,
          adaptive - 16,
          adaptive - 6,
          adaptive + 4,
          adaptive + 16,
          adaptive + 30,
          adaptive + 46,
          76,
          94,
          112,
          132,
          154,
          178,
          202
     ];
     const candidates = [];

     rawThresholds.forEach(function(value) {
          thresholdSet[scannerV59Clamp(Math.round(value), 52, 224)] = true;
     });

     Object.keys(thresholdSet).map(Number).forEach(function(threshold) {
          scannerV62FindCandidatesAtThreshold(imageData, width, height, threshold).forEach(function(box) {
               scannerV62AddCandidate(candidates, box, width, height);
          });
     });

     scannerV62AddFallbackCandidates(candidates, width, height);
     return candidates.sort(function(a, b) {
          const aScore = (a.area || 0) * Math.max(.12, Math.min(.92, a.fill || .45));
          const bScore = (b.area || 0) * Math.max(.12, Math.min(.92, b.fill || .45));
          return bScore - aScore;
     }).slice(0, 48);
}

/* ---------------------------------------------- 
     V62 Analog Orientation Anchor Score
----------------------------------------------  */
function scannerV62AnalogAnchorScore(values, threshold) {
     if (!values || !values[0]) { return -999; }
     let score = 0;
     const clamp = function(value) { return Math.max(-36, Math.min(52, value)); };
     const whiteCells = [[0,0],[0,1],[1,0]];
     const blackCells = [[1,1]];
     const quietCells = [
          [0,4],[0,5],[1,4],[1,5],
          [4,0],[4,1],[5,0],[5,1],
          [4,4],[4,5],[5,4],[5,5]
     ];

     whiteCells.forEach(function(cell) {
          score += clamp(values[cell[0]][cell[1]] - threshold) * 1.18;
     });
     blackCells.forEach(function(cell) {
          score += clamp(threshold - values[cell[0]][cell[1]]) * 1.28;
     });
     quietCells.forEach(function(cell) {
          score += clamp(threshold - values[cell[0]][cell[1]]) * .16;
     });

     return score;
}

/* ---------------------------------------------- 
     V62 Pattern Score With Margins
----------------------------------------------  */
function scannerV62ExpectedPatternScore(values, threshold, expected) {
     let mismatch = 0;
     let weak = 0;
     let strong = 0;
     let totalMargin = 0;
     let strongWrong = 0;

     for (let row = 0; row < 6; row += 1) {
          for (let col = 0; col < 6; col += 1) {
               const expectedWhite = !!expected[row][col];
               const value = values[row][col];
               const margin = expectedWhite ? value - threshold : threshold - value;
               totalMargin += margin;
               if (margin < 0) { mismatch += 1; }
               if (Math.abs(margin) < 4.5) { weak += 1; }
               if (margin > 12) { strong += 1; }
               if (margin < -16) { strongWrong += 1; }
          }
     }

     return {
          mismatch: mismatch,
          weak: weak,
          strong: strong,
          strongWrong: strongWrong,
          averageMargin: totalMargin / 36
     };
}

/* ---------------------------------------------- 
     V62 Detail Looks Flexible Enough
----------------------------------------------  */
function scannerV62DetailLooksCardLike(detail) {
     if (!detail || !detail.values) { return false; }
     if (detail.contrast < 4.5) { return false; }
     if (detail.highAvg < detail.lowAvg + 4.5) { return false; }
     if (detail.darkBackgroundRatio < .055 && detail.contrast < 13) { return false; }
     return true;
}

/* ---------------------------------------------- 
     V62 Decode With Stronger Rotation Choice
----------------------------------------------  */
function decodeQCardDetailedStrict(detail) {
     if (!scannerV62DetailLooksCardLike(detail)) { return null; }

     const answersByRotation = ["A", "B", "C", "D"];
     const validIds = getScannerValidCardIds();
     const rosterIds = Object.keys(validIds);
     const valueList = rosterIds.length
          ? rosterIds.map(function(cardId) { return Math.max(0, Math.min(SCANNER_MAX_CARDS - 1, Number(String(cardId).replace(/\D/g, "")) - 1)); })
          : Array.from({ length: SCANNER_MAX_CARDS }, function(_, index) { return index; });
     let best = null;
     let secondBest = null;

     for (let rotation = 0; rotation < 4; rotation += 1) {
          const values = rotateGrid(detail.values, rotation);
          const anchorAnalog = scannerV62AnalogAnchorScore(values, detail.threshold);
          if (anchorAnalog < -52 && detail.contrast < 20) { continue; }

          valueList.forEach(function(value) {
               if (value < 0 || value >= SCANNER_MAX_CARDS) { return; }
               const cardId = `P${String(value + 1).padStart(2, "0")}`;
               if (rosterIds.length && !validIds[cardId]) { return; }

               const expected = scannerV58ExpectedGridFromValue(value);
               const pattern = scannerV62ExpectedPatternScore(values, detail.threshold, expected);
               const mismatchLimit = detail.contrast >= 28 ? 13 : detail.contrast >= 17 ? 12 : 10;
               const weakLimit = detail.contrast >= 28 ? 34 : detail.contrast >= 17 ? 33 : 31;
               const wrongLimit = detail.contrast >= 18 ? 7 : 6;

               if (pattern.mismatch > mismatchLimit) { return; }
               if (pattern.weak > weakLimit) { return; }
               if (pattern.strongWrong > wrongLimit) { return; }
               if (pattern.strong < 5 && detail.contrast < 12) { return; }

               const confidence = 48
                    - (pattern.mismatch * 4.6)
                    - (pattern.weak * .42)
                    - (pattern.strongWrong * 5.2)
                    + Math.round(Math.max(-10, pattern.averageMargin) * 2.25)
                    + Math.round(detail.contrast * 1.72)
                    + Math.round(pattern.strong * 1.75)
                    + Math.round(anchorAnalog * .28);

               const decoded = {
                    cardId: cardId,
                    answer: answersByRotation[rotation],
                    confidence: confidence,
                    rotation: rotation,
                    box: detail.box,
                    mismatch: pattern.mismatch,
                    weak: pattern.weak,
                    strongWrong: pattern.strongWrong,
                    anchor: anchorAnalog,
                    sampleAngle: detail.sampleAngle || 0,
                    flexible: true
               };

               if (!best || decoded.confidence > best.confidence) {
                    secondBest = best;
                    best = decoded;
               }
               else if (!secondBest || decoded.confidence > secondBest.confidence) {
                    secondBest = decoded;
               }
          });
     }

     if (!best) { return null; }
     if (secondBest && secondBest.cardId == best.cardId && secondBest.answer != best.answer) {
          best.rotationMargin = best.confidence - secondBest.confidence;
          if (best.rotationMargin < 5 && best.confidence < 46) { return null; }
     }
     return best;
}

/* ---------------------------------------------- 
     V62 Variant Box
----------------------------------------------  */
function scannerV62VariantBox(box, scale, dx, dy, width, height) {
     const cx = box.x + box.w / 2 + (dx || 0) * Math.min(box.w, box.h);
     const cy = box.y + box.h / 2 + (dy || 0) * Math.min(box.w, box.h);
     const w = box.w * (scale || 1);
     const h = box.h * (scale || 1);
     return scannerV62ClampBox({
          x: cx - w / 2,
          y: cy - h / 2,
          w: w,
          h: h,
          area: box.area,
          fill: box.fill,
          threshold: box.threshold
     }, width, height);
}

/* ---------------------------------------------- 
     V62 Detect Q-Cards More Flexibly
----------------------------------------------  */
function detectQCardsFromCanvas(canvas) {
     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
     const candidates = findQCardCandidates(imageData, canvas.width, canvas.height);
     const bestByCard = {};
     const tiltAngles = [-28, -22, -16, -11, -6, -3, 0, 3, 6, 11, 16, 22, 28];
     const variants = [
          { scale: 1, dx: 0, dy: 0 },
          { scale: .94, dx: 0, dy: 0 },
          { scale: 1.08, dx: 0, dy: 0 },
          { scale: 1.16, dx: 0, dy: 0 },
          { scale: 1, dx: .025, dy: 0 },
          { scale: 1, dx: -.025, dy: 0 },
          { scale: 1, dx: 0, dy: .025 },
          { scale: 1, dx: 0, dy: -.025 }
     ];

     candidates.forEach(function(box, candidateIndex) {
          let bestForBox = null;
          const localVariants = candidateIndex < 16 ? variants : variants.slice(0, 3);
          const localAngles = candidateIndex < 18 ? tiltAngles : [-16, -8, 0, 8, 16];

          localVariants.forEach(function(variant) {
               const adjustedBox = scannerV62VariantBox(box, variant.scale, variant.dx, variant.dy, canvas.width, canvas.height);
               localAngles.forEach(function(angle) {
                    const detail = scannerV61ReadGridVariant(imageData, canvas.width, canvas.height, adjustedBox, angle);
                    const decoded = decodeQCardDetailedStrict(detail);
                    if (!decoded) { return; }
                    if (!bestForBox || decoded.confidence > bestForBox.confidence) { bestForBox = decoded; }
               });
          });

          if (!bestForBox) { return; }
          if (!bestByCard[bestForBox.cardId] || bestForBox.confidence > bestByCard[bestForBox.cardId].confidence) {
               bestByCard[bestForBox.cardId] = bestForBox;
          }
     });

     return Object.keys(bestByCard)
          .map(function(cardId) { return bestByCard[cardId]; })
          .sort(function(a, b) { return b.confidence - a.confidence; });
}

/* ---------------------------------------------- 
     V62 Stable Detections
----------------------------------------------  */
function strictStableDetections(detections) {
     const now = Date.now();
     const stable = [];

     Object.keys(scannerV62SeenMemory).forEach(function(key) {
          if (now - scannerV62SeenMemory[key].lastSeen > SCANNER_V62_CONFIRM_MS) {
               delete scannerV62SeenMemory[key];
          }
     });

     (detections || []).forEach(function(item) {
          const cardId = normalizeCardId(item.cardId);
          const key = `${cardId}-${item.answer}`;
          const previous = scannerV62SeenMemory[key];
          const count = previous && now - previous.lastSeen < SCANNER_V62_CONFIRM_MS ? previous.count + 1 : 1;
          const strongest = previous ? Math.max(previous.confidence || 0, item.confidence || 0) : (item.confidence || 0);
          const box = item.box || previous && previous.box;

          scannerV62SeenMemory[key] = {
               count: count,
               confidence: strongest,
               firstSeen: previous ? previous.firstSeen : now,
               lastSeen: now,
               box: box
          };

          if (strongest >= SCANNER_V62_FAST_CONFIDENCE || (count >= 2 && strongest >= SCANNER_V62_SECOND_FRAME_CONFIDENCE)) {
               item.confidence = strongest;
               item.box = box;
               stable.push(item);
          }
     });

     return stable;
}

/* ---------------------------------------------- 
     V62 Scan Confirmed Fast
----------------------------------------------  */
function scanConfirmedFast(cardId, answer, confidence) {
     const key = `${normalizeCardId(cardId)}-${answer}`;
     const now = Date.now();
     const previous = scanConfirmMemory[key];
     scanConfirmMemory[key] = { answer: answer, confidence: confidence || 0, time: now };

     if ((confidence || 0) >= SCANNER_V62_FAST_CONFIDENCE) { return true; }
     if (previous && previous.answer == answer && now - previous.time < SCANNER_V62_CONFIRM_MS) { return true; }
     return false;
}

/* ---------------------------------------------- 
     V62 Extract Response Map From Any API Shape
----------------------------------------------  */
function scannerV62MapResponseItem(mapped, item) {
     if (!item || !item.cardId) { return; }
     mapped[normalizeCardId(item.cardId)] = item;
}

function scannerV62ExtractResponses(data, questionIndex) {
     const mapped = {};
     const source = data && data.item ? data.item : data;
     const targetQuestion = String(Number(questionIndex) || 0);

     if (!source) { return mapped; }

     if (Array.isArray(source.items)) {
          source.items.forEach(function(item) { scannerV62MapResponseItem(mapped, item); });
     }
     if (Array.isArray(source.responses)) {
          source.responses.forEach(function(item) {
               if (item && (item.questionIndex === undefined || String(Number(item.questionIndex) || 0) == targetQuestion)) {
                    scannerV62MapResponseItem(mapped, item);
               }
          });
     }
     if (source.responses && typeof source.responses == "object" && !Array.isArray(source.responses)) {
          const questionBucket = source.responses[targetQuestion] || source.responses[Number(questionIndex) || 0] || source.responses;
          if (Array.isArray(questionBucket)) {
               questionBucket.forEach(function(item) { scannerV62MapResponseItem(mapped, item); });
          }
          else if (questionBucket && typeof questionBucket == "object") {
               Object.keys(questionBucket).forEach(function(cardId) {
                    const item = questionBucket[cardId];
                    if (item && typeof item == "object") {
                         scannerV62MapResponseItem(mapped, Object.assign({ cardId: cardId }, item));
                    }
               });
          }
     }

     return mapped;
}

/* ---------------------------------------------- 
     V62 Refresh Scanner Responses Robustly
----------------------------------------------  */
async function refreshScannerResponses(force) {
     const now = Date.now();
     if (!force && now - scannerResponsesLoadedAt < 115) { return scannerResponsesCache; }
     if (!apiBase || !sessionId) { return scannerResponsesCache; }

     const questionIndex = scannerCurrentQuestionIndex();
     let mapped = {};

     try {
          const url = `${apiBase}/quizResponses?sessionId=${encodeURIComponent(sessionId)}&questionIndex=${encodeURIComponent(questionIndex)}&t=${Date.now()}`;
          const response = await fetch(url, { cache: "no-store" });
          if (response.ok) {
               const data = await response.json();
               mapped = scannerV62ExtractResponses(data, questionIndex);
          }
     }
     catch (error) {}

     if (!Object.keys(mapped).length) {
          try {
               const response = await fetch(`${apiBase}/quizSession?sessionId=${encodeURIComponent(sessionId)}&t=${Date.now()}`, { cache: "no-store" });
               if (response.ok) {
                    const data = await response.json();
                    const session = data.item || data;
                    if (session) { scannerSessionCache = session; scannerSessionLoadedAt = now; }
                    mapped = scannerV62ExtractResponses(data, questionIndex);
               }
          }
          catch (error) {}
     }

     scannerResponsesCache = mapped;
     scannerResponsesLoadedAt = now;

     Object.keys(scannerPendingAck).forEach(function(key) {
          const pending = scannerPendingAck[key];
          const parts = key.split("-");
          const pendingQuestion = Number(parts[0]) || 0;
          const pendingCard = parts.slice(1).join("-");
          const recorded = scannerResponsesCache[pendingCard];
          const sameAnswer = recorded && (!pending.answer || recorded.answer == pending.answer);
          if (pendingQuestion == questionIndex && sameAnswer && Date.now() > (pending.keepYellowUntil || 0)) {
               delete scannerPendingAck[key];
          }
     });

     renderPendingStudents();
     return scannerResponsesCache;
}

/* ---------------------------------------------- 
     V62 Start Faster Data Polling
----------------------------------------------  */
function startScannerDataPolling() {
     clearInterval(scannerDataTimer);
     Promise.resolve(refreshScannerSessionCache(true)).then(function() { return refreshScannerResponses(true); });
     scannerDataTimer = setInterval(function() {
          refreshScannerSessionCache(false).then(function() { return refreshScannerResponses(false); });
     }, SCANNER_V62_POLL_MS);
}

/* ---------------------------------------------- 
     V62 Confirm Posted Answer
----------------------------------------------  */
function scannerV62OptimisticConfirm(questionIndex, cardId, answer, scan) {
     const normalized = normalizeCardId(cardId);
     const key = scannerResponseKey(questionIndex, normalized);
     clearTimeout(scannerV62PostAckTimers[key]);

     const tryConfirm = function(attempt) {
          refreshScannerResponses(true).then(function(cache) {
               const recorded = cache && cache[normalized];
               if (recorded && recorded.answer == answer) {
                    delete scannerPendingAck[key];
                    renderPendingStudents();
                    setStatus(`${getScannerCardName(normalized)}: ${answer} confirmed by game.`, false);
                    return;
               }

               if (attempt < 5) {
                    scannerV62PostAckTimers[key] = setTimeout(function() { tryConfirm(attempt + 1); }, 190 + attempt * 120);
                    return;
               }

               /* The POST succeeded, so keep the scanner UI from being stuck on yellow even if the read-back endpoint lags. */
               scannerResponsesCache[normalized] = Object.assign({ cardId: normalized, answer: answer }, scan || {});
               delete scannerPendingAck[key];
               renderPendingStudents();
               setStatus(`${getScannerCardName(normalized)}: ${answer} recorded.`, false);
          });
     };

     scannerV62PostAckTimers[key] = setTimeout(function() { tryConfirm(0); }, 160);
}

/* ---------------------------------------------- 
     V62 Detection State Prioritizes Confirmed Green
----------------------------------------------  */
function scannerDetectionState(cardId, answer) {
     const questionIndex = scannerCurrentQuestionIndex();
     const normalized = normalizeCardId(cardId);
     const key = scannerResponseKey(questionIndex, normalized);
     const recorded = scannerResponsesCache[normalized];
     const pending = scannerPendingAck[key];

     if (recorded) {
          const saved = recorded.answer || answer;
          const label = saved == answer ? "OK" : `OK ${saved} saved`;
          return { state: "ok", label: label, answer: answer, color: "#45d66b", fill: "rgba(69, 214, 107, .96)", text: "#123865" };
     }
     if (pending) {
          return { state: "new", label: "NEW!", answer: pending.answer || answer, color: "#ffe04a", fill: "rgba(255, 224, 74, .96)", text: "#123865" };
     }
     return { state: "ready", label: "READY", answer: answer, color: "#62c8ff", fill: "rgba(18, 56, 101, .94)", text: "#ffffff" };
}

/* ---------------------------------------------- 
     V62 Submit Scan With Reliable UI Ack
----------------------------------------------  */
async function submitScan(cardId, answer, source, forceUpdate) {
     if (!sessionId) { setStatus("Missing session ID.", true); return { status: "missing-session" }; }
     await refreshScannerSessionCache(false);
     await refreshScannerResponses(false);

     const questionIndex = scannerCurrentQuestionIndex();
     const normalized = normalizeCardId(cardId);
     const name = getScannerCardName(normalized);
     const existing = scannerResponsesCache[normalized];
     const key = scannerResponseKey(questionIndex, normalized);

     if (existing && !forceUpdate) {
          addLog(normalized, existing.answer || answer, "ok", "OK");
          setStatus(`${name} already has ${existing.answer || answer}. Tap the card preview to update.`, false);
          return { status: "existing" };
     }
     if (existing && forceUpdate && existing.answer == answer) {
          addLog(normalized, answer, "ok", "OK");
          return { status: "existing-same" };
     }

     const scan = { sessionId, questionIndex, cardId: normalized, answer, source, timestamp: new Date().toISOString() };
     scannerPendingAck[key] = { answer: answer, time: Date.now(), keepYellowUntil: Date.now() + 520 };
     renderPendingStudents();
     addLog(normalized, answer, "new", "NEW!");

     try {
          const response = await fetch(`${apiBase}/quizScan`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(scan)
          });
          if (!response.ok) { throw new Error(`Wix API ${response.status}`); }
          scannerV62OptimisticConfirm(questionIndex, normalized, answer, scan);
          return { status: "new" };
     }
     catch (error) {
          const localKey = `${localPrefix}${sessionId}-phone-scans`;
          const existingLocal = JSON.parse(localStorage.getItem(localKey) || "[]");
          existingLocal.push(scan);
          localStorage.setItem(localKey, JSON.stringify(existingLocal));
          setStatus(`Saved locally because Wix did not respond: ${error.message}`, true);
          return { status: "local" };
     }
}

/* ---------------------------------------------- 
     V62 Handle Detected Codes
----------------------------------------------  */
function handleDetectedCodes(codes, source) {
     const accepted = [];
     const questionIndex = scannerCurrentQuestionIndex();

     for (const code of codes) {
          const payload = code.cardId ? code : decodePayload(code.data, code.location);
          if (!payload) { continue; }
          if (payload.sessionId && payload.sessionId != sessionId) { continue; }
          const cardId = normalizeCardId(payload.cardId);
          const responseKey = scannerResponseKey(questionIndex, cardId);
          if (scannerResponsesCache[cardId] || scannerPendingAck[responseKey]) { continue; }
          if (!scanConfirmedFast(cardId, payload.answer, payload.confidence)) { continue; }
          if (!scanShouldSubmit(cardId, payload.answer)) { continue; }
          submitScan(cardId, payload.answer, source || "phone-camera").catch(function(error) { console.warn(error); });
          accepted.push(`${getScannerCardName(cardId)}: ${payload.answer}`);
     }

     if (accepted.length) {
          setStatus(`NEW! ${accepted.join(" | ")} · waiting briefly for game confirmation`, false);
     }
}

/* ---------------------------------------------- 
     V62 Faster Scan Current Frame
----------------------------------------------  */
async function scanCurrentFrame() {
     if (!elVideo || elVideo.readyState < 2) { return; }

     const work = scannerWorkCanvas;
     const ctx = work.getContext("2d", { willReadFrequently: true });
     const sourceW = elVideo.videoWidth || 1280;
     const sourceH = elVideo.videoHeight || 720;
     work.width = Math.min(SCANNER_V62_MAX_WORK_WIDTH, sourceW);
     work.height = Math.round(sourceH * (work.width / sourceW));
     ctx.imageSmoothingEnabled = false;
     ctx.drawImage(elVideo, 0, 0, work.width, work.height);
     syncScannerOverlaySize(work.width, work.height);

     const rawDetections = detectQCardsFromCanvas(work);
     const stableDetections = strictStableDetections(rawDetections);
     drawScannerOverlay(stableDetections.length ? stableDetections : rawDetections);

     if (stableDetections.length) {
          handleDetectedCodes(stableDetections, "phone-camera-6x6-v62-flexible-fast");
     }
}

/* ---------------------------------------------- 
     V62 Start Camera
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
          await refreshScannerSessionCache(true);
          await refreshScannerResponses(true);
          startScannerDataPolling();
          scannerStream = await navigator.mediaDevices.getUserMedia({
               video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 60, min: 24 }
               },
               audio: false
          });
          elVideo.srcObject = scannerStream;
          elVideo.setAttribute("playsinline", "");
          elVideo.setAttribute("webkit-playsinline", "");
          await elVideo.play();
          if (btnStartCamera) { btnStartCamera.textContent = "Scanning 6×6"; }
          setStatus("V62 flexible scanner active: more sensitive, faster polling, better rotation choice, and confirmation no longer stays stuck on yellow.", false);
          startLoop();
     }
     catch (error) {
          if (btnStartCamera) { btnStartCamera.disabled = false; btnStartCamera.textContent = "Start Camera"; }
          setStatus(`Camera could not start: ${error.message || "permission blocked"}. Use manual backup.`, true);
     }
}

/* ---------------------------------------------- 
     V63 Balanced Scanner - Less False Positives
----------------------------------------------  */

var scannerV63SeenMemory = scannerV63SeenMemory || {};
SCANNER_V62_MAX_WORK_WIDTH = 1180;
SCANNER_V62_CONFIRM_MS = 430;
SCANNER_V62_FAST_CONFIDENCE = 48;
SCANNER_V62_SECOND_FRAME_CONFIDENCE = 22;
SCANNER_V62_MIN_SIDE_RATIO = 0.031;
SCANNER_V62_POLL_MS = 170;

/* ---------------------------------------------- 
     V63 Marker Shape Check
----------------------------------------------  */
function scannerV62BoxLooksFlexible(box, width, height) {
     if (!box) { return false; }
     const side = Math.min(box.w, box.h);
     const ratio = box.w / Math.max(1, box.h);
     const frameMin = Math.min(width, height);
     const frameMax = Math.max(width, height);

     if (side < Math.max(24, frameMin * SCANNER_V62_MIN_SIDE_RATIO)) { return false; }
     if (side > frameMax * .86) { return false; }
     if (ratio < .62 || ratio > 1.62) { return false; }
     if (typeof box.fill == "number" && box.fill > 0 && (box.fill < .16 || box.fill > .965)) { return false; }
     return true;
}

/* ---------------------------------------------- 
     V63 Component Candidates At Threshold
----------------------------------------------  */
function scannerV63FindCandidatesAtThreshold(imageData, width, height, threshold) {
     const data = imageData.data;
     const total = width * height;
     const dark = new Uint8Array(total);
     const seen = new Uint8Array(total);
     const candidates = [];

     for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
          dark[pixel] = scannerLuminance(data, i) < threshold ? 1 : 0;
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
               const fill = area / Math.max(1, boxW * boxH);
               const grow = Math.max(2, Math.round(Math.min(boxW, boxH) * 0.022));

               scannerV62AddCandidate(candidates, {
                    x: minX - grow,
                    y: minY - grow,
                    w: boxW + grow * 2,
                    h: boxH + grow * 2,
                    area: area,
                    fill: fill,
                    threshold: threshold
               }, width, height);
          }
     }

     return candidates;
}

/* ---------------------------------------------- 
     V63 Find Candidates Without Wall Fallbacks
----------------------------------------------  */
function findQCardCandidates(imageData, width, height) {
     const adaptive = scannerAdaptiveDarkThreshold(imageData);
     const thresholdSet = {};
     const rawThresholds = [
          adaptive - 28,
          adaptive - 16,
          adaptive - 6,
          adaptive + 8,
          adaptive + 22,
          adaptive + 36,
          86,
          104,
          122,
          142,
          164,
          188
     ];
     const candidates = [];

     rawThresholds.forEach(function(value) {
          thresholdSet[scannerV59Clamp(Math.round(value), 56, 212)] = true;
     });

     Object.keys(thresholdSet).map(Number).forEach(function(threshold) {
          scannerV63FindCandidatesAtThreshold(imageData, width, height, threshold).forEach(function(box) {
               scannerV62AddCandidate(candidates, box, width, height);
          });
     });

     return candidates.sort(function(a, b) {
          const aSquareness = 1 - Math.min(.75, Math.abs(Math.log((a.w || 1) / Math.max(1, a.h || 1))));
          const bSquareness = 1 - Math.min(.75, Math.abs(Math.log((b.w || 1) / Math.max(1, b.h || 1))));
          const aScore = (a.area || 0) * Math.max(.16, Math.min(.90, a.fill || .45)) * aSquareness;
          const bScore = (b.area || 0) * Math.max(.16, Math.min(.90, b.fill || .45)) * bSquareness;
          return bScore - aScore;
     }).slice(0, 26);
}

/* ---------------------------------------------- 
     V63 Card-Like Detail Check
----------------------------------------------  */
function scannerV62DetailLooksCardLike(detail) {
     if (!detail || !detail.values) { return false; }
     if (detail.contrast < 8) { return false; }
     if (detail.highAvg < detail.lowAvg + 8) { return false; }

     /* A real Q-card has a dark marker background around the white cells.
        Wall drawings may create high contrast, but not this repeated dark grid background. */
     if (detail.darkBackgroundRatio < .16 && detail.contrast < 30) { return false; }
     if (detail.darkBackgroundRatio < .08) { return false; }
     return true;
}

/* ---------------------------------------------- 
     V63 Pattern Score
----------------------------------------------  */
function scannerV63ExpectedPatternScore(values, threshold, expected) {
     let mismatch = 0;
     let weak = 0;
     let strong = 0;
     let totalMargin = 0;
     let strongWrong = 0;
     let anchorMismatch = 0;

     for (let row = 0; row < 6; row += 1) {
          for (let col = 0; col < 6; col += 1) {
               const expectedWhite = !!expected[row][col];
               const value = values[row][col];
               const margin = expectedWhite ? value - threshold : threshold - value;
               totalMargin += margin;
               if (margin < -2) { mismatch += 1; }
               if (Math.abs(margin) < 5.5) { weak += 1; }
               if (margin > 12) { strong += 1; }
               if (margin < -18) { strongWrong += 1; }

               if ((row == 0 && col == 0) || (row == 0 && col == 1) || (row == 1 && col == 0) || (row == 1 && col == 1)) {
                    if (margin < -1) { anchorMismatch += 1; }
               }
          }
     }

     return {
          mismatch: mismatch,
          weak: weak,
          strong: strong,
          strongWrong: strongWrong,
          anchorMismatch: anchorMismatch,
          averageMargin: totalMargin / 36
     };
}

/* ---------------------------------------------- 
     V63 Decode With Balanced Rotation Choice
----------------------------------------------  */
function decodeQCardDetailedStrict(detail) {
     if (!scannerV62DetailLooksCardLike(detail)) { return null; }

     const answersByRotation = ["A", "B", "C", "D"];
     const validIds = getScannerValidCardIds();
     const rosterIds = Object.keys(validIds);
     const valueList = rosterIds.length
          ? rosterIds.map(function(cardId) { return Math.max(0, Math.min(SCANNER_MAX_CARDS - 1, Number(String(cardId).replace(/\D/g, "")) - 1)); })
          : Array.from({ length: SCANNER_MAX_CARDS }, function(_, index) { return index; });
     let best = null;
     let secondBestSameCard = null;

     for (let rotation = 0; rotation < 4; rotation += 1) {
          const values = rotateGrid(detail.values, rotation);
          const anchorAnalog = scannerV62AnalogAnchorScore(values, detail.threshold);
          if (anchorAnalog < -26) { continue; }

          valueList.forEach(function(value) {
               if (value < 0 || value >= SCANNER_MAX_CARDS) { return; }
               const cardId = `P${String(value + 1).padStart(2, "0")}`;
               if (rosterIds.length && !validIds[cardId]) { return; }

               const expected = scannerV58ExpectedGridFromValue(value);
               const pattern = scannerV63ExpectedPatternScore(values, detail.threshold, expected);
               const mismatchLimit = detail.contrast >= 30 ? 8 : detail.contrast >= 18 ? 9 : 10;
               const weakLimit = detail.contrast >= 30 ? 30 : detail.contrast >= 18 ? 31 : 32;
               const wrongLimit = detail.contrast >= 24 ? 4 : 5;

               if (pattern.anchorMismatch > 1) { return; }
               if (pattern.mismatch > mismatchLimit) { return; }
               if (pattern.weak > weakLimit) { return; }
               if (pattern.strongWrong > wrongLimit) { return; }
               if (pattern.strong < 8 && detail.contrast < 17) { return; }

               const confidence = 54
                    - (pattern.mismatch * 6.6)
                    - (pattern.weak * .36)
                    - (pattern.strongWrong * 8.2)
                    - (pattern.anchorMismatch * 14)
                    + Math.round(Math.max(-8, pattern.averageMargin) * 1.65)
                    + Math.round(detail.contrast * 1.18)
                    + Math.round(pattern.strong * 1.45)
                    + Math.round(anchorAnalog * .20)
                    + Math.round(detail.darkBackgroundRatio * 16);

               const decoded = {
                    cardId: cardId,
                    answer: answersByRotation[rotation],
                    confidence: confidence,
                    rotation: rotation,
                    box: detail.box,
                    mismatch: pattern.mismatch,
                    weak: pattern.weak,
                    strongWrong: pattern.strongWrong,
                    anchor: anchorAnalog,
                    sampleAngle: detail.sampleAngle || 0,
                    flexible: true
               };

               if (!best || decoded.confidence > best.confidence) {
                    if (best && best.cardId == decoded.cardId && best.answer != decoded.answer) { secondBestSameCard = best; }
                    best = decoded;
               }
               else if (decoded.cardId == best.cardId && decoded.answer != best.answer && (!secondBestSameCard || decoded.confidence > secondBestSameCard.confidence)) {
                    secondBestSameCard = decoded;
               }
          });
     }

     if (!best) { return null; }
     if (secondBestSameCard) {
          best.rotationMargin = best.confidence - secondBestSameCard.confidence;
          if (best.rotationMargin < 7 && best.confidence < 58) { return null; }
     }
     return best;
}

/* ---------------------------------------------- 
     V63 Detect Q-Cards With Moderate Flexibility
----------------------------------------------  */
function detectQCardsFromCanvas(canvas) {
     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
     const candidates = findQCardCandidates(imageData, canvas.width, canvas.height);
     const bestByCard = {};
     const tiltAngles = [-22, -16, -10, -5, 0, 5, 10, 16, 22];
     const variants = [
          { scale: 1, dx: 0, dy: 0 },
          { scale: .96, dx: 0, dy: 0 },
          { scale: 1.06, dx: 0, dy: 0 },
          { scale: 1, dx: .018, dy: 0 },
          { scale: 1, dx: -.018, dy: 0 },
          { scale: 1, dx: 0, dy: .018 },
          { scale: 1, dx: 0, dy: -.018 }
     ];

     candidates.forEach(function(box, candidateIndex) {
          let bestForBox = null;
          const localVariants = candidateIndex < 10 ? variants : variants.slice(0, 3);
          const localAngles = candidateIndex < 12 ? tiltAngles : [-16, -8, 0, 8, 16];

          localVariants.forEach(function(variant) {
               const adjustedBox = scannerV62VariantBox(box, variant.scale, variant.dx, variant.dy, canvas.width, canvas.height);
               localAngles.forEach(function(angle) {
                    const detail = scannerV61ReadGridVariant(imageData, canvas.width, canvas.height, adjustedBox, angle);
                    const decoded = decodeQCardDetailedStrict(detail);
                    if (!decoded) { return; }
                    if (!bestForBox || decoded.confidence > bestForBox.confidence) { bestForBox = decoded; }
               });
          });

          if (!bestForBox) { return; }
          if (!bestByCard[bestForBox.cardId] || bestForBox.confidence > bestByCard[bestForBox.cardId].confidence) {
               bestByCard[bestForBox.cardId] = bestForBox;
          }
     });

     return Object.keys(bestByCard)
          .map(function(cardId) { return bestByCard[cardId]; })
          .sort(function(a, b) { return b.confidence - a.confidence; });
}

/* ---------------------------------------------- 
     V63 Stable Detections
----------------------------------------------  */
function strictStableDetections(detections) {
     const now = Date.now();
     const stable = [];

     Object.keys(scannerV63SeenMemory).forEach(function(key) {
          if (now - scannerV63SeenMemory[key].lastSeen > 560) {
               delete scannerV63SeenMemory[key];
          }
     });

     (detections || []).forEach(function(item) {
          const cardId = normalizeCardId(item.cardId);
          const key = `${cardId}-${item.answer}`;
          const previous = scannerV63SeenMemory[key];
          const sameBurst = previous && now - previous.lastSeen < 560;
          const count = sameBurst ? previous.count + 1 : 1;
          const strongest = previous ? Math.max(previous.confidence || 0, item.confidence || 0) : (item.confidence || 0);
          const bestBox = item.box || previous && previous.box;

          scannerV63SeenMemory[key] = {
               count: count,
               confidence: strongest,
               firstSeen: sameBurst ? previous.firstSeen : now,
               lastSeen: now,
               box: bestBox
          };

          if (strongest >= 48 || (count >= 2 && strongest >= 24) || (count >= 3 && strongest >= 18)) {
               item.confidence = strongest;
               item.box = bestBox;
               stable.push(item);
          }
     });

     return stable;
}

/* ---------------------------------------------- 
     V63 Scan Confirmation
----------------------------------------------  */
function scanConfirmedFast(cardId, answer, confidence) {
     const key = `${normalizeCardId(cardId)}-${answer}`;
     const now = Date.now();
     const previous = scanConfirmMemory[key];
     scanConfirmMemory[key] = { answer: answer, confidence: confidence || 0, time: now };

     if ((confidence || 0) >= 48) { return true; }
     if (previous && previous.answer == answer && now - previous.time < 560) { return true; }
     return false;
}

/* ---------------------------------------------- 
     V63 Faster But Cleaner Scan Current Frame
----------------------------------------------  */
async function scanCurrentFrame() {
     if (!elVideo || elVideo.readyState < 2) { return; }

     const work = scannerWorkCanvas;
     const ctx = work.getContext("2d", { willReadFrequently: true });
     const sourceW = elVideo.videoWidth || 1280;
     const sourceH = elVideo.videoHeight || 720;
     work.width = Math.min(SCANNER_V62_MAX_WORK_WIDTH, sourceW);
     work.height = Math.round(sourceH * (work.width / sourceW));
     ctx.imageSmoothingEnabled = false;
     ctx.drawImage(elVideo, 0, 0, work.width, work.height);
     syncScannerOverlaySize(work.width, work.height);

     const rawDetections = detectQCardsFromCanvas(work);
     const stableDetections = strictStableDetections(rawDetections);

     /* Important: do not draw raw detections. Raw candidates are useful internally,
        but showing them makes random wall shapes look like valid cards. */
     drawScannerOverlay(stableDetections);

     if (stableDetections.length) {
          handleDetectedCodes(stableDetections, "phone-camera-6x6-v63-balanced");
     }
}

/* ---------------------------------------------- 
     V63 Start Camera
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
          await refreshScannerSessionCache(true);
          await refreshScannerResponses(true);
          startScannerDataPolling();
          scannerStream = await navigator.mediaDevices.getUserMedia({
               video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 60, min: 24 }
               },
               audio: false
          });
          elVideo.srcObject = scannerStream;
          elVideo.setAttribute("playsinline", "");
          elVideo.setAttribute("webkit-playsinline", "");
          await elVideo.play();
          if (btnStartCamera) { btnStartCamera.textContent = "Scanning 6×6"; }
          setStatus("V63 balanced scanner active: cleaner feedback, less background noise, and still tolerant with bent printed cards.", false);
          startLoop();
     }
     catch (error) {
          if (btnStartCamera) { btnStartCamera.disabled = false; btnStartCamera.textContent = "Start Camera"; }
          setStatus(`Camera could not start: ${error.message || "permission blocked"}. Use manual backup.`, true);
     }
}
