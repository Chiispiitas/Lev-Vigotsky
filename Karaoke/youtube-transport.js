let apiPromise;
function loadApi(){
 if(globalThis.YT?.Player)return Promise.resolve(globalThis.YT);
 if(!apiPromise)apiPromise=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{apiPromise=null;reject(new Error('YouTube no respondió. Comprueba la conexión e inténtalo otra vez.'))},15000);
  const previous=globalThis.onYouTubeIframeAPIReady;
  globalThis.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);previous?.();resolve(globalThis.YT)};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timer);apiPromise=null;reject(new Error('No se pudo conectar con YouTube.'))};document.head.append(script);
 });return apiPromise;
}
export class YouTubeTransport extends EventTarget {
 constructor(apiLoader=loadApi){super();this.apiLoader=apiLoader;this.player=null;this.status=-1;this._volume=.8;this._src='';this.error=null;this.offset=0;this.ended=false;this.readyState=0;this.playbackRate=1;this.seeking=false}
 get src(){return this._src}
 set src(value){if(this._src===value&&!this.error&&this.player){this.pause();this.currentTime=0;return}this.pause();this.player?.destroy();this.player=null;this.loadPromise=null;this._src=value;this.error=null;this.offset=0;this.status=-1;this.readyState=0;this.ended=false}
 get duration(){return this.player?.getDuration?.()||0}
 get currentTime(){return this.player?.getCurrentTime?.()||this.offset}
 set currentTime(value){this.offset=Math.max(0,Number(value)||0);this.ended=false;this.player?.seekTo(this.offset,true)}
 get paused(){return this.status!==1}
 get buffering(){return this.status===3}
 get volume(){return this._volume}
 set volume(value){this._volume=value;this.player?.setVolume(value*100)}
 async load(){
  if(this.loadPromise)return this.loadPromise;
  const videoId=this.src;
  this.loadPromise=(async()=>{
   const YT=await this.apiLoader();if(videoId!==this.src)throw new Error('La canción cambió.');
   let host=document.querySelector('#youtube-host');if(!host){host=document.createElement('section');host.id='youtube-host';host.setAttribute('aria-label','Video de la canción');document.body.append(host)}
   host.hidden=false;host.replaceChildren();const slot=document.createElement('div');host.append(slot);
   await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('El video no respondió. Inténtalo otra vez.')),15000);
    this.player=new YT.Player(slot,{width:480,height:270,videoId,playerVars:{playsinline:1,controls:0,disablekb:1,rel:0,origin:location.origin},events:{
     onReady:()=>{clearTimeout(timeout);this.readyState=4;this.volume=this._volume;resolve()},
     onStateChange:e=>this.onState(e.data),
     onError:e=>{clearTimeout(timeout);const error=new Error(`YouTube no puede reproducir este video (${e.data}). Prueba otra canción.`);this.error=error;reject(error);this.dispatchEvent(new Event('error'))},
     onAutoplayBlocked:()=>{this.error=new Error('Pulsa reproducir en el video de YouTube para continuar.');this.dispatchEvent(new Event('blocked'))}
    }});
   });
   })().catch(error=>{this.loadPromise=null;this.player?.destroy();this.player=null;throw error});return this.loadPromise;
 }
 onState(status){this.status=status;this.ended=status===0;this.dispatchEvent(new Event('statechange'));if(status===0)this.dispatchEvent(new Event('ended'))}
 async play(){await this.load();if(this.error)throw this.error;if(this.status===1)return;
  await new Promise((resolve,reject)=>{
   const clean=()=>{clearTimeout(timeout);this.removeEventListener('statechange',check);this.removeEventListener('error',fail);this.removeEventListener('blocked',blocked)};
   const check=()=>{if(this.status===1){clean();resolve()}};
   const fail=()=>{clean();reject(this.error||new Error('No se pudo reproducir el video.'))};
   const blocked=()=>{clean();reject(this.error);this.error=null};
   const timeout=setTimeout(()=>{this.player?.pauseVideo();clean();reject(new Error('Pulsa reproducir en el video de YouTube y vuelve a iniciar el turno.'))},12000);
   this.addEventListener('statechange',check);this.addEventListener('error',fail);this.addEventListener('blocked',blocked);this.player.playVideo();check();
  });
 }
 pause(){this.player?.pauseVideo();if(this.status!==0)this.status=2}
}
