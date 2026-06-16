"use strict";
/* ---------------------------------------------- 
     Paper Scanner Made by: David Santana 
----------------------------------------------  */

/* ---------------------------------------------- 
     Scanner Constants 
----------------------------------------------  */
const params = new URLSearchParams(location.search);
const sessionId = params.get("session") || "";
const PAPER_API_BASE = "https://chiispiitas.wixsite.com/mr-david-collection/_functions";
const apiBase = PAPER_API_BASE;
const SCANNER_MAX_CARDS = 60;
const SCANNER_ANSWERS = ["A", "B", "C", "D"];
const SCAN_PROCESS_WIDTH = 960;
const SCAN_INTERVAL_MS = 70;
const SESSION_POLL_MS = 480;
const GHOST_MS = 1000;
const MIN_REGISTER_VISIBLE_MS = 1000;
const MIN_OVERLAY_VISIBLE_MS = 450;
const CONTINUOUS_RESET_MS = 760;
const STRICTNESS_STORAGE_KEY = "wgc-scanner-strictness";
const DEFAULT_SCANNER_STRICTNESS = 70;
const FIXED_SCANNER_STRICTNESS = 40;

var scannerStrictness = FIXED_SCANNER_STRICTNESS;
var scannerStream = null;
var scannerFrame = null;
var scannerBusy = false;
var scannerLastScanAt = 0;
var scannerSessionBusy = false;
var scannerSessionTimer = null;
var scannerSessionCache = null;
var scannerSessionLoadedAt = 0;
var scannerQuestionIndex = 0;
var scannerResponses = {};
var scannerRoster = [];
var scannerRosterById = {};
var scannerDetectionMemory = {};
var scannerGhosts = {};
var scannerPendingAck = {};
var scannerOverlay = null;
var scannerOverlayHits = [];

const elSession = document.getElementById("scannerSessionId");
const elApi = document.getElementById("scannerApiStatus");
const elStatus = document.getElementById("scannerStatus");
const elVideo = document.getElementById("scannerVideo");
const elCanvas = document.getElementById("scannerCanvas");
const elLog = document.getElementById("scanLog");
const elManual = document.getElementById("manualCardId");
const btnStartCamera = document.getElementById("btnStartCamera");

if (elSession) { elSession.textContent = sessionId || "Missing session"; }
if (elApi) { elApi.textContent = "Scanner URL: GitHub Pages • Responses: Wix Velo API"; }


if (btnStartCamera) {
     btnStartCamera.addEventListener("click", startCamera);
     btnStartCamera.addEventListener("touchend", function(event) {
          event.preventDefault();
          startCamera();
     }, { passive: false });
}

document.querySelectorAll("[data-answer]").forEach(function(button) {
     button.addEventListener("click", function() {
          const cardId = normalizeCardId(elManual && elManual.value || "");
          if (!cardId) { setStatus("Type the card ID first.", true); return; }
          submitScan(cardId, button.dataset.answer || "A", "phone-manual", true);
     });
});

/* ---------------------------------------------- 
     Strictness Tuning Control 
----------------------------------------------  */
function readStoredStrictness() {
     return FIXED_SCANNER_STRICTNESS;
}

function strictnessOffset() {
     if (scannerStrictness >= DEFAULT_SCANNER_STRICTNESS) {
          return (scannerStrictness - DEFAULT_SCANNER_STRICTNESS) / (100 - DEFAULT_SCANNER_STRICTNESS);
     }
     return (scannerStrictness - DEFAULT_SCANNER_STRICTNESS) / DEFAULT_SCANNER_STRICTNESS;
}

function strictnessProfile() {
     const s = strictnessOffset();
     const lo = Math.max(0, -s);
     const hi = Math.max(0, s);
     return {
          minSizePx: Math.round(72 - lo * 28 + hi * 28),
          minSizeRatio: 0.085 - lo * 0.025 + hi * 0.025,
          maxWidthRatio: 0.78 + lo * 0.12 - hi * 0.06,
          maxHeightRatio: 0.92 + lo * 0.06 - hi * 0.04,
          ratioMin: 0.72 - lo * 0.11 + hi * 0.08,
          ratioMax: 1.42 + lo * 0.15 - hi * 0.10,
          fillMin: 0.58 - lo * 0.16 + hi * 0.13,
          fillMax: 0.94 + lo * 0.04 - hi * 0.04,
          maxCandidates: Math.round(18 + lo * 16 - hi * 7),
          thresholdLift: 18 - lo * 12 + hi * 8,
          thresholdClampMin: 82 - lo * 18 + hi * 8,
          thresholdClampMax: 138 + lo * 22 - hi * 8,
          thresholdMin: 72 - lo * 12 + hi * 8,
          thresholdMax: 154 + lo * 22 - hi * 8,
          thresholdOffsets: lo > 0.45 ? [-18, -8, 0, 8, 20, 34, 154] : [-8, 8, 24, 148],
          contrastMin: 40 - lo * 20 + hi * 18,
          readContrastMin: 24 - lo * 10 + hi * 10,
          backgroundMin: 0.64 - lo * 0.18 + hi * 0.14,
          edgeDarkMin: 0.58 - lo * 0.16 + hi * 0.16,
          paperScoreMin: 0.48 - lo * 0.18 + hi * 0.20,
          paperGoodBandsMin: Math.max(2, Math.min(7, Math.round(4 - lo * 2 + hi * 2))),
          scoreMin: 31.1 - lo * 2.4 + hi * 2.4,
          strongScoreMin: 33.4 - lo * 2.0 + hi * 2.0,
          matchesMin: Math.max(27, Math.min(35, Math.round(31 - lo * 4 + hi * 3))),
          marginMin: Math.max(0.55, 1.25 - lo * 0.55 + hi * 0.45),
          boxScales: lo > 0.4 ? [0.90, 0.96, 1.00, 1.05, 1.10, 1.16] : [0.96, 1.00, 1.05, 1.10],
          angleOffsets: lo > 0.32 ? [-13, -8, -4, 0, 4, 8, 13] : [-9, -5, 0, 5, 9],
          confirmHits: Math.max(1, Math.min(5, Math.round(3 - lo * 1.4 + hi * 1.4))),
          immediateQuality: 43 - lo * 9 + hi * 10,
          stableWindowMs: 520 + lo * 260 - hi * 80,
          memoryKeepMs: 1900 + lo * 900 - hi * 450,
          nmsIoU: 0.32 + lo * 0.08 - hi * 0.06,
          maxDetections: Math.max(2, Math.min(8, Math.round(4 + lo * 3 - hi * 1)))
     };
}

