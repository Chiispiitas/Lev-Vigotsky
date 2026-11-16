using System;
using System.ComponentModel;
using System.Linq;
using System.Management;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using Microsoft.Win32;

namespace UEPLV {
 public class SessionTransition {
  public string phase="student",jobId,error,startedUtc,encryptedCredential;
  public long bootTicks;
 }
 public class SessionStatus {public string phase,error,user;}
 public class MaintenanceCredential {public string purpose,jobId,expiresUtc,account,password;}
 internal static class SessionTransitions {
  const string Winlogon=@"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon";
  const string Student="LEV VIGOTSKY",Staff="MAINTENANCE";
  [DllImport("advapi32.dll",SetLastError=true,CharSet=CharSet.Unicode)]static extern bool LogonUser(string user,string domain,string password,int type,int provider,out IntPtr token);
  [DllImport("kernel32.dll")]static extern bool CloseHandle(IntPtr handle);
  [StructLayout(LayoutKind.Sequential)]struct LsaString {public ushort Length,MaximumLength;public IntPtr Buffer;}
  [StructLayout(LayoutKind.Sequential)]struct LsaAttributes {public uint Length;public IntPtr RootDirectory,ObjectName;public uint Attributes;public IntPtr SecurityDescriptor,SecurityQualityOfService;}
  [DllImport("advapi32.dll")]static extern uint LsaOpenPolicy(IntPtr system,ref LsaAttributes attributes,uint access,out IntPtr policy);
  [DllImport("advapi32.dll")]static extern uint LsaStorePrivateData(IntPtr policy,ref LsaString key,IntPtr value);
  [DllImport("advapi32.dll")]static extern uint LsaNtStatusToWinError(uint status);
  [DllImport("advapi32.dll")]static extern uint LsaClose(IntPtr policy);
  static LsaString Unicode(string text){return new LsaString{Length=checked((ushort)(text.Length*2)),MaximumLength=checked((ushort)((text.Length+1)*2)),Buffer=Marshal.StringToHGlobalUni(text)};}
  static void Secret(string password){
   var a=new LsaAttributes{Length=(uint)Marshal.SizeOf(typeof(LsaAttributes))};IntPtr policy=IntPtr.Zero,value=IntPtr.Zero;var key=Unicode("DefaultPassword");LsaString data=new LsaString();
   try{
    uint code=LsaOpenPolicy(IntPtr.Zero,ref a,0x20,out policy);if(code!=0)throw new Win32Exception((int)LsaNtStatusToWinError(code));
    if(password!=null){data=Unicode(password);value=Marshal.AllocHGlobal(Marshal.SizeOf(typeof(LsaString)));Marshal.StructureToPtr(data,value,false);}
    code=LsaStorePrivateData(policy,ref key,value);if(code!=0&&!(password==null&&LsaNtStatusToWinError(code)==2))throw new Win32Exception((int)LsaNtStatusToWinError(code));
   }finally{
    if(data.Buffer!=IntPtr.Zero){for(int i=0;i<data.MaximumLength;i++)Marshal.WriteByte(data.Buffer,i,0);Marshal.FreeHGlobal(data.Buffer);}
    if(value!=IntPtr.Zero)Marshal.FreeHGlobal(value);Marshal.FreeHGlobal(key.Buffer);if(policy!=IntPtr.Zero)LsaClose(policy);
   }
  }
  internal static bool Active(SessionTransition t){return t!=null&&t.phase!="student";}
  internal static bool Pending(SessionTransition t){return t!=null&&new[]{"disabling","maintenance-login","student-login"}.Contains(t.phase);}
  internal static void SelfTest(){
   string value="TEST-ONLY-"+Guid.NewGuid(),id=Guid.NewGuid().ToString();string sealedValue=Seal(value,id);
   if(sealedValue==value||Unseal(sealedValue,id)!=value)throw new Exception("Credential protection round trip failed");
   bool refused=false;try{Unseal(sealedValue,Guid.NewGuid().ToString());}catch(CryptographicException){refused=true;}
   if(!refused)throw new Exception("Credential accepted with another identity");
   if(!Active(new SessionTransition{phase="maintenance"})||Pending(new SessionTransition{phase="maintenance"})||!Pending(new SessionTransition{phase="student-login"})||Active(new SessionTransition{phase="student"}))throw new Exception("Session phase interlock failed");
   var status=Util.Json(new Status{session=new SessionStatus{phase="maintenance",user=Staff}});
   if(status.Contains(value)||status.Contains(sealedValue)||status.Contains("encryptedCredential"))throw new Exception("Private session credential exposed in telemetry");
  }
  internal static string User(){using(var q=new ManagementObjectSearcher("SELECT UserName FROM Win32_ComputerSystem")){foreach(ManagementObject item in q.Get()){var s=Convert.ToString(item["UserName"]);return s.Split('\\').Last();}}return "";}
  internal static SessionStatus Public(SessionTransition t){string user="";try{user=User();}catch{}return new SessionStatus{phase=t==null?"student":t.phase,error=t==null?null:t.error,user=user};}
  static byte[] Entropy(string deviceId){return Encoding.UTF8.GetBytes("UEPLV maintenance transition v1:"+deviceId);}
  internal static string Seal(string password,string deviceId){var bytes=Encoding.UTF8.GetBytes(password);try{return Convert.ToBase64String(ProtectedData.Protect(bytes,Entropy(deviceId),DataProtectionScope.LocalMachine));}finally{Array.Clear(bytes,0,bytes.Length);}}
  static string Unseal(string value,string deviceId){var bytes=ProtectedData.Unprotect(Convert.FromBase64String(value),Entropy(deviceId),DataProtectionScope.LocalMachine);try{return Encoding.UTF8.GetString(bytes);}finally{Array.Clear(bytes,0,bytes.Length);}}
  static void VerifyPassword(string password){
   if(string.IsNullOrEmpty(password)||password.Length>256)throw new Exception("Falta la credencial de MAINTENANCE.");
   IntPtr token;
   if(!LogonUser(Staff,Environment.MachineName,password,2,0,out token))throw new Exception("La credencial de MAINTENANCE no coincide en este equipo.");
   try{using(var identity=new WindowsIdentity(token)){
    // Interactive LogonUser tokens may be UAC-filtered; query actual local SAM membership.
    bool administrator=false;
    using(var groups=new ManagementObjectSearcher("SELECT * FROM Win32_Group WHERE SID='S-1-5-32-544'")){
     foreach(ManagementObject group in groups.Get())using(var members=group.GetRelated("Win32_UserAccount"))foreach(ManagementObject member in members){if(Convert.ToString(member["SID"])==identity.User.Value)administrator=true;}
    }
    if(!administrator)throw new Exception("MAINTENANCE no pertenece a Administradores.");
   }}finally{CloseHandle(token);}
  }
  static void DisableAutologon(){using(var key=Registry.LocalMachine.CreateSubKey(Winlogon)){key.SetValue("AutoAdminLogon","0");key.DeleteValue("DefaultPassword",false);key.DeleteValue("AutoLogonCount",false);}}
  static void StaffAutologon(string password){
   DisableAutologon();Secret(password);
   using(var key=Registry.LocalMachine.CreateSubKey(Winlogon)){key.SetValue("DefaultUserName",Staff);key.SetValue("DefaultDomainName",Environment.MachineName);key.SetValue("AutoLogonCount",1,RegistryValueKind.DWord);key.SetValue("AutoAdminLogon","1");}
  }
  static void StudentAutologon(){
   DisableAutologon();Secret(null);
   using(var key=Registry.LocalMachine.CreateSubKey(Winlogon)){key.SetValue("DefaultUserName",Student);key.SetValue("DefaultDomainName",Environment.MachineName);key.SetValue("DefaultPassword","");key.SetValue("AutoAdminLogon","1");}
  }
  static void Uwf(string args){Util.Run(System.IO.Path.Combine(Environment.SystemDirectory,"uwfmgr.exe"),args,30000);}
  static void Restart(){Util.Run(System.IO.Path.Combine(Environment.SystemDirectory,"shutdown.exe"),"/r /t 60 /c \"UEPLV: cambio de sesion solicitado. Guarde su trabajo.\"",10000);}
  static void RequireKnown(Status s){if(s.bootTicks<=0||s.uwfFeatureEnabled!=true||s.currentEnabled==null||s.nextEnabled==null||s.currentCProtected==null||s.nextCProtected==null||!string.IsNullOrEmpty(s.uwfError))throw new Exception("No se pudo verificar UWF. No se cambio la sesion.");if(s.currentServicing==true||s.nextServicing==true)throw new Exception("Hay mantenimiento de Windows activo o pendiente.");}
  static void Complete(AgentState state,string detail){var r=state.results.FirstOrDefault(x=>x.id==state.session.jobId);if(r!=null){r.state="completed";r.detail=detail;r.utc=Util.Utc();}}
  internal static void Begin(string action,Job job,AgentConfig cfg,AgentState state,Status snapshot,Action save){
   RequireKnown(snapshot);
   if(Pending(state.session))throw new Exception("Ya hay un cambio de sesion en curso.");
   if(action=="maintenance-enter"){
    if(state.session!=null&&state.session.phase=="maintenance"&&snapshot.currentEnabled==false&&snapshot.nextEnabled==false&&User()==Staff){var old=state.results.First(x=>x.id==job.id);old.state="completed";old.detail="Mantenimiento — sin protección";return;}
    bool alreadyThawed=snapshot.currentEnabled==false;
    if(!alreadyThawed&&!Util.ProtectionConsistent(snapshot))throw new Exception("Complete primero el cambio de proteccion pendiente.");
    if(string.IsNullOrEmpty(job.credentialEnvelope)||job.credentialEnvelope.Length>8192)throw new Exception("Falta la credencial cifrada para este equipo.");
    var c=Util.From<MaintenanceCredential>(Util.Unprotect(cfg.name,cfg.cloudKey,job.credentialEnvelope));
    if(c==null||c.purpose!="ueplv-maintenance-login"||c.jobId!=job.id||c.expiresUtc!=job.expiresUtc||c.account!=Staff||!Util.ValidJob(job))throw new Exception("Credencial de sesion invalida o caducada.");
    VerifyPassword(c.password);
    if(FreezeSchedule.Active(state.freezeLease)){state.freezeLease.phase="complete";state.freezeLease.remainingBoots=0;state.freezeLease.error=null;}
    if(alreadyThawed){
     if(FreezeSchedule.Active(state.freezeLease)){state.freezeLease.phase="complete";state.freezeLease.remainingBoots=0;state.freezeLease.error=null;}
     Uwf("filter disable");
     StaffAutologon(c.password);c.password=null;
     state.session=new SessionTransition{phase="maintenance-login",jobId=job.id,bootTicks=snapshot.bootTicks,startedUtc=Util.Utc()};
     var pending=state.results.First(x=>x.id==job.id);pending.state="awaiting-session";pending.detail="Entrando a MAINTENANCE; proteccion sin cambios.";save();Restart();return;
    }
    state.session=new SessionTransition{phase="disabling",jobId=job.id,bootTicks=snapshot.bootTicks,startedUtc=Util.Utc(),encryptedCredential=Seal(c.password,state.deviceId)};save();
    // Commit this value only: the first unprotected boot must not auto-sign in a student.
    DisableAutologon();Uwf("registry commit \"HKLM\\"+Winlogon+"\" AutoAdminLogon");
    Uwf("filter disable");c.password=null;
   }else{
    if(Util.ProtectionConsistent(snapshot)&&User()==Student){
     using(var key=Registry.LocalMachine.CreateSubKey(Winlogon)){key.SetValue("AutoAdminLogon","1");}
     Uwf("registry commit \"HKLM\\"+Winlogon+"\" AutoAdminLogon");
     state.session=new SessionTransition{phase="student",jobId=job.id};Complete(state,"Estudiante — protección activa");save();return;
    }
    if(snapshot.currentEnabled==true)throw new Exception("Entre en mantenimiento antes de restaurar la sesion del estudiante.");
    // Returning to student explicitly confirms protection for the next boot, including a timed thaw.
    using(var pending=Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending")){if(pending!=null)throw new Exception("Complete primero el reinicio pendiente de Windows.");}
    if(FreezeSchedule.Active(state.freezeLease)){state.freezeLease.phase="complete";state.freezeLease.remainingBoots=0;state.freezeLease.error=null;}
    StudentAutologon();
    if(snapshot.nextCProtected!=true)Uwf("volume protect C:");
    state.session=new SessionTransition{phase="student-login",jobId=job.id,bootTicks=snapshot.bootTicks,startedUtc=Util.Utc()};save();
    Uwf("filter enable");
   }
   var check=state.results.First(x=>x.id==job.id);check.state="awaiting-session";check.detail=action=="maintenance-enter"?"Entrando a mantenimiento; requiere dos reinicios.":"Volviendo a estudiante; verificando proteccion tras reiniciar.";save();Restart();
  }
  internal static void Fail(AgentState state,Exception error,Action save){
   if(state.session==null)return;
   state.session.phase="error";state.session.error=error.Message;state.session.encryptedCredential=null;
   try{DisableAutologon();Secret(null);}catch{}
   var r=state.results.FirstOrDefault(x=>x.id==state.session.jobId);if(r!=null){r.state="failed";r.detail=error.Message;r.utc=Util.Utc();}save();
  }
  internal static void Tick(AgentState state,Status snapshot,Action save){
   var t=state.session;if(!Pending(t))return;
   try{
    DateTime deadline;if(!DateTime.TryParse(t.startedUtc,null,System.Globalization.DateTimeStyles.RoundtripKind,out deadline)||DateTime.UtcNow-deadline.ToUniversalTime()>TimeSpan.FromMinutes(10))throw new Exception("No se verifico el cambio de sesion. Revise el equipo; no se programaran mas reinicios.");
    // WMI/optional-feature providers can be unavailable during early service startup.
    // Wait without touching logon secrets or protection; the bounded deadline still applies.
    if(snapshot.bootTicks<=0||snapshot.uwfFeatureEnabled!=true||snapshot.currentEnabled==null||snapshot.nextEnabled==null||snapshot.currentCProtected==null||snapshot.nextCProtected==null||!string.IsNullOrEmpty(snapshot.uwfError))return;
    RequireKnown(snapshot);
    if(snapshot.bootTicks==t.bootTicks)return;
    if(t.phase=="disabling"){
     if(snapshot.currentEnabled!=false||snapshot.nextEnabled!=false)throw new Exception("No se desactivo UWF tras el reinicio.");
     StaffAutologon(Unseal(t.encryptedCredential,state.deviceId));
     t.encryptedCredential=null;t.phase="maintenance-login";t.bootTicks=snapshot.bootTicks;t.startedUtc=Util.Utc();save();Restart();return;
    }
    string user=User();
    if(t.phase=="maintenance-login"&&user==Staff){
     if(snapshot.currentEnabled!=false||snapshot.nextEnabled!=false)throw new Exception("La sesion de mantenimiento sigue protegida.");
     DisableAutologon();Secret(null);t.phase="maintenance";Complete(state,"Mantenimiento — sin protección");save();return;
    }
    if(t.phase=="student-login"&&user==Student){
     if(!Util.ProtectionConsistent(snapshot))throw new Exception("El estudiante inicio sesion, pero UWF no esta protegido ahora y en el proximo inicio.");
     t.phase="student";Complete(state,"Estudiante — protección activa");save();return;
    }
    DateTime started;if(!DateTime.TryParse(t.startedUtc,null,System.Globalization.DateTimeStyles.RoundtripKind,out started)||DateTime.UtcNow-started.ToUniversalTime()>TimeSpan.FromMinutes(10))throw new Exception("No se verifico el inicio de sesion. Revise el equipo; no se programaran mas reinicios.");
   }catch(Exception ex){Fail(state,ex,save);}
  }
 }
}
