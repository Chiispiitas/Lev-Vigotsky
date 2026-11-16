// Server-only Wix adapter. Never import this file from browser code.
// Exact SDK examples: official Query/Get/Insert/BulkInsert/BulkRemove Data Items docs.
import { items } from '@wix/data';
import { auth } from '@wix/essentials';

export const COLLECTIONS = Object.freeze({ config:'UEPLVConfig', devices:'UEPLVDevices', polls:'UEPLVPolls', jobs:'UEPLVJobs', releases:'UEPLVReleases' });
type Row = Record<string, any> & { _id: string };
const elevatedUpdate = auth.elevate(items.update);
const elevatedGet = auth.elevate(items.get);
const elevatedInsert = auth.elevate(items.insert);
const elevatedQuery = auth.elevate(items.query);
const elevatedBulkInsert = auth.elevate(items.bulkInsert);
const elevatedBulkRemove = auth.elevate(items.bulkRemove);

async function get(collection: string, id: string): Promise<Row | null> {
  try { return await elevatedGet(collection, id, { consistentRead:true }) as Row | null; }
  catch (error: any) {
    const code = error?.details?.applicationError?.code || error?.code;
    // Do not convert permission, transport, or configuration failures into an empty record.
    if (['WD_ITEM_NOT_FOUND','WDE0073','ITEM_NOT_FOUND','NOT_FOUND'].includes(code) || error?.httpStatus === 404 || error?.status === 404) return null;
    throw error;
  }
}
async function query(collection: string, filter: Record<string, any>, sort: any[], limit: number,fields?:string[]): Promise<Row[]> {
  const result = await elevatedQuery(collection, { filter, sort, paging:{limit,offset:0},...(fields?{fields}:{}) }, { consistentRead:true });
  return (result.items || []) as Row[];
}
async function remove(collection: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const result = await elevatedBulkRemove(collection, ids);
  if (result.errors?.length) throw new Error('Private data retention failed');
}
export function createWixStore() {
  return {
    getChat:(id:string)=>get('UEPLVChat',id),
    saveChatBoot:async(row:Row)=>(await get('UEPLVChat',row._id))?elevatedUpdate('UEPLVChat',row):elevatedInsert('UEPLVChat',row),
    listChatBoots:()=>query('UEPLVChat',{kind:'boot'},[],34),
    messagesFor:(name:string,time:number)=>query('UEPLVChat',{$and:[{kind:'message'},{expiresAt:{$gt:time}},{$or:[{sender:name},{recipient:name}]}]},[{fieldName:'createdAt',order:'DESC'}],100),
    recentChatFrom:(name:string,since:number)=>query('UEPLVChat',{$and:[{kind:'message'},{sender:name},{createdAt:{$gt:since}}]},[],272),
    expiredChat:(time:number)=>query('UEPLVChat',{$and:[{kind:'message'},{expiresAt:{$lte:time}}]},[],200),
    chatHistory:()=>query('UEPLVChat',{kind:'message'},[{fieldName:'createdAt',order:'DESC'}],500),
    removeChat:(ids:string[])=>remove('UEPLVChat',ids),
    insertChat:async(rows:Row[])=>{if(!rows.length)return;const result=await elevatedBulkInsert('UEPLVChat',rows);if(result.errors?.length){for(const row of rows){const saved=await get('UEPLVChat',row._id);if(!saved||saved.body!==row.body||saved.sender!==row.sender||saved.recipient!==row.recipient)throw Error('Chat storage incomplete');}}},
    saveConfig:(id:string,data:Record<string,unknown>)=>elevatedUpdate(COLLECTIONS.config,{...data,_id:id}),
    savePolicy:async(id:string,policy:unknown)=>{const row=await get(COLLECTIONS.config,id);return row?elevatedUpdate(COLLECTIONS.config,{...row,policy}):elevatedInsert(COLLECTIONS.config,{_id:id,policy});},
    getConfig:(id: string) => get(COLLECTIONS.config,id),
    getDevice:async(id: string) => (await query(COLLECTIONS.devices,{_id:id},[],1))[0] || null,
    insertDevice:(row: Row) => elevatedInsert(COLLECTIONS.devices,row),
    getPoll:async(id: string) => (await query(COLLECTIONS.polls,{_id:id},[],1))[0] || null,
    insertPoll:(row: Row) => elevatedInsert(COLLECTIONS.polls,row),
    latestPoll:async(name: string) => (await query(COLLECTIONS.polls,{name},[{fieldName:'sequence',order:'DESC'}],1))[0] || null,
    listDevices:() => query(COLLECTIONS.devices,{},[],34),
    listPolls:(limit: number) => query(COLLECTIONS.polls,{},[{fieldName:'receivedAt',order:'DESC'}],limit),
    listJobs:(limit: number) => query(COLLECTIONS.jobs,{},[{fieldName:'issuedAt',order:'DESC'}],limit),
    jobsFor:(name: string,time: number) => query(COLLECTIONS.jobs,{$and:[{name},{expiresAt:{$gt:time}}]},[{fieldName:'issuedAt',order:'ASC'}],50),
    jobsByRequest:(requestId: string) => query(COLLECTIONS.jobs,{requestId},[],33),
    insertJobs:async(rows: Row[]) => {
      if (!rows.length) return;
      const result = await elevatedBulkInsert(COLLECTIONS.jobs,rows);
      // A simultaneous retry may have inserted the same deterministic IDs. The core re-reads
      // the canonical job set and verifies every target/action before returning success.
      if (result.errors?.length && !result.inserted && !result.skipped) throw new Error('Command batch failed');
    },
    removePolls:(ids: string[]) => remove(COLLECTIONS.polls,ids),
    removeJobs:(ids: string[]) => remove(COLLECTIONS.jobs,ids),
    listReleases:(limit:number)=>query(COLLECTIONS.releases,{},[{fieldName:'issuedAt',order:'DESC'}],limit,['_id','version','issuedAt','manifestJson','signature','packageSha256']),
    getRelease:async(id:string)=>(await query(COLLECTIONS.releases,{_id:id},[],1))[0]||null,
    insertRelease:(row:Row)=>elevatedInsert(COLLECTIONS.releases,row),
    removeReleases:(ids:string[])=>remove(COLLECTIONS.releases,ids),
  };
}