function injectStrictnessControl() {
     if (document.getElementById("scannerStrictnessControl")) { return; }
     const target = document.querySelector(".camera-card") || elStatus || document.body;
     const panel = document.createElement("section");
     panel.id = "scannerStrictnessControl";
     panel.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
               <strong>Scanner strictness</strong>
               <span id="scannerStrictnessValue" style="font-weight:900;">${scannerStrictness}/100</span>
          </div>
          <input id="scannerStrictnessSlider" type="range" min="0" max="100" step="1" value="${scannerStrictness}" style="width:100%;accent-color:#ffcc35;">
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800;opacity:.78;margin-top:5px;">
               <span>More sensitive</span>
               <span>Less random</span>
          </div>
          <p style="margin:8px 0 0;font-size:13px;line-height:1.25;font-weight:750;opacity:.82;">Use this temporarily to find the sweet spot. It saves automatically in this browser.</p>
     `;
     panel.style.cssText = "margin:16px 0;padding:16px 20px;border:5px solid #123865;border-radius:22px;background:rgba(255,255,255,.94);box-shadow:0 8px 0 rgba(18,56,101,.18);color:#123865;";
     if (target && target.parentNode) { target.parentNode.insertBefore(panel, target); }
     else { document.body.appendChild(panel); }

     const slider = document.getElementById("scannerStrictnessSlider");
     if (slider) {
          slider.addEventListener("input", function() {
               scannerStrictness = Math.round(clampNumber(Number(slider.value) || DEFAULT_SCANNER_STRICTNESS, 0, 100));
               localStorage.setItem(STRICTNESS_STORAGE_KEY, String(scannerStrictness));
               scannerDetectionMemory = {};
               scannerGhosts = {};
               updateStrictnessControl();
               setStatus(`Strictness set to ${scannerStrictness}/100. Test again with the same card angle.`, false);
          });
     }
     updateStrictnessControl();
}

function updateStrictnessControl() {
     const value = document.getElementById("scannerStrictnessValue");
     const slider = document.getElementById("scannerStrictnessSlider");
     if (value) { value.textContent = `${scannerStrictness}/100`; }
     if (slider && String(slider.value) !== String(scannerStrictness)) { slider.value = scannerStrictness; }
}

startSessionPolling();
loadSessionState(true);

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
          setStatus("Loading session roster...", false);
          await loadSessionState(true);
          scannerStream = await navigator.mediaDevices.getUserMedia({
               video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 60, min: 24 }
               },
               audio: false
          });
          elVideo.srcObject = scannerStream;
          elVideo.setAttribute("playsinline", "");
          elVideo.setAttribute("webkit-playsinline", "");
          await elVideo.play();
          prepareOverlay();
          if (btnStartCamera) { btnStartCamera.textContent = "Scanning"; }
          setStatus("6×6 scanner active. Hold each Q-card in view for about 1 second to record it.", false);
          startLoop();
     }
     catch (error) {
          if (btnStartCamera) { btnStartCamera.disabled = false; btnStartCamera.textContent = "Start Camera"; }
          setStatus(`Camera could not start: ${error.message || "permission blocked"}. Use manual backup.`, true);
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
          const now = performance.now();
          if (!scannerBusy && now - scannerLastScanAt >= SCAN_INTERVAL_MS) {
               scannerBusy = true;
               scannerLastScanAt = now;
               try { await scanCurrentFrame(); }
               catch (error) { console.warn(error); }
               scannerBusy = false;
          }
          drawOverlay();
          scannerFrame = requestAnimationFrame(scanFrame);
     };
     scannerFrame = requestAnimationFrame(scanFrame);
}

/* ---------------------------------------------- 
     Scan Current Frame 
----------------------------------------------  */
async function scanCurrentFrame() {
     if (!elVideo || !elCanvas || elVideo.readyState < 2) { return; }

     const sourceW = elVideo.videoWidth || 1280;
     const sourceH = elVideo.videoHeight || 720;
     const workW = Math.min(SCAN_PROCESS_WIDTH, sourceW);
     const workH = Math.max(1, Math.round(sourceH * (workW / sourceW)));
     const ctx = elCanvas.getContext("2d", { willReadFrequently: true });
     elCanvas.width = workW;
     elCanvas.height = workH;
     ctx.drawImage(elVideo, 0, 0, workW, workH);

     const detections = detectQCardsFromCanvas(elCanvas);
     handleVisibleDetections(detections);
}

/* ---------------------------------------------- 
     Normalize Card ID 
----------------------------------------------  */
function normalizeCardId(cardId) {
     const digits = String(cardId || "").replace(/\D/g, "");
     if (!digits) { return ""; }
     const number = Math.max(1, Math.min(SCANNER_MAX_CARDS, Number(digits) || 1));
     return `P${String(number).padStart(2, "0")}`;
}

/* ---------------------------------------------- 
     Card Number From ID 
----------------------------------------------  */
function cardNumberFromId(cardId) {
     return Math.max(1, Math.min(SCANNER_MAX_CARDS, Number(String(cardId || "").replace(/\D/g, "")) || 1));
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
     Make Expected 6x6 Grid 
----------------------------------------------  */
function makeExpectedGrid(cardId) {
     const number = cardNumberFromId(cardId);
     const value = number - 1;
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
          if (index < bits.length) { grid[row][col] = !!bits[index]; }
          else { grid[row][col] = ((row * 3 + col + value) % 4) === 0; }
     });

     return grid;
}

const EXPECTED_GRIDS = Array.from({ length: SCANNER_MAX_CARDS }, function(_, index) {
     const cardId = `P${String(index + 1).padStart(2, "0")}`;
     return { cardId: cardId, grid: makeExpectedGrid(cardId) };
});

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
     Detect Q-Cards From Canvas 
----------------------------------------------  */
function detectQCardsFromCanvas(canvas) {
     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
     const candidates = findQCardCandidates(imageData, canvas.width, canvas.height);
     const detections = [];

     candidates.forEach(function(box) {
          const decoded = decodeCandidate(imageData, canvas.width, canvas.height, box);
          if (!decoded) { return; }
          if (scannerRoster.length && !scannerRosterById[decoded.cardId]) { return; }
          detections.push(decoded);
     });

     return nonMaxDetections(detections);
}

/* ---------------------------------------------- 
     Find Q-Card Candidates 
----------------------------------------------  */
function findQCardCandidates(imageData, width, height) {
     const profile = strictnessProfile();
     const thresholds = candidateThresholds(imageData.data, profile);
     const boxes = [];
     thresholds.forEach(function(threshold) {
          findCandidatesAtThreshold(imageData, width, height, threshold, profile).forEach(function(box) {
               let duplicate = false;
               for (const old of boxes) {
                    if (boxIoU(old, box) > 0.72) {
                         if (box.area > old.area) { Object.assign(old, box); }
                         duplicate = true;
                         break;
                    }
               }
               if (!duplicate) { boxes.push(box); }
          });
     });
     return boxes.sort(function(a, b) { return b.area - a.area; }).slice(0, profile.maxCandidates);
}

/* ---------------------------------------------- 
     Candidate Thresholds 
----------------------------------------------  */
function candidateThresholds(data, profile) {
     const samples = [];
     for (let i = 0; i < data.length; i += 32) {
          samples.push(rgbLum(data[i], data[i + 1], data[i + 2]));
     }
     samples.sort(function(a, b) { return a - b; });
     const p12 = samples[Math.floor(samples.length * 0.12)] || 80;
     const p28 = samples[Math.floor(samples.length * 0.28)] || 120;
     const base = clampNumber(Math.round((p12 + p28) / 2 + profile.thresholdLift), profile.thresholdClampMin, profile.thresholdClampMax);
     return uniqueNumbers(profile.thresholdOffsets.map(function(offset) { return base + offset; })).map(function(item) {
          return clampNumber(item, profile.thresholdMin, profile.thresholdMax);
     });
}

/* ---------------------------------------------- 
     Find Candidates At Threshold 
----------------------------------------------  */
function findCandidatesAtThreshold(imageData, width, height, threshold, profile) {
     const data = imageData.data;
     const total = width * height;
     const dark = new Uint8Array(total);
     const seen = new Uint8Array(total);
     const queue = new Int32Array(total);
     const candidates = [];
     const minSize = Math.max(profile.minSizePx, Math.round(Math.min(width, height) * profile.minSizeRatio));
     const maxW = Math.round(width * profile.maxWidthRatio);
     const maxH = Math.round(height * profile.maxHeightRatio);

     for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
          dark[pixel] = rgbLum(data[i], data[i + 1], data[i + 2]) < threshold ? 1 : 0;
     }

     for (let y = 1; y < height - 1; y += 1) {
          for (let x = 1; x < width - 1; x += 1) {
               const start = y * width + x;
               if (!dark[start] || seen[start]) { continue; }

               let head = 0;
               let tail = 0;
               let minX = x;
               let maxX = x;
               let minY = y;
               let maxY = y;
               let area = 0;
               seen[start] = 1;
               queue[tail] = start;
               tail += 1;

               while (head < tail) {
                    const current = queue[head];
                    head += 1;
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
                         queue[tail] = next;
                         tail += 1;
                    }
               }

               const boxW = maxX - minX + 1;
               const boxH = maxY - minY + 1;
               const ratio = boxW / Math.max(1, boxH);
               const fill = area / Math.max(1, boxW * boxH);

               if (boxW < minSize || boxH < minSize) { continue; }
               if (boxW > maxW || boxH > maxH) { continue; }
               if (ratio < profile.ratioMin || ratio > profile.ratioMax) { continue; }
               if (fill < profile.fillMin || fill > profile.fillMax) { continue; }

               candidates.push({ x: minX, y: minY, w: boxW, h: boxH, area: area, threshold: threshold, fill: fill });
          }
     }

     return candidates;
}

/* ---------------------------------------------- 
     Decode Candidate 
----------------------------------------------  */
function decodeCandidate(imageData, width, height, box) {
     const profile = strictnessProfile();
     const variants = candidateBoxVariants(box, width, height, profile);
     let best = null;

     variants.forEach(function(variant) {
          profile.angleOffsets.forEach(function(angleOffset) {
               const read = readGridFromCandidate(imageData, width, height, variant, angleOffset);
               if (!read) { return; }
               const paper = paperBorderScore(imageData, width, height, variant);
               const edgeDark = markerEdgeDarkScore(imageData, width, height, variant, read.threshold);
               const background = markerBackgroundDarkScore(imageData, width, height, variant, read.threshold);
               if (read.contrast < profile.contrastMin) { return; }
               if (background < profile.backgroundMin) { return; }
               if (edgeDark < profile.edgeDarkMin) { return; }
               if (paper.score < profile.paperScoreMin) { return; }
               if (paper.goodBands < profile.paperGoodBandsMin) { return; }

               const match = matchReadGrid(read);
               if (!match) { return; }

               const anglePenalty = Math.abs(angleOffset) / 42;
               const quality = match.score + read.contrast / 18 + edgeDark * 3 + paper.score * 3 - anglePenalty;
               const decoded = {
                    cardId: match.cardId,
                    answer: match.answer,
                    box: variant,
                    angleOffset: angleOffset,
                    score: match.score,
                    margin: match.margin,
                    matches: match.matches,
                    contrast: read.contrast,
                    paperScore: paper.score,
                    edgeDark: edgeDark,
                    quality: quality
               };
               if (!best || decoded.quality > best.quality) { best = decoded; }
          });
     });

     if (!best) { return null; }
     if (best.score < profile.scoreMin) { return null; }
     if (best.matches < profile.matchesMin) { return null; }
     if (best.margin < profile.marginMin && best.score < profile.strongScoreMin) { return null; }
     return best;
}

/* ---------------------------------------------- 
     Candidate Box Variants 
----------------------------------------------  */
function candidateBoxVariants(box, width, height, profile) {
     const variants = [];
     profile.boxScales.forEach(function(scale) {
          const cx = box.x + box.w / 2;
          const cy = box.y + box.h / 2;
          const sideW = box.w * scale;
          const sideH = box.h * scale;
          const x = clampNumber(cx - sideW / 2, 0, width - 1);
          const y = clampNumber(cy - sideH / 2, 0, height - 1);
          variants.push({
               x: x,
               y: y,
               w: Math.min(sideW, width - x),
               h: Math.min(sideH, height - y),
               area: box.area || sideW * sideH
          });
     });
     return variants;
}

/* ---------------------------------------------- 
     Read Grid From Candidate 
----------------------------------------------  */
function readGridFromCandidate(imageData, width, height, box, angleDeg) {
     const profile = strictnessProfile();
     const data = imageData.data;
     const pad = 52 / 600;
     const gap = 24 / 600;
     const cell = (1 - (pad * 2) - (gap * 5)) / 6;
     const cells = [];
     const lums = [];
     const sampleRadius = Math.max(1, Math.min(6, Math.round(Math.min(box.w, box.h) * cell * 0.12)));
     const jitter = Math.max(1, Math.round(Math.min(box.w, box.h) * cell * 0.22));
     const angle = (Number(angleDeg) || 0) * Math.PI / 180;
     const cos = Math.cos(angle);
     const sin = Math.sin(angle);
     const angleBoxFactor = Math.max(1, Math.abs(cos) + Math.abs(sin));
     const sampleW = box.w / angleBoxFactor;
     const sampleH = box.h / angleBoxFactor;
     const centerX = box.x + box.w / 2;
     const centerY = box.y + box.h / 2;

     for (let row = 0; row < 6; row += 1) {
          const line = [];
          for (let col = 0; col < 6; col += 1) {
               const rx = pad + (cell / 2) + col * (cell + gap);
               const ry = pad + (cell / 2) + row * (cell + gap);
               const localX = (rx - 0.5) * sampleW;
               const localY = (ry - 0.5) * sampleH;
               const cx = centerX + localX * cos - localY * sin;
               const cy = centerY + localX * sin + localY * cos;
               const jx = jitter * cos;
               const jy = jitter * sin;
               const kx = -jitter * sin;
               const ky = jitter * cos;
               const samples = [
                    patchLum(data, width, height, cx, cy, sampleRadius),
                    patchLum(data, width, height, cx - jx, cy - jy, sampleRadius),
                    patchLum(data, width, height, cx + jx, cy + jy, sampleRadius),
                    patchLum(data, width, height, cx - kx, cy - ky, sampleRadius),
                    patchLum(data, width, height, cx + kx, cy + ky, sampleRadius)
               ].sort(function(a, b) { return a - b; });
               const lum = samples[2];
               line.push(lum);
               lums.push(lum);
          }
          cells.push(line);
     }

     const sorted = lums.slice().sort(function(a, b) { return a - b; });
     const low = average(sorted.slice(0, 12));
     const high = average(sorted.slice(-10));
     const contrast = high - low;
     const threshold = low + contrast * 0.52;

     if (contrast < profile.readContrastMin) { return null; }

     return { cells: cells, low: low, high: high, contrast: contrast, threshold: threshold, angleOffset: angleDeg || 0 };
}

/* ---------------------------------------------- 
     Match Read Grid 
----------------------------------------------  */
function matchReadGrid(read) {
     let best = null;
     let second = null;

     for (let rotation = 0; rotation < 4; rotation += 1) {
          const rotatedCells = rotateGrid(read.cells, rotation);
          for (const expected of EXPECTED_GRIDS) {
               const scored = scoreAgainstExpected(rotatedCells, expected.grid, read.low, read.high, read.threshold);
               const item = {
                    cardId: expected.cardId,
                    answer: SCANNER_ANSWERS[rotation],
                    score: scored.score,
                    matches: scored.matches
               };
               if (!best || item.score > best.score) {
                    second = best;
                    best = item;
               }
               else if (!second || item.score > second.score) {
                    second = item;
               }
          }
     }

     if (!best) { return null; }
     best.margin = best.score - (second ? second.score : 0);
     return best;
}

/* ---------------------------------------------- 
     Score Against Expected 
----------------------------------------------  */
function scoreAgainstExpected(cells, expected, low, high, threshold) {
     const contrast = Math.max(1, high - low);
     let score = 0;
     let matches = 0;

     for (let row = 0; row < 6; row += 1) {
          for (let col = 0; col < 6; col += 1) {
               const lum = cells[row][col];
               const white = clampNumber((lum - low) / contrast, 0, 1);
               const expectedWhite = !!expected[row][col];
               const cellScore = expectedWhite ? white : (1 - white);
               score += cellScore;
               if (expectedWhite ? lum > threshold : lum < threshold) { matches += 1; }
          }
     }

     return { score: score, matches: matches };
}

/* ---------------------------------------------- 
     Marker Edge Dark Score 
----------------------------------------------  */
function markerEdgeDarkScore(imageData, width, height, box, threshold) {
     const data = imageData.data;
     const points = [];
     const margin = 0.035;
     for (let i = 0; i < 12; i += 1) {
          const t = (i + 0.5) / 12;
          points.push([box.x + box.w * t, box.y + box.h * margin]);
          points.push([box.x + box.w * t, box.y + box.h * (1 - margin)]);
          points.push([box.x + box.w * margin, box.y + box.h * t]);
          points.push([box.x + box.w * (1 - margin), box.y + box.h * t]);
     }
     let dark = 0;
     points.forEach(function(point) {
          if (patchLum(data, width, height, point[0], point[1], 2) < threshold + 12) { dark += 1; }
     });
     return dark / Math.max(1, points.length);
}

/* ---------------------------------------------- 
     Marker Background Dark Score 
----------------------------------------------  */
function markerBackgroundDarkScore(imageData, width, height, box, threshold) {
     const data = imageData.data;
     const points = [];
     const pad = 52 / 600;
     const gap = 24 / 600;
     const cell = (1 - (pad * 2) - (gap * 5)) / 6;

     for (let row = 0; row <= 6; row += 1) {
          for (let col = 0; col <= 6; col += 1) {
               const rx = pad + col * (cell + gap) - gap / 2;
               const ry = pad + row * (cell + gap) - gap / 2;
               if (rx <= 0.04 || ry <= 0.04 || rx >= 0.96 || ry >= 0.96) { continue; }
               points.push([box.x + box.w * rx, box.y + box.h * ry]);
          }
     }

     let dark = 0;
     points.forEach(function(point) {
          if (patchLum(data, width, height, point[0], point[1], 2) < threshold + 8) { dark += 1; }
     });
     return dark / Math.max(1, points.length);
}

/* ---------------------------------------------- 
     Paper Border Score 
----------------------------------------------  */
function paperBorderScore(imageData, width, height, box) {
     const data = imageData.data;
     const bands = [];
     const offsets = [0.09, 0.16, 0.24];
     const steps = [0.18, 0.34, 0.50, 0.66, 0.82];

     function addBand(name, points) {
          let white = 0;
          let total = 0;
          points.forEach(function(point) {
               const x = point[0];
               const y = point[1];
               if (x < 0 || y < 0 || x >= width || y >= height) { return; }
               const color = sampleColor(data, width, height, x, y, 2);
               if (isPaperLike(color)) { white += 1; }
               total += 1;
          });
          if (total) { bands.push({ name: name, score: white / total }); }
     }

     offsets.forEach(function(offset) {
          addBand("top", steps.map(function(t) { return [box.x + box.w * t, box.y - box.h * offset]; }));
          addBand("bottom", steps.map(function(t) { return [box.x + box.w * t, box.y + box.h * (1 + offset)]; }));
          addBand("left", steps.map(function(t) { return [box.x - box.w * offset, box.y + box.h * t]; }));
          addBand("right", steps.map(function(t) { return [box.x + box.w * (1 + offset), box.y + box.h * t]; }));
     });

     if (!bands.length) { return { score: 0, goodBands: 0 }; }
     const score = average(bands.map(function(band) { return band.score; }));
     const goodBands = bands.filter(function(band) { return band.score >= 0.46; }).length;
     return { score: score, goodBands: goodBands };
}

/* ---------------------------------------------- 
     Is Paper Like 
----------------------------------------------  */
function isPaperLike(color) {
     const lum = rgbLum(color.r, color.g, color.b);
     const max = Math.max(color.r, color.g, color.b);
     const min = Math.min(color.r, color.g, color.b);
     const sat = max === 0 ? 0 : (max - min) / max;
     return (lum > 150 && sat < 0.38) || (lum > 175 && sat < 0.58) || (lum > 205);
}

/* ---------------------------------------------- 
     Handle Visible Detections 
----------------------------------------------  */
function handleVisibleDetections(detections) {
     const now = Date.now();
     const profile = strictnessProfile();
     detections.forEach(function(hit) {
          const key = `${hit.cardId}:${hit.answer}`;
          const memory = scannerDetectionMemory[key] || { hits: 0, firstSeen: now, lastSeen: 0 };
          const keptContinuous = now - memory.lastSeen < CONTINUOUS_RESET_MS;
          memory.hits = keptContinuous ? memory.hits + 1 : 1;
          memory.firstSeen = keptContinuous ? memory.firstSeen : now;
          memory.lastSeen = now;
          memory.bestQuality = Math.max(memory.bestQuality || 0, hit.quality || 0);
          memory.visibleMs = now - memory.firstSeen;
          scannerDetectionMemory[key] = memory;

          const hasEarlyStability = memory.visibleMs >= MIN_OVERLAY_VISIBLE_MS || memory.hits >= Math.max(2, profile.confirmHits);
          if (!hasEarlyStability && hit.quality < profile.immediateQuality) { return; }

          const card = getCard(hit.cardId);
          const recorded = scannerResponses[hit.cardId];
          const labelName = card ? card.name : hit.cardId;
          scannerGhosts[hit.cardId] = {
               cardId: hit.cardId,
               answer: hit.answer,
               box: hit.box,
               lastSeen: now,
               firstSeen: memory.firstSeen,
               visibleMs: memory.visibleMs,
               quality: hit.quality,
               labelName: labelName
          };

          if (recorded) { return; }
          if (pendingFor(hit.cardId)) { return; }
          if (memory.visibleMs < MIN_REGISTER_VISIBLE_MS) { return; }
          submitScan(hit.cardId, hit.answer, "phone-camera-6x6", false);
     });

     cleanupOldMemory(now);
}

/* ---------------------------------------------- 
     Pending For 
----------------------------------------------  */
function pendingFor(cardId) {
     const key = `${scannerQuestionIndex}:${cardId}`;
     const pending = scannerPendingAck[key];
     return pending && Date.now() - pending.createdAt < 5000;
}

/* ---------------------------------------------- 
     Submit Scan 
----------------------------------------------  */
async function submitScan(cardId, answer, source, forceUpdate) {
     cardId = normalizeCardId(cardId);
     if (!sessionId || !cardId) { setStatus("Missing session or card ID.", true); return; }
     if (scannerRoster.length && !scannerRosterById[cardId]) { setStatus(`${cardId} is not part of this session.`, true); return; }

     const existing = scannerResponses[cardId];
     if (existing && !forceUpdate) {
          setStatus(`${displayName(cardId)} already has ${existing.answer}. Tap the card overlay to update.`, false, "good");
          return;
     }

     const questionIndex = scannerQuestionIndex || await getCurrentQuestionIndex();
     const scan = {
          sessionId: sessionId,
          questionIndex: questionIndex,
          cardId: cardId,
          studentName: displayName(cardId),
          answer: answer,
          source: source || "phone-camera",
          timestamp: new Date().toISOString()
     };
     const pendingKey = `${questionIndex}:${cardId}`;
     scannerPendingAck[pendingKey] = { answer: answer, createdAt: Date.now(), keepYellowUntil: Date.now() + 900 };
     setStatus(`NEW! ${displayName(cardId)}: ${answer} • waiting briefly for game confirmation`, false);
     addLog(cardId, answer, "new");

     fetch(`${apiBase}/quizScan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scan)
     }).then(function(response) {
          if (!response.ok) { throw new Error(`Wix API ${response.status}`); }
          setTimeout(function() { loadSessionState(true); }, 240);
          setTimeout(function() { confirmPendingFallback(pendingKey, answer); }, 1300);
     }).catch(function(error) {
          console.warn(error);
          setStatus(`Saved locally only: ${error.message}`, true);
     });
}

