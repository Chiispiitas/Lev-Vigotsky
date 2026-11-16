export const POLICY_ID='415458f7-36d2-4aef-94d8-f9854e89b7f0';
export const DEFAULT_POLICY={"revision":1,"classDomains":["friv.com","voxiom.io","shellshock.io","poki.com","roblox.com","veck.io","msn.com","games.msn.com","zone.msn.com","disneyplus.com","twitch.tv","steamcommunity.com","steampowered.com","epicgames.com","blizzboygames.net","krunker.io","paper-io.com","slither.io","agar.io","hole-io.com","crazygames.com","minijuegos.com","poki.es","badtimesimulator.io","jcw87.github.io","doodles.google","facebook.com","instagram.com","tiktok.com","youtube.com","twitter.com","x.com","snapchat.com","kwai.com","pornhub.com","xnxx.com","xvideos.com","stripchat.com","chaturbate.com","xhamster.com","youporn.com","redtube.com","spankbang.com","tnaflix.com","beeg.com","cam4.com","bongacams.com","rule34.xxx","e621.net"],"aiDomains":["chat.openai.com","chatgpt.com","openai.com","gemini.google.com","bard.google.com","copilot.microsoft.com","claude.ai","poe.com","perplexity.ai","you.com","meta.ai"],"examDomains":["google.com","bing.com","yahoo.com","duckduckgo.com","ask.com","baidu.com","yandex.com","brave.com","search.brave.com","whatsapp.com","web.whatsapp.com","discord.com","netflix.com","reddit.com"],"listModel":"additive-v1"};
export function validatePolicy(value){const out={revision:value.revision,listModel:'additive-v1'};for(const field of ['classDomains','examDomains','aiDomains']){if(!Array.isArray(value[field])||value[field].length>90)throw Error('Cada lista admite hasta 90 dominios.');out[field]=[...new Set(value[field].map(v=>{if(typeof v!=='string')throw Error('Dominio inválido');v=v.trim().toLowerCase();if(v.length>253||!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(v))throw Error('Dominio inválido: '+v);return v;}))];}if(new Set([...out.classDomains,...out.aiDomains,...out.examDomains]).size>90)throw Error('Las tres listas admiten hasta 90 dominios distintos en total.');return out;}

// Older saved policies contained complete per-mode blocklists. Split those once on read.
export function readPolicy(value){
 if(value.listModel==='additive-v1')return validatePolicy(value);
 const base=new Set(value.classDomains),ai=new Set(value.aiDomains);
 return validatePolicy({...value,aiDomains:value.aiDomains.filter(d=>!base.has(d)),examDomains:value.examDomains.filter(d=>!base.has(d)&&!ai.has(d))});
}
// Existing installed agents consume complete lists per mode; compose them at delivery.
export function devicePolicy(value){
 const p=validatePolicy(value),unique=items=>[...new Set(items)];
 return {revision:p.revision,classDomains:p.classDomains,aiDomains:unique([...p.classDomains,...p.aiDomains]),examDomains:unique([...p.classDomains,...p.aiDomains,...p.examDomains])};
}
