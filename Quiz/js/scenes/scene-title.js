"use strict";
/* ---------------------------------------------- 
     Scene Title Made by: David Santana 
----------------------------------------------  */

window.WhiteboardGameScenes = window.WhiteboardGameScenes || {};

/* ---------------------------------------------- 
     Add Button Listeners 
----------------------------------------------  */
/* ---------------------------------------------- 
     Bind Title Start 
----------------------------------------------  */
function bindTitleStart() {
  const titleScreen = $("#titleScreen");
  if (!titleScreen) return;

  /* ---------------------------------------------- 
       Enter Menu 
  ----------------------------------------------  */
  const enterMenu = (event) => {
    if (!screens.title.classList.contains("active")) return;
    if (event && event.type === "keydown") event.preventDefault();
    playSound("start");
    startBgm("title");
    titleScreen.classList.add("leaving");
    setTimeout(() => {
      titleScreen.classList.remove("leaving");
      showScreen("poolSelect");
    }, 360);
  };

  titleScreen.addEventListener("pointerdown", enterMenu);
  document.addEventListener("keydown", enterMenu);
}

/* ---------------------------------------------- 
     Create Scene 
----------------------------------------------  */
/* ---------------------------------------------- 
     Title 
----------------------------------------------  */
window.WhiteboardGameScenes.title = function(api) {
     return {
          id: "title",
          screenId: "titleScreen",
          aliases: ["titleScreen"],
          /* ---------------------------------------------- 
               Init 
          ----------------------------------------------  */
          init: function() {
               bindTitleStart();
          },
          /* ---------------------------------------------- 
               On Enter 
          ----------------------------------------------  */
          onEnter: function() {
               api.audio.startBgm("title");
          }
     };
};