/* ---------------------------------------------- 
     Confirm Pending Fallback 
----------------------------------------------  */
function confirmPendingFallback(pendingKey, answer) {
     const parts = pendingKey.split(":");
     const questionIndex = Number(parts[0]);
     const cardId = parts[1];
     if (questionIndex !== scannerQuestionIndex) { return; }
     if (scannerPendingAck[pendingKey] && !scannerResponses[cardId]) {
          scannerResponses[cardId] = { cardId: cardId, answer: answer, pendingFallback: true };
          delete scannerPendingAck[pendingKey];
          renderPendingStudents();
          setStatus(`OK ${displayName(cardId)}: ${answer}`, false, "good");
     }
}

/* ---------------------------------------------- 
     Start Session Polling 
----------------------------------------------  */
function startSessionPolling() {
     clearInterval(scannerSessionTimer);
     scannerSessionTimer = setInterval(function() { loadSessionState(false); }, SESSION_POLL_MS);
}

/* ---------------------------------------------- 
     Parse Maybe JSON 
----------------------------------------------  */
function parseMaybeJson(value, fallback) {
     if (Array.isArray(value) || (value && typeof value == "object")) { return value; }
     if (typeof value != "string") { return fallback; }
     try { return JSON.parse(value); }
     catch (error) { return fallback; }
}

