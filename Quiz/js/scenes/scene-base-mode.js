"use strict";
/* ---------------------------------------------- 
     Scene Base Mode Made by: David Santana 
----------------------------------------------  */

window.WhiteboardGameScenes = window.WhiteboardGameScenes || {};

/* ---------------------------------------------- 
     Bind Base Mode Scene 
----------------------------------------------  */
function bindBaseModeScene() {
     const backButton = document.getElementById("backToPoolFromBaseBtn");
     const whiteboardButton = document.getElementById("btnBaseWhiteboard");
     const paperButton = document.getElementById("btnBasePaper");

     if (backButton) {
          backButton.addEventListener("click", function() {
               playSound("back");
               showScreen("poolSelect");
          });
     }

     if (whiteboardButton) {
          whiteboardButton.addEventListener("click", function() {
               playSound("start");
               state.baseMode = "whiteboard";
               showScreen("modeSelect");
          });
     }

     if (paperButton) {
          paperButton.addEventListener("click", function() {
               playSound("start");
               state.baseMode = "paper";
               showScreen("paperLobby");
          });
     }
}

/* ---------------------------------------------- 
     Create Scene 
----------------------------------------------  */
/* ---------------------------------------------- 
     Base Mode Select 
----------------------------------------------  */
window.WhiteboardGameScenes.baseModeSelect = function(api) {
     return {
          id: "baseModeSelect",
          screenId: "baseModeScreen",
          aliases: ["baseMode", "base", "baseModeScreen"],
          /* ---------------------------------------------- 
               Init 
          ----------------------------------------------  */
          init: function() {
               bindBaseModeScene();
          },
          /* ---------------------------------------------- 
               On Enter 
          ----------------------------------------------  */
          onEnter: function() {
               api.audio.stopBgm("round");
               api.audio.stopBgm("podium");
               api.audio.startBgm("title");
          }
     };
};
