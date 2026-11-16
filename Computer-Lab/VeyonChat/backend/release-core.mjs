import { unzipSync } from 'fflate';
// ZIP metadata follows PKWARE APPNOTE 4.3.12/4.3.16. Extracted bytes are never
// executed on Wix; file content hashes are derived here before signing.
export const MAX_PACKAGE_BYTES=256*1024;
export const MAX_UNPACKED_BYTES=8*1024*1024;
export const MAX_RELEASE_FILES=16;
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
const GUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export class ReleaseError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
const bad=(code,message,status=400)=>{throw new ReleaseError(status,code,message);};
function b64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);}
function bytes64(value,max=MAX_PACKAGE_BYTES){if(typeof value!=='string'||value.length>Math.ceil(max/3)*4+4||value.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))bad('invalid_package','El paquete no es base64 válido.');let bytes;try{bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));}catch{bad('invalid_package','El paquete no es base64 válido.');}if(bytes.length>max)bad('package_too_large','El ZIP supera256 KiB.');return bytes;}
export async function hashBytes(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function idFor(version){const h=await hashBytes(enc.encode(`release:${version}`));return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;}
export function parseVersion(value){if(typeof value!=='string'||!/^(0|[1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,2})$/.test(value))bad('invalid_version','Use una versión numérica como1.2.0 (cada parte0a999).');return value.split('.').map(Number);}
export function compareVersions(a,b){const x=parseVersion(a),y=parseVersion(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;return 0;}
export function allowedReleasePath(path){
  if(typeof path!=='string'||path.length>140||path.includes('\\')||path.includes(':')||path.includes('\0')||path.startsWith('/')||path.split('/').some(p=>!p||p==='.'||p==='..'||p.endsWith('.')||p.endsWith(' ')))return false;
  if(path.split('/').some(p=>/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)))return false;
  return ['UEPLV.Management.exe','Actions/Invoke-LabAction.ps1','Update/Invoke-AutomaticUpdate.ps1'].includes(path)||/^Commands\/[A-Za-z0-9_-]+\.json$/.test(path);
}
function crc32(bytes){let value=0xffffffff;for(const b of bytes){value^=b;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);}return(value^0xffffffff)>>>0;}
function checkedZipDirectory(bytes){
  if(bytes.length<22||bytes.length>MAX_PACKAGE_BYTES)bad('package_size','El ZIP está vacío o supera256 KiB.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u16=p=>view.getUint16(p,true),u32=p=>view.getUint32(p,true);
  let end=-1;for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(u32(p)===0x06054b50&&p+22+u16(p+20)===bytes.length){end=p;break;}
  if(end<0)bad('invalid_zip','No se encontró el directorio final ZIP.');
  const count=u16(end+10),centralSize=u32(end+12),centralOffset=u32(end+16);
  if(u16(end+4)||u16(end+6)||u16(end+8)!==count||!count||count>MAX_RELEASE_FILES||centralOffset+centralSize!==end||centralOffset>=bytes.length)bad('unsupported_zip','ZIP dividido, ZIP64, vacío o con demasiados archivos.');
  const entries=[],names=new Set();let cursor=centralOffset,total=0;
  function extras(start,size){let p=start;while(p<start+size){if(p+4>start+size)bad('invalid_zip','Campo extra ZIP inválido.');const kind=u16(p),len=u16(p+2);if(kind===1||p+4+len>start+size)bad('unsupported_zip','ZIP64 o campo extra inválido.');p+=4+len;}}
  for(let i=0;i<count;i++){
    if(cursor+46>end||u32(cursor)!==0x02014b50)bad('invalid_zip','Entrada del directorio ZIP inválida.');
    const flags=u16(cursor+8),method=u16(cursor+10),crc=u32(cursor+16),size=u32(cursor+20),originalSize=u32(cursor+24),nameSize=u16(cursor+28),extraSize=u16(cursor+30),commentSize=u16(cursor+32),disk=u16(cursor+34),attributes=u32(cursor+38),localOffset=u32(cursor+42),next=cursor+46+nameSize+extraSize+commentSize;
    if(next>end||!nameSize||nameSize>140||disk||size===0xffffffff||originalSize===0xffffffff||localOffset===0xffffffff||(flags&~0x080e)||(method!==0&&method!==8))bad('unsupported_zip','Formato ZIP o cifrado no permitido.');
    let name;try{name=dec.decode(bytes.subarray(cursor+46,cursor+46+nameSize));}catch{bad('invalid_path','Nombre ZIP inválido.');}
    if(!allowedReleasePath(name)||names.has(name.toLowerCase()))bad('invalid_path','Ruta no permitida o duplicada en el paquete.');names.add(name.toLowerCase());
    const unixType=(attributes>>>16)&0xf000;if((unixType&&unixType!==0x8000)||(attributes&0x410))bad('linked_file','No se permiten directorios, enlaces o archivos especiales.');
    total+=originalSize;if(originalSize<1||!Number.isSafeInteger(total)||total>MAX_UNPACKED_BYTES||(method===0&&size!==originalSize))bad('unpacked_limit','El contenido expandido supera8 MiB o tiene tamaños inválidos.');
    extras(cursor+46+nameSize,extraSize);
    if(localOffset+30>centralOffset||u32(localOffset)!==0x04034b50)bad('invalid_zip','Cabecera local ZIP inválida.');
    const ln=u16(localOffset+26),le=u16(localOffset+28),dataOffset=localOffset+30+ln+le;
    if(ln!==nameSize||u16(localOffset+6)!==flags||u16(localOffset+8)!==method||dataOffset+size>centralOffset||dataOffset<localOffset)bad('invalid_zip','Metadatos locales ZIP no coinciden.');
    if(bytes.subarray(localOffset+30,localOffset+30+ln).some((b,j)=>b!==bytes[cursor+46+j]))bad('invalid_zip','Las rutas locales y centrales no coinciden.');
    if(!(flags&8)&&(u32(localOffset+14)!==crc||u32(localOffset+18)!==size||u32(localOffset+22)!==originalSize))bad('invalid_zip','Los tamaños o CRC locales no coinciden.');
    extras(localOffset+30+ln,le);
    entries.push({name,crc,size,originalSize,localOffset,end:dataOffset+size});cursor=next;
  }
  if(cursor!==end)bad('invalid_zip','El directorio ZIP contiene datos adicionales.');
  const ranges=[...entries].sort((a,b)=>a.localOffset-b.localOffset);if(ranges[0].localOffset!==0)bad('invalid_zip','El paquete contiene un prefijo ajeno al ZIP.');
  for(let i=1;i<ranges.length;i++)if(ranges[i].localOffset<ranges[i-1].end)bad('invalid_zip','Los archivos ZIP se superponen.');
  return entries;
}
export async function validateReleasePackage(packageBase64){
  const bytes=bytes64(packageBase64),entries=checkedZipDirectory(bytes);let unpacked;
  try{unpacked=unzipSync(bytes,{filter:file=>{const e=entries.find(x=>x.name===file.name);if(!e||e.originalSize!==file.originalSize||e.size!==file.size)throw Error('ZIP metadata mismatch');return true;}});}catch(error){if(error instanceof ReleaseError)throw error;bad('invalid_zip','No se puede descomprimir el paquete.');}
  if(Object.keys(unpacked).length!==entries.length)bad('invalid_zip','El número de archivos ZIP no coincide.');
  const files=[];for(const entry of entries){const data=unpacked[entry.name];if(!data||data.length!==entry.originalSize||crc32(data)!==entry.crc)bad('invalid_zip','El tamaño o CRC del contenido no coincide.');if(entry.name.startsWith('Commands/')){try{JSON.parse(dec.decode(data));}catch{bad('invalid_command_json','Un archivo de comandos no es JSON válido.');}}files.push({path:entry.name,sha256:await hashBytes(data),size:data.length});}
  files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  return{bytes,packageSha256:await hashBytes(bytes),files};
}
async function signingKey(config){let key;try{key=await crypto.subtle.importKey('jwk',config.releaseSigningJwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);}catch{bad('release_signing_unavailable','La firma de actualizaciones no está configurada.',503);}if(key.algorithm.modulusLength!==3072)bad('release_signing_unavailable','La firma de actualizaciones requiere RSA3072.',503);return key;}
function descriptor(row){return row?{version:row.version,manifestJson:row.manifestJson,signature:row.signature,packageSha256:row.packageSha256}:null;}
function metadata(row){if(!row)return null;let manifest;try{manifest=JSON.parse(row.manifestJson);}catch{bad('invalid_release_record','El registro de actualización no es válido.',503);}if(manifest.schemaVersion!==1||manifest.version!==row.version||manifest.packageSha256!==row.packageSha256||!Array.isArray(manifest.files))bad('invalid_release_record','El manifiesto guardado no coincide.',503);return{version:row.version,issuedUtc:manifest.issuedUtc,packageSha256:row.packageSha256,files:manifest.files};}
export function createReleaseManager(store,{now=Date.now,protect,unprotect,deterministicId,expectedNames}={}){
  let cachedLatest,cacheUntil=0;
  const latestRow=async(fresh=false)=>{if(!fresh&&now()<cacheUntil)return cachedLatest;const rows=await store.listReleases(20);for(const r of rows)parseVersion(r.version);rows.sort((a,b)=>compareVersions(b.version,a.version));cachedLatest=rows[0]||null;cacheUntil=now()+30000;return cachedLatest;};
  async function prune(){const rows=await store.listReleases(20);rows.sort((a,b)=>compareVersions(b.version,a.version));if(rows.length>3)await store.removeReleases(rows.slice(3).map(r=>r._id));}
  return{
    async list(){const rows=await store.listReleases(20);rows.sort((a,b)=>compareVersions(b.version,a.version));return{latest:metadata(rows[0]||null),releases:rows.map(metadata)};},
    async publish(config,body){
      parseVersion(body?.version);const verified=await validateReleasePackage(body.packageBase64),existing=await store.getRelease(await idFor(body.version));
      if(existing){if(existing.packageSha256!==verified.packageSha256)bad('release_version_conflict','La versión ya existe con otro paquete.',409);await prune();return metadata(existing);}
      const latest=await latestRow(true);if(latest&&compareVersions(body.version,latest.version)<=0)bad('release_downgrade','La nueva versión debe ser mayor que la publicada.',409);
      const issuedAt=now(),manifest={schemaVersion:1,version:body.version,issuedUtc:new Date(issuedAt).toISOString(),packageSha256:verified.packageSha256,files:verified.files},manifestJson=JSON.stringify(manifest);
      const signature=b64(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',await signingKey(config),enc.encode(manifestJson))));
      const row={_id:await idFor(body.version),version:body.version,issuedAt,manifestJson,signature,packageBase64:body.packageBase64,packageSha256:verified.packageSha256};
      try{await store.insertRelease(row);}catch{const canonical=await store.getRelease(row._id);if(!canonical)throw Error('Release storage failed');if(canonical.packageSha256!==row.packageSha256)bad('release_version_conflict','La versión ya existe con otro paquete.',409);}
      cachedLatest=null;cacheUntil=0;await prune();return metadata(row);
    },
    async forStatus(status){const version=status?.update?.installedVersion||status?.installedReleaseVersion||status?.version;if(!version)return null;try{parseVersion(version);}catch{return null;}const latest=await latestRow();return latest&&compareVersions(latest.version,version)>0?descriptor(latest):null;},
    async download(envelope,config){
      const name=envelope?.name;if(!expectedNames.includes(name)||!Object.prototype.hasOwnProperty.call(config.deviceKeys,name))bad('device_authentication_failed','Equipo no autorizado.',403);
      const key=config.deviceKeys[name];let p;try{p=await unprotect(name,key,envelope);}catch{bad('device_authentication_failed','Equipo no autorizado.',403);}
      const reply={requestId:p?.requestId||'',serverUtc:new Date(now()).toISOString(),accepted:false,error:null,update:null};
      const reject=async message=>{reply.error=message;return protect(name,key,reply);};
      if(!p||!GUID.test(p.requestId||'')||!GUID.test(p.deviceId||'')||!Number.isFinite(Date.parse(p.sentUtc))||Math.abs(now()-Date.parse(p.sentUtc))>120000)return reject('Invalid or stale update request');
      try{parseVersion(p.version);}catch{return reject('Invalid release version');}
      const device=await store.getDevice(await deterministicId(`device:${name}`));if(!device||device.deviceId!==p.deviceId)return reject('Device is not enrolled or identity differs');
      const row=await store.getRelease(await idFor(p.version));if(!row)return reject('Requested release is unavailable');
      const bytes=bytes64(row.packageBase64);if(await hashBytes(bytes)!==row.packageSha256)return reject('Stored release package digest differs');metadata(row);
      reply.accepted=true;reply.update={manifestJson:row.manifestJson,signature:row.signature,packageBase64:row.packageBase64};return protect(name,key,reply);
    },
  };
}