/* ---------------------------------------------- 
     Unpack Session Data 
----------------------------------------------  */
function unpackSessionData(data) {
     let item = data && (data.item || data.session || data.data || data);
     item = parseMaybeJson(item, item) || {};
     if (item.item || item.session || item.data) { item = unpackSessionData(item); }
     if (item.payload) {
          const payload = parseMaybeJson(item.payload, null);
          if (payload && typeof payload == "object") { item = Object.assign({}, item, payload); }
     }
     if (item.value) {
          const value = parseMaybeJson(item.value, null);
          if (value && typeof value == "object") { item = Object.assign({}, item, value); }
     }
     return item || {};
}

/* ---------------------------------------------- 
     Normalize Session Cards 
----------------------------------------------  */
function normalizeSessionCards(rawCards) {
     const parsed = parseMaybeJson(rawCards, []);
     if (!Array.isArray(parsed)) { return []; }
     return parsed.map(function(card, index) {
          const source = card && typeof card == "object" ? card : { cardId: card };
          const cardId = normalizeCardId(source.cardId || source.id || source.number || index + 1);
          if (!cardId) { return null; }
          return {
               cardId: cardId,
               name: source.name || source.studentName || source.fullName || source.label || `Student ${index + 1}`
          };
     }).filter(Boolean);
}

