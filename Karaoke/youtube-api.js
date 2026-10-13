// Official YouTube endpoints. The versioned fallback was verified on 2026-10-13.
const sources=[
 'https://www.youtube.com/iframe_api',
 'https://www.youtube-nocookie.com/s/player/ec429320/www-widgetapi.vflset/www-widgetapi.js'
];
export function createYouTubeApiLoader({scope=globalThis,doc=globalThis.document,timeoutMs=7000}={}){
 let pending;
 return function loadYouTubeApi(){
  if(scope.YT?.Player)return Promise.resolve(scope.YT);
  if(pending)return pending;
  const attempt=new Promise((resolve,reject)=>{
   let index=0,script,timer,finished=false;
   const previous=scope.onYouTubeIframeAPIReady;
   const cleanup=()=>{clearTimeout(timer);if(script){script.onerror=null;script.onload=null;script.remove()}if(scope.onYouTubeIframeAPIReady===ready)scope.onYouTubeIframeAPIReady=previous};
   const ready=()=>{if(finished||!scope.YT?.Player)return;finished=true;cleanup();resolve(scope.YT);try{previous?.()}catch{/* An unrelated callback cannot break playback. */}};
   const next=()=>{
    if(finished)return;
    clearTimeout(timer);
    if(script){script.onerror=null;script.onload=null;script.remove()}
    if(scope.YT?.Player){ready();return}
    if(index===sources.length){finished=true;cleanup();reject(new Error('No se pudo conectar con YouTube. El navegador o la red bloqueó las dos conexiones. Abre esta app en Chrome o Edge y prueba otra red, o utiliza la canción del concurso sin conexión.'));return}
    script=doc.createElement('script');script.src=sources[index++];script.async=true;script.onerror=next;
    script.onload=ready;
    timer=setTimeout(next,timeoutMs);doc.head.append(script);
   };
   scope.onYouTubeIframeAPIReady=ready;next();
  });
  pending=attempt;
  attempt.catch(()=>{if(pending===attempt)pending=null});
  return attempt;
 };
}
export const loadYouTubeApi=createYouTubeApiLoader();
