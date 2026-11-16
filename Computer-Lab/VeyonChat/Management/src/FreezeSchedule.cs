using System;
using System.IO;
using System.Linq;
using System.Management;
namespace UEPLV {
 public class FreezeLease {public string phase,jobId,error;public int requestedBoots,remainingBoots;public long lastBootTicks;}
 internal static class FreezeSchedule {
  internal static bool Active(FreezeLease lease){return lease!=null&&lease.phase!="complete";}
  internal static void RequireKnown(Status s){if(s.bootTicks<=0||s.uwfFeatureEnabled!=true||s.currentEnabled==null||s.nextEnabled==null||s.currentCProtected!=true||s.nextCProtected!=true||s.currentServicing!=false||s.nextServicing!=false||!string.IsNullOrEmpty(s.uwfError))throw new Exception("No se pudo verificar la protección de C: o hay mantenimiento de Windows.");}
  internal static void RequireDurableState(string path,Status s){
   if(!Util.PrivateUpdateFile(path))throw new Exception("El contador requiere un estado privado y persistente.");
   if(s.currentEnabled!=true)return;
   using(var q=new ManagementObjectSearcher(@"root\standardcimv2\embedded","SELECT * FROM UWF_Volume WHERE DriveLetter = 'C:' AND CurrentSession = TRUE")){
    foreach(ManagementObject volume in q.Get()){
     using(var input=volume.GetMethodParameters("FindExclusion")){input["FileName"]=VolumePath(path);using(var result=volume.InvokeMethod("FindExclusion",input,null)){if(Convert.ToUInt32(result["ReturnValue"])==0&&Convert.ToBoolean(result["bFound"]))return;}}
    }
   }
   throw new Exception("No se confirmó la exclusión exacta del contador UWF.");
  }
  internal static string VolumePath(string path){var full=Path.GetFullPath(path);if(!string.Equals(Path.GetPathRoot(full),@"C:\",StringComparison.OrdinalIgnoreCase))throw new Exception("El contador debe estar en C:.");return full.Substring(2);}
  static void VerifyNext(bool enabled,Func<Status> read){var s=read();RequireKnown(s);if(s.nextEnabled!=enabled)throw new Exception("No se confirmó UWF para el próximo inicio.");}
  internal static void Begin(AgentState state,Job job,Status s,Action save,Action<bool> filter,Func<Status> read,Action restart){
   RequireKnown(s);bool thaw=job.action=="thaw-reboot";
   if(thaw&&(job.rebootCount<1||job.rebootCount>99))throw new Exception("Elige entre 1 y 99 reinicios.");
   if(thaw&&Active(state.freezeLease))throw new Exception("Ya hay un contador activo. Congele primero el equipo.");
   state.freezeLease=new FreezeLease{phase=thaw?"waiting-thaw":"waiting-freeze",jobId=job.id,requestedBoots=thaw?job.rebootCount:0,remainingBoots=thaw?job.rebootCount:0,lastBootTicks=s.bootTicks};
   var result=state.results.First(x=>x.id==job.id);result.state="awaiting-restart";result.detail=thaw?"Descongelación programada: "+job.rebootCount+" reinicio(s).":"Congelación programada.";save();
   try{filter(!thaw);VerifyNext(!thaw,read);restart();}
   catch(Exception ex){state.freezeLease.phase="error";state.freezeLease.error=ex.Message;save();try{filter(true);VerifyNext(true,read);}catch{}throw;}
  }
  internal static void Tick(AgentState state,Status s,Action save,Action<bool> filter,Func<Status> read){
   var t=state.freezeLease;if(!Active(t)||t.phase=="error")return;
   // Unknown early-boot WMI state never consumes a boot or disables protection.
   if(s.bootTicks<=0||s.currentEnabled==null||s.nextEnabled==null||s.currentCProtected==null||s.nextCProtected==null)return;
   try{
    RequireKnown(s);
    if(s.bootTicks!=t.lastBootTicks){
     if(s.currentEnabled==true){if(t.phase=="waiting-thaw")throw new Exception("El reinicio no abrió la sesión descongelada.");t.phase="complete";t.remainingBoots=0;t.lastBootTicks=s.bootTicks;save();Complete(state,t,"Protección UWF activa.");save();return;}
     if(t.phase=="waiting-freeze")throw new Exception("La protección no se activó tras el reinicio.");
     // Arm the protected boot before saving the last consumed thaw boot. A power loss
     // between these writes can shorten a lease, never grant an extra thaw boot.
     if(t.remainingBoots<=1&&s.nextEnabled!=true){filter(true);VerifyNext(true,read);}
     t.remainingBoots=Math.Max(0,t.remainingBoots-1);t.lastBootTicks=s.bootTicks;t.phase="active";save();
    }
    bool next=t.phase=="waiting-freeze"||(t.phase=="active"&&t.remainingBoots==0);
    if(s.nextEnabled!=next){filter(next);VerifyNext(next,read);}
    if(t.phase=="active"){Complete(state,t,"Descongelada. Sesiones adicionales: "+t.remainingBoots+". Próximo inicio: "+(next?"congelado.":"descongelado."));save();}
   }catch(Exception ex){
    t.phase="error";t.error=ex.Message;save();
    // Fail toward protection without forcing a restart or producing a restart loop.
    try{filter(true);VerifyNext(true,read);}catch(Exception safety){t.error+=" Requiere revisión: "+safety.Message;}
    var result=state.results.FirstOrDefault(x=>x.id==t.jobId);if(result!=null){result.state="failed";result.detail=t.error;result.utc=Util.Utc();}save();
   }
  }
  static void Complete(AgentState state,FreezeLease t,string detail){var result=state.results.FirstOrDefault(x=>x.id==t.jobId);if(result!=null){result.state="completed";result.detail=detail;result.utc=Util.Utc();}}
  internal static void SelfTest(){
   Action<bool> check=ok=>{if(!ok)throw new Exception("Freeze counter self-test failed");};
   check(VolumePath(@"C:\ProgramData\UEPLV\Management\agent-state.json")==@"\ProgramData\UEPLV\Management\agent-state.json");
   foreach(int count in new[]{1,2,99}){
    var s=new Status{bootTicks=10,uwfFeatureEnabled=true,currentEnabled=true,nextEnabled=true,currentCProtected=true,nextCProtected=true,currentServicing=false,nextServicing=false};
    var state=new AgentState();var job=new Job{id=Guid.NewGuid().ToString(),action="thaw-reboot",rebootCount=count};state.results.Add(new JobResult{id=job.id});int restarts=0;
    Action<bool> filter=v=>s.nextEnabled=v;Func<Status> read=()=>s;
    Begin(state,job,s,()=>{},filter,read,()=>restarts++);check(restarts==1&&s.nextEnabled==false);
    Tick(state,s,()=>{},filter,read);check(state.freezeLease.remainingBoots==count);
    for(int i=0;i<count;i++){s.bootTicks++;s.currentEnabled=s.nextEnabled;Tick(state,s,()=>{},filter,read);int remaining=count-i-1;check(s.currentEnabled==false&&state.freezeLease.remainingBoots==remaining&&s.nextEnabled==(remaining==0));Tick(state,s,()=>{},filter,read);check(state.freezeLease.remainingBoots==remaining&&restarts==1);}
    s.bootTicks++;s.currentEnabled=s.nextEnabled;Tick(state,s,()=>{},filter,read);check(!Active(state.freezeLease)&&s.currentEnabled==true&&s.nextEnabled==true);
   }
   var errorState=new AgentState{freezeLease=new FreezeLease{phase="active",lastBootTicks=1,remainingBoots=0}};var unknown=new Status();int calls=0;Tick(errorState,unknown,()=>{},v=>calls++,()=>unknown);check(calls==0&&errorState.freezeLease.remainingBoots==0);
  }
 }
}