/* ---------------------------------------------- 
     Normalize Response Items 
----------------------------------------------  */
function normalizeResponseItems(data) {
     const raw = data && (data.items || data.responses || data.data || data.item || []);
     const parsed = parseMaybeJson(raw, []);
     if (Array.isArray(parsed)) { return parsed; }
     if (parsed && typeof parsed == "object") { return Object.values(parsed); }
     return [];
}

/* ---------------------------------------------- 
     Load Session State 
----------------------------------------------  */
async function loadSessionState(force) {
     if (scannerSessionBusy || !sessionId) { renderPendingStudents(); return; }
     if (!force && Date.now() - scannerSessionLoadedAt < SESSION_POLL_MS - 40) { return; }
     scannerSessionBusy = true;
     try {
          const sessionResponse = await fetch(`${apiBase}/quizSession?sessionId=${encodeURIComponent(sessionId)}&t=${Date.now()}`, { cache: "no-store" });
          if (sessionResponse.ok) {
               const data = await sessionResponse.json();
               scannerSessionCache = unpackSessionData(data);
               scannerSessionLoadedAt = Date.now();
               scannerQuestionIndex = Number(scannerSessionCache.currentQuestionIndex || scannerSessionCache.current || scannerSessionCache.questionIndex || 0);
               scannerRoster = normalizeSessionCards(scannerSessionCache.cards || scannerSessionCache.roster || scannerSessionCache.students || []);
               scannerRosterById = {};
               scannerRoster.forEach(function(card) { scannerRosterById[normalizeCardId(card.cardId)] = card; });
          }

          if (scannerSessionCache) {
               const responsesResponse = await fetch(`${apiBase}/quizResponses?sessionId=${encodeURIComponent(sessionId)}&questionIndex=${scannerQuestionIndex}&t=${Date.now()}`, { cache: "no-store" });
               if (responsesResponse.ok) {
                    const responsesData = await responsesResponse.json();
                    scannerResponses = {};
                    normalizeResponseItems(responsesData).forEach(function(item) {
                         const cardId = normalizeCardId(item.cardId || item.id || item.studentCardId);
                         if (cardId) { scannerResponses[cardId] = Object.assign({}, item, { cardId: cardId }); }
                    });
               }
          }
          resolvePendingAcks();
          renderPendingStudents();
     }
     catch (error) {
          console.warn(error);
          renderPendingStudents();
     }
     scannerSessionBusy = false;
}
/* ---------------------------------------------- 
     Resolve Pending Acks 
----------------------------------------------  */
function resolvePendingAcks() {
     Object.keys(scannerPendingAck).forEach(function(key) {
          const parts = key.split(":");
          const questionIndex = Number(parts[0]);
          const cardId = parts[1];
          const pending = scannerPendingAck[key];
          const recorded = scannerResponses[cardId];
          if (questionIndex === scannerQuestionIndex && recorded && (!pending.answer || recorded.answer === pending.answer)) {
               delete scannerPendingAck[key];
               setStatus(`OK ${displayName(cardId)}: ${recorded.answer}`, false, "good");
          }
          else if (questionIndex !== scannerQuestionIndex) {
               delete scannerPendingAck[key];
          }
     });
}

