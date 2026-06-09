"use strict";
/* ---------------------------------------------- 
     Scene Mode Select Made by: David Santana 
----------------------------------------------  */

window.WhiteboardGameScenes = window.WhiteboardGameScenes || {};

/* ---------------------------------------------- 
     Bind Mode Select Scene 
----------------------------------------------  */
function bindModeSelectScene() {
     bindModeMenuEffects();

     document.getElementById("backToPoolFromModeBtn").addEventListener("click", function() {
          playSound("back");
          showScreen("poolSelect");
     });

     const btnModeTug = document.getElementById("btnModeTug");
     const btnModeQuiz = document.getElementById("btnModeQuiz");
     const btnTeam2 = document.getElementById("modeTeam2Btn");
     const btnTeam4 = document.getElementById("modeTeam4Btn");
     const continueBtn = document.getElementById("continueModeBtn");

     if (btnModeTug) {
          btnModeTug.addEventListener("click", function() {
               playSound("start");
               selectGameMode("tugOfWar");
          });
     }

     if (btnModeQuiz) {
          btnModeQuiz.addEventListener("click", function() {
               playSound("start");
               selectGameMode("quiz");
          });
     }

     if (btnTeam2) {
          btnTeam2.addEventListener("click", function() {
               if (btnTeam2.disabled) { return; }
               playSound("select");
               state.teamCount = 2;
               refreshModeChoiceBar();
          });
     }

     if (btnTeam4) {
          btnTeam4.addEventListener("click", function() {
               if (btnTeam4.disabled) { return; }
               playSound("select");
               state.teamCount = 4;
               refreshModeChoiceBar();
          });
     }

     if (continueBtn) {
          continueBtn.addEventListener("click", function() {
               if (!state.selectedMode) { return; }
               playSound("enter");
               createTeams();
               renderTeamEditor();
               showScreen("teamSelect");
          });
     }
}

/* ---------------------------------------------- 
     Select Game Mode 
----------------------------------------------  */
function selectGameMode(mode) {
     state.selectedMode = mode;

     if (state.selectedMode == "tugOfWar") {
          state.teamCount = 2;
     }
     else if (![2, 4].includes(state.teamCount)) {
          state.teamCount = 2;
     }

     refreshModeCardState();
     refreshModeChoiceBar();
}

/* ---------------------------------------------- 
     Refresh Mode Card State 
----------------------------------------------  */
function refreshModeCardState() {
     const btnModeTug = document.getElementById("btnModeTug");
     const btnModeQuiz = document.getElementById("btnModeQuiz");
     const tugCard = btnModeTug ? btnModeTug.closest(".mode-category-card") : null;
     const quizCard = btnModeQuiz ? btnModeQuiz.closest(".mode-category-card") : null;

     if (btnModeTug) { btnModeTug.classList.toggle("selected-mode", state.selectedMode == "tugOfWar"); }
     if (btnModeQuiz) { btnModeQuiz.classList.toggle("selected-mode", state.selectedMode == "quiz"); }
     if (tugCard) { tugCard.classList.toggle("selected-card", state.selectedMode == "tugOfWar"); }
     if (quizCard) { quizCard.classList.toggle("selected-card", state.selectedMode == "quiz"); }
}

