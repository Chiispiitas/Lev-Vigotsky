"use strict";
/* ---------------------------------------------- 
     Scene Team Select Made by: David Santana 
----------------------------------------------  */

window.WhiteboardGameScenes = window.WhiteboardGameScenes || {};

/* ---------------------------------------------- 
     Add Button Listeners 
----------------------------------------------  */
/* ---------------------------------------------- 
     Bind Team Select Scene 
----------------------------------------------  */
function bindTeamSelectScene() {
     document.getElementById("backToPoolBtn").addEventListener("click", function() {
          playSound("back");
          showScreen("modeSelect");
     });

     document.getElementById("startGameBtn").addEventListener("click", function() {
          playSound("start");
          if (state.selectedMode == "tugOfWar") { startTugOfWar(); }
          else { startGame(); }
     });
}

/* ---------------------------------------------- 
     Create Teams 
----------------------------------------------  */
function createTeams() {
  state.teams = Array.from({length: state.teamCount}, (_, i) => ({
    id: i,
    emoji: EMOJIS[i],
    name: `Team ${i + 1}`,
    score: 0,
    answer: null,
    answerText: "",
    answerTimeMs: 0,
    submitted: false,
    correct: false
  }));
  state.activeNameTeamId = 0;
}
/* ---------------------------------------------- 
     Render Team Editor 
----------------------------------------------  */
function renderTeamEditor() {
  const grid = $("#teamEditorGrid");
  grid.className = `team-grid team-editor ${state.teamCount === 2 ? "two" : "four"}`;
  grid.innerHTML = "";

  state.teams.forEach(team => {
    const card = document.createElement("article");
    card.className = "team-editor-card";
    card.innerHTML = `
      <div class="team-title-line">
        <div class="big-emoji">${team.emoji}</div>
        <input class="team-name-input" readonly maxlength="18" value="${esc(team.name)}" data-team-name="${team.id}" />
      </div>
      <div class="emoji-row">
        ${EMOJIS.map(e => `<button class="emoji-btn ${e === team.emoji ? "selected" : ""}" data-team-id="${team.id}" data-emoji="${e}">${e}</button>`).join("")}
      </div>
      <div class="team-keyboard" data-name-keyboard="${team.id}">${keyboardHtml(team.id, "name")}</div>
    `;
    grid.appendChild(card);
  });

  $$(".team-name-input").forEach(input => input.addEventListener("click", () => activateNameTeam(Number(input.dataset.teamName))));
  $$(".emoji-btn").forEach(btn => btn.addEventListener("click", () => {
    const team = getTeam(Number(btn.dataset.teamId));
    team.emoji = btn.dataset.emoji;
    playSound("select");
    renderTeamEditor();
  }));
  $$(".team-keyboard .key-btn").forEach(btn => btn.addEventListener("click", () => handleNameKey(btn.dataset.key, Number(btn.dataset.teamId))));
  activateNameTeam(state.activeNameTeamId || 0);
}
/* ---------------------------------------------- 
     Activate Name Team 
----------------------------------------------  */
function activateNameTeam(teamId) {
  state.activeNameTeamId = teamId;
  $$(".team-name-input").forEach(i => i.classList.toggle("active", Number(i.dataset.teamName) === teamId));
  $$(".team-keyboard").forEach(k => k.classList.toggle("active", Number(k.dataset.nameKeyboard) === teamId));
}
/* ---------------------------------------------- 
     Handle Name Key 
----------------------------------------------  */
function handleNameKey(key, teamId = state.activeNameTeamId) {
  const team = getTeam(teamId);
  if (!team) return;
  activateNameTeam(teamId);
  if (key === "BACK") { team.name = team.name.slice(0, -1); playSound("back"); }
  else if (key === "CLEAR") { team.name = ""; playSound("back"); }
  else if (key === "SPACE") { team.name = (team.name + " ").slice(0, 18); playSound("click"); }
  else if (key === "ENTER") {
    playSound("enter");
    activateNameTeam(teamId >= state.teamCount - 1 ? 0 : teamId + 1);
    return;
  } else if (team.name.length < 18) { team.name += key; playSound("click"); }
  const input = $(`.team-name-input[data-team-name="${teamId}"]`);
  if (input) input.value = team.name;
}

/* ---------------------------------------------- 
     Create Scene 
----------------------------------------------  */
/* ---------------------------------------------- 
     Team Select 
----------------------------------------------  */
window.WhiteboardGameScenes.teamSelect = function(api) {
     return {
          id: "teamSelect",
          screenId: "teamScreen",
          aliases: ["teams", "teamScreen"],
          /* ---------------------------------------------- 
               Init 
          ----------------------------------------------  */
          init: function() {
               bindTeamSelectScene();
          },
          /* ---------------------------------------------- 
               On Enter 
          ----------------------------------------------  */
          onEnter: function() {
               api.audio.startBgm("title");
          }
     };
};