/* ---------------------------------------------- 
     Get Current Question Index 
----------------------------------------------  */
async function getCurrentQuestionIndex() {
     await loadSessionState(true);
     return scannerQuestionIndex || 0;
}

/* ---------------------------------------------- 
     Render Pending Students 
----------------------------------------------  */
function renderPendingStudents() {
     const count = document.getElementById("pendingCount");
     const list = document.getElementById("pendingStudentList");
     if (!list || !count) { return; }
     if (!scannerRoster.length) {
          count.textContent = scannerSessionCache ? "0 found" : "Loading";
          list.textContent = sessionId ? "Loading session roster..." : "Missing session ID.";
          return;
     }
     const missing = scannerRoster.filter(function(card) { return !scannerResponses[normalizeCardId(card.cardId)]; });
     count.textContent = `${missing.length} left`;
     if (!missing.length) {
          list.innerHTML = `<span class="pending-chip done">All students scanned for this question ✅</span>`;
          return;
     }
     list.innerHTML = missing.map(function(card) {
          return `<span class="pending-chip missing">${escapeHtml(card.name || card.cardId)}</span>`;
     }).join("");
}

/* ---------------------------------------------- 
     Prepare Overlay 
----------------------------------------------  */
function prepareOverlay() {
     if (scannerOverlay) { return; }
     scannerOverlay = document.createElement("canvas");
     scannerOverlay.id = "scannerOverlay";
     const cameraCard = document.querySelector(".camera-card");
     if (cameraCard) { cameraCard.appendChild(scannerOverlay); }
     scannerOverlay.addEventListener("click", handleOverlayTap);
     scannerOverlay.addEventListener("touchend", function(event) {
          event.preventDefault();
          const touch = event.changedTouches && event.changedTouches[0];
          if (touch) { handleOverlayTap(touch); }
     }, { passive: false });
}

