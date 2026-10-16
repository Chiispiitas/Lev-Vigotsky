const KEY='empirefest2026:tab-session';
export function readTabSession(storage){
  try{
    const value=JSON.parse((storage||globalThis.sessionStorage).getItem(KEY)||'null');
    if(!value||typeof value.code!=='string'||!/^([a-f0-9]{24})$/.test(value.code))return null;
    return {code:value.code,selected:typeof value.selected==='string'?value.selected:null,view:['evaluate','history','results','participants'].includes(value.view)?value.view:null,category:typeof value.category==='string'?value.category:'all',search:typeof value.search==='string'?value.search:''};
  }catch{return null;}
}
export function writeTabSession(value,storage){
  try{(storage||globalThis.sessionStorage).setItem(KEY,JSON.stringify(value));return true;}catch{return false;}
}
export function clearTabSession(storage){
  try{(storage||globalThis.sessionStorage).removeItem(KEY);}catch{}
}
