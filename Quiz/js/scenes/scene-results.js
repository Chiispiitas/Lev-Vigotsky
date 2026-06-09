"use strict";
/* ---------------------------------------------- 
     Scene Results Made by: David Santana 
----------------------------------------------  */

window.WhiteboardGameScenes = window.WhiteboardGameScenes || {};

/* ---------------------------------------------- 
     Add Button Listeners 
----------------------------------------------  */
/* ---------------------------------------------- 
     Bind Results Scene 
----------------------------------------------  */
function bindResultsScene() {
     document.getElementById("playAgainBtn").addEventListener("click", function() {
          playSound("reset");
          resetToPool();
     });
}

/* ---------------------------------------------- 
     Show Podium 
----------------------------------------------  */
function showPodium() {
  clearInterval(state.timerId);
  stopBgm("round");
  $("#countdownOverlay").classList.add("hidden");
  const ranking = [...state.teams].sort((a,b) => b.score - a.score);
  const podium = $("#podiumArea");
  podium.innerHTML = "";
  ranking.forEach((team, i) => {
    const card = document.createElement("div");
    card.className = `podium-card rank-${i + 1}`;
    card.style.animationDelay = `${i * .14}s`;
    card.innerHTML = `
      <div class="podium-emoji">${team.emoji}</div>
      <div class="podium-name">${esc(team.name)}</div>
      <div class="podium-score">${team.score} pts</div>
      <div class="podium-step">${i + 1}</div>
    `;
    podium.appendChild(card);
  });
  makeConfetti();
  showScreen("results");
}
/* ---------------------------------------------- 
     Make Confetti 
----------------------------------------------  */
function makeConfetti() {
  const layer = $("#confettiLayer");
  layer.innerHTML = "";
  for (let i = 0; i < 120; i++) {
    const c = document.createElement("span");
    c.className = "confetti";
    c.style.left = `${Math.random() * 100}%`;
    c.style.animationDelay = `${Math.random() * 4}s`;
    c.style.animationDuration = `${2.8 + Math.random() * 2.4}s`;
    c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    layer.appendChild(c);
  }
}
/* ---------------------------------------------- 
     Reset To Pool 
----------------------------------------------  */
function resetToPool() {
  clearInterval(state.timerId);
  stopBgm("round");
  stopBgm("podium");
  startBgm("title");
  state.resolving = false;
  state.resultsShown = false;
  $("#countdownOverlay").classList.add("hidden");
  showScreen("poolSelect");
}

/* ---------------------------------------------- 
     Create Scene 
----------------------------------------------  */
/* ---------------------------------------------- 
     Results 
----------------------------------------------  */
window.WhiteboardGameScenes.results = function(api) {
     return {
          id: "results",
          screenId: "podiumScreen",
          aliases: ["podium", "podiumScreen", "resultsScreen"],
          /* ---------------------------------------------- 
               Init 
          ----------------------------------------------  */
          init: function() {
               bindResultsScene();
          },
          /* ---------------------------------------------- 
               On Enter 
          ----------------------------------------------  */
          onEnter: function() {
               api.audio.stopAllBgm();
               api.audio.playPodiumMp3();
          }
     };
};