/* ---------------------------------------------- 
     Draw Overlay 
----------------------------------------------  */
function drawOverlay() {
     if (!scannerOverlay || !elVideo || !elCanvas) { return; }
     const rect = elVideo.getBoundingClientRect();
     const parentRect = scannerOverlay.parentElement.getBoundingClientRect();
     const dpr = window.devicePixelRatio || 1;
     const cssW = Math.max(1, rect.width);
     const cssH = Math.max(1, rect.height);

     scannerOverlay.style.left = `${rect.left - parentRect.left}px`;
     scannerOverlay.style.top = `${rect.top - parentRect.top}px`;
     scannerOverlay.style.width = `${cssW}px`;
     scannerOverlay.style.height = `${cssH}px`;
     scannerOverlay.width = Math.round(cssW * dpr);
     scannerOverlay.height = Math.round(cssH * dpr);

     const ctx = scannerOverlay.getContext("2d");
     ctx.clearRect(0, 0, scannerOverlay.width, scannerOverlay.height);
     scannerOverlayHits = [];
     const scaleX = scannerOverlay.width / Math.max(1, elCanvas.width);
     const scaleY = scannerOverlay.height / Math.max(1, elCanvas.height);
     const now = Date.now();

     Object.keys(scannerGhosts).forEach(function(cardId) {
          const ghost = scannerGhosts[cardId];
          if (now - ghost.lastSeen > GHOST_MS) {
               delete scannerGhosts[cardId];
               return;
          }
          drawGhost(ctx, ghost, scaleX, scaleY, dpr);
     });
}

