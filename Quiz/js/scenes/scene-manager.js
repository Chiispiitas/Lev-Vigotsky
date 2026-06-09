"use strict";
/* ---------------------------------------------- 
     Scene Manager Made by: David Santana 
----------------------------------------------  */

var sceneCurrent = "title";
var sceneHash = {};
var sceneAliases = {};

/* ---------------------------------------------- 
     Load Scene 
----------------------------------------------  */
/* ---------------------------------------------- 
     Scene Load 
----------------------------------------------  */
function sceneLoad(scene, payload) {
     return SceneManager.go(scene, payload || {});
}
/* ---------------------------------------------- 
     Register Scene 
----------------------------------------------  */
/* ---------------------------------------------- 
     Scene Register 
----------------------------------------------  */
function sceneRegister(name, scene) {
     if (!name || !scene) { return; }
     sceneHash[name] = scene;

     if (scene.aliases) {
          scene.aliases.forEach(function(alias) {
               sceneAliases[alias] = name;
          });
     }

     if (typeof scene.init == "function") { scene.init(); }
}
/* ---------------------------------------------- 
     Resolve Scene 
----------------------------------------------  */
/* ---------------------------------------------- 
     Scene Resolve 
----------------------------------------------  */
function sceneResolve(scene) {
     return sceneAliases[scene] || scene;
}
/* ---------------------------------------------- 
     Show Scene 
----------------------------------------------  */
/* ---------------------------------------------- 
     Scene Show 
----------------------------------------------  */
function sceneShow(scene) {
     let sceneData = sceneHash[scene];
     if (!sceneData) { return; }

     let sceneElement = sceneData.screen || document.getElementById(sceneData.screenId);
     if (!sceneElement) { return; }

     sceneElement.classList.add("active");
     sceneElement.style.opacity = 1;
     sceneElement.style.visibility = "visible";
}
/* ---------------------------------------------- 
     Hide Scene 
----------------------------------------------  */
/* ---------------------------------------------- 
     Scene Hide 
----------------------------------------------  */
function sceneHide(scene) {
     let sceneData = sceneHash[scene];
     if (!sceneData) { return; }

     let sceneElement = sceneData.screen || document.getElementById(sceneData.screenId);
     if (!sceneElement) { return; }

     sceneElement.classList.remove("active");
     sceneElement.style.opacity = 0;
     sceneElement.style.visibility = "hidden";
}
/* ---------------------------------------------- 
     Scene Manager API 
----------------------------------------------  */
var SceneManager = {
     /* ---------------------------------------------- 
          Set Aliases 
     ----------------------------------------------  */
     setAliases: function(aliases) {
          Object.keys(aliases || {}).forEach(function(key) {
               sceneAliases[key] = aliases[key];
          });
     },

     /* ---------------------------------------------- 
          Register 
     ----------------------------------------------  */
     register: function(name, scene) {
          sceneRegister(name, scene);
     },

     /* ---------------------------------------------- 
          Go 
     ----------------------------------------------  */
     go: function(scene, payload) {
          let resolvedScene = sceneResolve(scene);
          let nextScene = sceneHash[resolvedScene];
          if (!nextScene) { return false; }

          let previousScene = sceneCurrent;
          if (sceneHash[sceneCurrent] && typeof sceneHash[sceneCurrent].onExit == "function") {
               sceneHash[sceneCurrent].onExit({ from: previousScene, to: resolvedScene, payload: payload || {} });
          }

          document.querySelectorAll(".screen").forEach(function(screen) {
               screen.classList.remove("active");
               screen.style.opacity = 0;
               screen.style.visibility = "hidden";
          });

          sceneCurrent = resolvedScene;
          sceneShow(resolvedScene);

          if (typeof nextScene.onEnter == "function") {
               nextScene.onEnter({ from: previousScene, to: resolvedScene, payload: payload || {} });
          }
          return true;
     },

     /* ---------------------------------------------- 
          Is 
     ----------------------------------------------  */
     is: function(scene) {
          return sceneCurrent == sceneResolve(scene);
     }
};

window.SceneManager = SceneManager;
window.WhiteboardGameScenes = window.WhiteboardGameScenes || {};