/* ---------------------------------------------- 
     Refresh Mode Choice Bar 
----------------------------------------------  */
function refreshModeChoiceBar() {
     const bar = document.getElementById("modeChoiceBar");
     const title = document.getElementById("modeChoiceTitle");
     const hint = document.getElementById("modeChoiceHint");
     const btnTeam2 = document.getElementById("modeTeam2Btn");
     const btnTeam4 = document.getElementById("modeTeam4Btn");
     const continueBtn = document.getElementById("continueModeBtn");

     if (!bar || !title || !hint || !btnTeam2 || !btnTeam4 || !continueBtn) { return; }

     if (!state.selectedMode) {
          bar.classList.add("hidden");
          continueBtn.disabled = true;
          return;
     }

     bar.classList.remove("hidden");

     if (state.selectedMode == "tugOfWar") {
          title.textContent = "Tug-of-War selected";
          hint.textContent = "This mode only allows 2 teams.";
          btnTeam2.disabled = false;
          btnTeam4.disabled = true;
          state.teamCount = 2;
          continueBtn.textContent = "Continue to Teams ▶";
     }
     else {
          title.textContent = "Quiz selected";
          hint.textContent = "Choose how many teams will play Quiz.";
          btnTeam2.disabled = false;
          btnTeam4.disabled = false;
          continueBtn.textContent = "Continue to Teams ▶";
     }

     btnTeam2.classList.toggle("active", state.teamCount == 2);
     btnTeam4.classList.toggle("active", state.teamCount == 4 && !btnTeam4.disabled);
     continueBtn.disabled = false;
}

/* ---------------------------------------------- 
     Bind Mode Menu Effects 
----------------------------------------------  */
function bindModeMenuEffects() {
     const modeScreen = document.getElementById("modeScreen");
     if (!modeScreen) { return; }

     let lastHoverSound = 0;

     modeScreen.addEventListener("pointerenter", function(event) {
          const target = event.target.closest(".mode-btn:not(:disabled), .small-btn, .mode-category-card, .mode-team-seg:not(:disabled), #continueModeBtn:not(:disabled)");
          if (!target) { return; }

          const now = performance.now();
          if (now - lastHoverSound > 85) {
               playSound("click");
               lastHoverSound = now;
          }
     }, true);

     modeScreen.addEventListener("pointerdown", function(event) {
          const target = event.target.closest(".mode-btn:not(:disabled), .small-btn, .mode-category-card, .mode-team-seg:not(:disabled), #continueModeBtn:not(:disabled)");
          if (!target) { return; }
          makeModeMenuBurst(event.clientX, event.clientY);
     });
}

/* ---------------------------------------------- 
     Make Mode Menu Burst 
----------------------------------------------  */
function makeModeMenuBurst(clientX, clientY) {
     const modeScreen = document.getElementById("modeScreen");
     const stage = document.getElementById("stage");
     if (!modeScreen || !stage) { return; }

     const rect = stage.getBoundingClientRect();
     const scaleX = 1920 / rect.width;
     const scaleY = 1080 / rect.height;
     const x = (clientX - rect.left) * scaleX;
     const y = (clientY - rect.top) * scaleY;

     for (let i = 0; i < 12; i++) {
          const particle = document.createElement("i");
          particle.className = "menu-pop-particle";
          const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.26;
          const distance = 54 + Math.random() * 54;
          particle.style.left = `${x}px`;
          particle.style.top = `${y}px`;
          particle.style.setProperty("--mx", `${Math.cos(angle) * distance}px`);
          particle.style.setProperty("--my", `${Math.sin(angle) * distance}px`);
          modeScreen.appendChild(particle);
          setTimeout(function() { particle.remove(); }, 700);
     }
}

/* ---------------------------------------------- 
     Create Scene 
----------------------------------------------  */
/* ---------------------------------------------- 
     Mode Select 
----------------------------------------------  */
window.WhiteboardGameScenes.modeSelect = function(api) {
     return {
          id: "modeSelect",
          screenId: "modeScreen",
          aliases: ["mode", "modes", "modeScreen"],
          /* ---------------------------------------------- 
               Init 
          ----------------------------------------------  */
          init: function() {
               bindModeSelectScene();
          },
          /* ---------------------------------------------- 
               On Enter 
          ----------------------------------------------  */
          onEnter: function() {
               api.audio.stopBgm("round");
               api.audio.stopBgm("podium");
               api.audio.startBgm("title");
               refreshModeCardState();
               refreshModeChoiceBar();
          }
     };
};