/* ---------------------------------------------- 
     Draw Ghost 
----------------------------------------------  */
function drawGhost(ctx, ghost, scaleX, scaleY, dpr) {
     const box = ghost.box;
     const x = box.x * scaleX;
     const y = box.y * scaleY;
     const w = box.w * scaleX;
     const h = box.h * scaleY;
     const state = overlayState(ghost.cardId, ghost.answer);
     const label = overlayLabel(ghost, state);
     const fontSize = Math.max(18 * dpr, Math.min(38 * dpr, Math.round(w * 0.13)));
     const lineWidth = Math.max(4 * dpr, Math.round(w * 0.025));

     ctx.save();
     ctx.strokeStyle = state.color;
     ctx.lineWidth = lineWidth;
     ctx.shadowColor = "rgba(0,0,0,.45)";
     ctx.shadowBlur = 8 * dpr;
     ctx.strokeRect(x, y, w, h);
     ctx.shadowBlur = 0;
     ctx.font = `900 ${fontSize}px Arial, sans-serif`;
     const metrics = ctx.measureText(label);
     const padX = Math.round(fontSize * 0.45);
     const padY = Math.round(fontSize * 0.22);
     const badgeW = Math.min(scannerOverlay.width - 8 * dpr, metrics.width + padX * 2);
     const badgeH = fontSize + padY * 2;
     const badgeX = clampNumber(x + w / 2 - badgeW / 2, 4 * dpr, scannerOverlay.width - badgeW - 4 * dpr);
     const badgeY = clampNumber(y - badgeH - 6 * dpr, 4 * dpr, scannerOverlay.height - badgeH - 4 * dpr);
     ctx.fillStyle = state.fill;
     roundRect(ctx, badgeX, badgeY, badgeW, badgeH, Math.round(badgeH * 0.28));
     ctx.fill();
     ctx.fillStyle = state.text;
     ctx.textBaseline = "middle";
     ctx.fillText(label, badgeX + padX, badgeY + badgeH / 2);
     if (Date.now() - ghost.lastSeen > 350) {
          ctx.font = `800 ${Math.max(11 * dpr, fontSize * 0.45)}px Arial, sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,.92)";
          ctx.fillText("last seen", badgeX + padX, badgeY + badgeH + 13 * dpr);
     }
     scannerOverlayHits.push({ x: x, y: y, w: w, h: h, cardId: ghost.cardId, answer: ghost.answer });
     ctx.restore();
}

/* ---------------------------------------------- 
     Overlay State 
----------------------------------------------  */
function overlayState(cardId, answer) {
     const pending = scannerPendingAck[`${scannerQuestionIndex}:${cardId}`];
     if (pending) {
          return { label: "NEW!", color: "#ffe04a", fill: "rgba(255,224,74,.97)", text: "#123865" };
     }
     const recorded = scannerResponses[cardId];
     if (recorded) {
          return { label: "OK", color: "#32d66b", fill: "rgba(67,218,111,.95)", text: "#123865", recorded: recorded };
     }
     return { label: "READY", color: "#16407d", fill: "rgba(18,56,101,.95)", text: "#ffffff" };
}

/* ---------------------------------------------- 
     Overlay Label 
----------------------------------------------  */
function overlayLabel(ghost, state) {
     const name = displayName(ghost.cardId);
     if (state.recorded && state.recorded.answer && state.recorded.answer !== ghost.answer) {
          return `${name} • ${ghost.answer} • OK ${state.recorded.answer} saved`;
     }
     if (!state.recorded && state.label === "READY" && ghost.visibleMs < MIN_REGISTER_VISIBLE_MS) {
          return `${name} • ${ghost.answer} • HOLD`;
     }
     return `${name} • ${ghost.answer} • ${state.label}`;
}

/* ---------------------------------------------- 
     Handle Overlay Tap 
----------------------------------------------  */
function handleOverlayTap(event) {
     const rect = scannerOverlay.getBoundingClientRect();
     const dpr = window.devicePixelRatio || 1;
     const x = (event.clientX - rect.left) * dpr;
     const y = (event.clientY - rect.top) * dpr;
     for (let i = scannerOverlayHits.length - 1; i >= 0; i -= 1) {
          const hit = scannerOverlayHits[i];
          if (x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) {
               submitScan(hit.cardId, hit.answer, "phone-camera-tap-update", true);
               return;
          }
     }
}

/* ---------------------------------------------- 
     Add Log 
----------------------------------------------  */
function addLog(cardId, answer, state) {
     if (!elLog) { return; }
     const row = document.createElement("div");
     row.className = `log-row ${state || ""}`;
     row.innerHTML = `<span>${escapeHtml(displayName(cardId))}</span><span>${escapeHtml(answer)}</span>`;
     elLog.prepend(row);
}

/* ---------------------------------------------- 
     Get Card 
----------------------------------------------  */
function getCard(cardId) {
     return scannerRosterById[normalizeCardId(cardId)] || null;
}

/* ---------------------------------------------- 
     Display Name 
----------------------------------------------  */
function displayName(cardId) {
     const card = getCard(cardId);
     return card && card.name ? card.name : normalizeCardId(cardId);
}

/* ---------------------------------------------- 
     Utility Functions 
----------------------------------------------  */
function cleanupOldMemory(now) {
     const profile = strictnessProfile();
     Object.keys(scannerDetectionMemory).forEach(function(key) {
          if (now - scannerDetectionMemory[key].lastSeen > profile.memoryKeepMs) { delete scannerDetectionMemory[key]; }
     });
}

function nonMaxDetections(detections) {
     const profile = strictnessProfile();
     const results = [];
     detections.sort(function(a, b) { return b.quality - a.quality; }).forEach(function(item) {
          for (const kept of results) {
               if (boxIoU(item.box, kept.box) > profile.nmsIoU) { return; }
          }
          results.push(item);
     });
     return results.slice(0, profile.maxDetections);
}

function boxIoU(a, b) {
     const x1 = Math.max(a.x, b.x);
     const y1 = Math.max(a.y, b.y);
     const x2 = Math.min(a.x + a.w, b.x + b.w);
     const y2 = Math.min(a.y + a.h, b.y + b.h);
     const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
     const union = a.w * a.h + b.w * b.h - intersection;
     return union <= 0 ? 0 : intersection / union;
}

function rgbLum(r, g, b) {
     return r * 0.299 + g * 0.587 + b * 0.114;
}

function sampleColor(data, width, height, x, y, radius) {
     let r = 0;
     let g = 0;
     let b = 0;
     let count = 0;
     const cx = Math.round(x);
     const cy = Math.round(y);
     for (let yy = -radius; yy <= radius; yy += 1) {
          for (let xx = -radius; xx <= radius; xx += 1) {
               const sx = Math.max(0, Math.min(width - 1, cx + xx));
               const sy = Math.max(0, Math.min(height - 1, cy + yy));
               const index = (sy * width + sx) * 4;
               r += data[index];
               g += data[index + 1];
               b += data[index + 2];
               count += 1;
          }
     }
     return { r: r / count, g: g / count, b: b / count };
}

function patchLum(data, width, height, x, y, radius) {
     const color = sampleColor(data, width, height, x, y, radius);
     return rgbLum(color.r, color.g, color.b);
}

function average(values) {
     if (!values.length) { return 0; }
     return values.reduce(function(total, item) { return total + item; }, 0) / values.length;
}

function uniqueNumbers(values) {
     const seen = {};
     return values.filter(function(value) {
          const key = String(Math.round(value));
          if (seen[key]) { return false; }
          seen[key] = true;
          return true;
     });
}

function clampNumber(value, min, max) {
     return Math.max(min, Math.min(max, value));
}

function roundRect(ctx, x, y, w, h, r) {
     ctx.beginPath();
     if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); }
     else {
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
     }
}

function setStatus(message, bad, goodClass) {
     if (!elStatus) { return; }
     elStatus.textContent = message;
     elStatus.classList.toggle("bad", !!bad);
     elStatus.classList.toggle("good", goodClass === "good");
}

function escapeHtml(value) {
     return String(value || "").replace(/[&<>\"]/g, function(match) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" }[match];
     });
}
