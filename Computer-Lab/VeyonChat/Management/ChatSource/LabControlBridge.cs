using System;
using System.Collections;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;

[assembly: System.Runtime.Versioning.TargetFramework(".NETFramework,Version=v4.8")]
[assembly: System.Reflection.AssemblyVersion("1.0.0.0")]
[assembly: System.Reflection.AssemblyTitle("UEPLV Veyon Control")]
namespace UEPLV.VeyonIntegration {
  sealed class Options {
    public string Action; public string[] Targets; public bool Diagnose; public bool SelfTest; public string Import; public bool TestRun; public string Report;
    public static readonly string[] Actions={"class","class-ai","exam","free","close-apps","shutdown","reboot","chat"};
    public static Options Parse(string[] args) {
      var o=new Options();
      for(int i=0;i<args.Length;i++) {
        if(args[i]=="--self-test"&&args.Length==1){o.SelfTest=true;return o;}
        if(args[i]=="--import-session"&&args.Length==2){o.Import=args[1];return o;}
        if(args[i]=="--diagnose"&&!o.Diagnose){o.Diagnose=true;continue;}
        if(args[i]=="--test-run"&&o.Action==null&&i+1<args.Length){o.TestRun=true;o.Action=args[++i];continue;}
        if(args[i]=="--report"&&o.Report==null&&i+1<args.Length){o.Report=Path.GetFullPath(args[++i]);continue;}
        if(args[i]=="--action"&&o.Action==null&&i+1<args.Length){o.Action=args[++i];continue;}
        if(args[i]=="--targets"&&o.Targets==null&&i+1<args.Length){o.Targets=ParseTargets(args[++i]);continue;}
        throw new Exception("Argumentos no válidos.");
      }
      if(o.Targets==null||o.Targets.Length==0||o.Diagnose==(o.Action!=null)||(!o.Diagnose&&!Actions.Contains(o.Action)))throw new Exception("Acción o equipos no válidos.");
      if(o.TestRun&&(o.Report==null||o.Targets.Length!=1||o.Targets[0]!="UEPLV-34"))throw new Exception("Las pruebas automáticas solo permiten la VM 34.");
      if(o.Report!=null&&!o.TestRun)throw new Exception("Informe solo disponible en pruebas.");
      return o;
    }
    public static string[] ParseTargets(string raw) {
      if(raw==null||raw.Length>600)throw new Exception("Equipos no válidos.");
      string[] names=raw.Split(',');
      if(names.Length==0||names.Length>34||names.Any(n=>!Regex.IsMatch(n,@"^UEPLV-(0[1-9]|[12][0-9]|3[0-4])$")))throw new Exception("Equipos no válidos.");
      return names.Distinct().ToArray();
    }
  }
  sealed class StaffSession {
    public string Base; public string Cookie;
  }
  static class SessionStore {
    public const string BaseUrl="https://headless-fmhdvxksmwz-chiispiitas-140b.wix-site-host.com";
    public static readonly string DirectoryPath=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"UEPLV","VeyonIntegration");
    static readonly string FilePath=Path.Combine(DirectoryPath,"staff-session.bin");
    static readonly byte[] Entropy=Encoding.UTF8.GetBytes("UEPLV Veyon Integration v1");
    public static StaffSession Load(){
      if(!File.Exists(FilePath))return null;
      try { return Validate(Api.Json.Deserialize<StaffSession>(Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(FilePath),Entropy,DataProtectionScope.CurrentUser)))); }
      catch {return null;}
    }
    public static StaffSession Validate(StaffSession s){
      if(s==null||s.Base!=BaseUrl||s.Cookie==null||!Regex.IsMatch(s.Cookie,@"^__Host-ueplv_staff=[A-Za-z0-9_.-]{40,1000}$"))throw new Exception("Sesión no válida.");
      return s;
    }
    public static void Save(StaffSession s){
      Validate(s);Directory.CreateDirectory(DirectoryPath);
      var acl=new DirectorySecurity();acl.SetAccessRuleProtection(true,false);
      foreach(var sid in new[]{WindowsIdentity.GetCurrent().User,new SecurityIdentifier("S-1-5-18")})acl.AddAccessRule(new FileSystemAccessRule(sid,FileSystemRights.FullControl,InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit,PropagationFlags.None,AccessControlType.Allow));
      Directory.SetAccessControl(DirectoryPath,acl);
      var bytes=ProtectedData.Protect(Encoding.UTF8.GetBytes(Api.Json.Serialize(s)),Entropy,DataProtectionScope.CurrentUser);
      string temp=FilePath+"."+Guid.NewGuid()+".tmp";File.WriteAllBytes(temp,bytes);
      try{if(File.Exists(FilePath))File.Replace(temp,FilePath,null);else File.Move(temp,FilePath);}finally{if(File.Exists(temp))File.Delete(temp);}
    }
    public static void Import(string path){
      var d=Api.Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(path));
      Save(new StaffSession{Base=Api.String(d,"base"),Cookie=Api.String(d,"cookie")});
    }
  }
  sealed class LoginRequired:Exception{}
  sealed class RetryableLimit:Exception {public RetryableLimit(string message):base(message){}}
  static class Api {
    static Api(){ServicePointManager.SecurityProtocol=SecurityProtocolType.Tls12;}
    public static readonly JavaScriptSerializer Json=new JavaScriptSerializer{MaxJsonLength=2097152};
    public static string String(Dictionary<string,object> d,string key){object v;return d!=null&&d.TryGetValue(key,out v)&&v!=null?Convert.ToString(v):"";}
    public static Dictionary<string,object> Object(Dictionary<string,object> d,string key){object v;return d!=null&&d.TryGetValue(key,out v)?v as Dictionary<string,object>:null;}
    public static IEnumerable<Dictionary<string,object>> Objects(Dictionary<string,object> d,string key){object v;if(d==null||!d.TryGetValue(key,out v)||v==null)return Enumerable.Empty<Dictionary<string,object>>();var items=v as IEnumerable;return items==null?Enumerable.Empty<Dictionary<string,object>>():items.Cast<object>().OfType<Dictionary<string,object>>();}
    public static async Task<Dictionary<string,object>> Call(StaffSession session,string route,object body=null){
      // Reuse the same immutable body/request ID if an infrastructure rate limit occurs.
      int[] delays={2000,5000,10000};
      for(int attempt=0;;attempt++){
        bool limited=false;string message="";
        try{return await Once(session,route,body);}catch(RetryableLimit ex){limited=true;message=ex.Message;}
        if(!limited||attempt>=delays.Length)throw new Exception(message);
        await Task.Delay(delays[attempt]);
      }
    }
    static async Task<Dictionary<string,object>> Once(StaffSession session,string route,object body){
      if(!new[]{"status","jobs","session","chat"}.Contains(route))throw new Exception("Solicitud no permitida.");
      var request=(HttpWebRequest)WebRequest.Create(SessionStore.BaseUrl+"/api/admin/"+route);
      request.Method=body==null?"GET":"POST";request.Accept="application/json";request.ContentType="application/json";request.UserAgent="UEPLV-Veyon/1.0";
      request.Timeout=25000;request.ReadWriteTimeout=25000;request.AllowAutoRedirect=false;request.Headers["Origin"]=SessionStore.BaseUrl;
      if(session!=null){SessionStore.Validate(session);request.Headers["Cookie"]=session.Cookie;}
      HttpWebResponse response=null;WebException networkError=null;
      try{
        if(body!=null){byte[] bytes=Encoding.UTF8.GetBytes(Json.Serialize(body));request.ContentLength=bytes.Length;using(var stream=await Bounded(request.GetRequestStreamAsync(),request))await Bounded(stream.WriteAsync(bytes,0,bytes.Length),request);}
        response=(HttpWebResponse)await Bounded(request.GetResponseAsync(),request);
      }catch(WebException ex){networkError=ex;}
      if(networkError!=null){
        response=networkError.Response as HttpWebResponse;
        if(response==null)throw new Exception("No se pudo conectar al laboratorio.");
        int httpCode=(int)response.StatusCode;
        if(httpCode==401){response.Close();throw new LoginRequired();}
        Dictionary<string,object> error=null;
        try{string raw=await ReadBounded(response,request,8192);error=Json.Deserialize<Dictionary<string,object>>(raw);}catch{}finally{response.Close();}
        string errorCode=String(error,"code"),serverMessage=SafeError(error);
        if(httpCode==429){
          if(new[]{"history_full","queue_full","login_rate_limited"}.Contains(errorCode))throw new Exception(serverMessage.Length>0?serverMessage:"El laboratorio alcanzó su límite. Revise el diagnóstico.");
          throw new RetryableLimit(serverMessage.Length>0?serverMessage:"El servicio está ocupado. Reintente en un momento.");
        }
        if(serverMessage.Length>0)throw new Exception(serverMessage);
        if(httpCode==403)throw new Exception("Acceso no permitido.");
        throw new Exception("El servidor no aceptó la solicitud ("+httpCode+").");
      }
      using(response){
          if((int)response.StatusCode!=200||response.ContentLength>2097152)throw new Exception("Respuesta no válida.");
            var data=Json.Deserialize<Dictionary<string,object>>(await ReadBounded(response,request,2097152));
            if(route=="session"){
              string cookie=response.Headers["Set-Cookie"];
              if(cookie==null)throw new Exception("No se pudo guardar la sesión.");
              cookie=cookie.Split(';')[0];SessionStore.Save(new StaffSession{Base=SessionStore.BaseUrl,Cookie=cookie});
            }
            return data;
      }
    }
    static string SafeError(Dictionary<string,object> data){
      string code=String(data,"code"),message=String(data,"error");
      if(!new[]{"chat_not_allowed","invalid_chat_message","invalid_chat_mode","chat_rate_limited","chat_request_conflict","invalid_chat_operation","invalid_command","request_id_conflict","agent_update_required","credential_missing","history_full","queue_full","login_rate_limited","command_storage_incomplete","service_unavailable","origin_rejected","body_too_large","json_required","invalid_json","empty_request"}.Contains(code))return "";
      message=Regex.Replace(message,@"\s+"," ").Trim();
      if(message.Length>600||message.IndexOf("__Host-",StringComparison.OrdinalIgnoreCase)>=0||Regex.IsMatch(message,@"[A-Za-z0-9_-]{80,}"))return "";
      return message;
    }
    public static void SelfTestErrorMessages(){
      string message="Hay demasiados comandos pendientes. Espere a que terminen o caduquen.";
      if(SafeError(new Dictionary<string,object>{{"code","queue_full"},{"error",message}})!=message)throw new Exception("Known error message was lost");
      if(SafeError(new Dictionary<string,object>{{"code","unknown"},{"error","raw stack or secret"}})!="")throw new Exception("Unknown server error exposed");
      if(SafeError(new Dictionary<string,object>{{"code","queue_full"},{"error","__Host-sensitive-cookie"}})!="")throw new Exception("Sensitive server text exposed");
    }
    static async Task<string> ReadBounded(HttpWebResponse response,HttpWebRequest request,int limit){
      if(response.ContentLength>limit)throw new Exception("Respuesta demasiado grande.");
      using(var stream=response.GetResponseStream()){
        var buffer=new byte[limit+1];int count=0,n;DateTime deadline=DateTime.UtcNow.AddSeconds(25);
        while(count<buffer.Length){int left=(int)(deadline-DateTime.UtcNow).TotalMilliseconds;if(left<=0){request.Abort();throw new Exception("La conexión tardó demasiado.");}var read=stream.ReadAsync(buffer,count,buffer.Length-count);if(await Task.WhenAny(read,Task.Delay(left))!=read){request.Abort();throw new Exception("La conexión tardó demasiado.");}n=await read;if(n==0)break;count+=n;}
        if(count>limit)throw new Exception("Respuesta demasiado grande.");return new UTF8Encoding(false,true).GetString(buffer,0,count);
      }
    }
    static async Task Bounded(Task requestTask,HttpWebRequest request){if(await Task.WhenAny(requestTask,Task.Delay(25000))!=requestTask){request.Abort();throw new Exception("La conexión tardó demasiado. Revise el diagnóstico.");}await requestTask;}
    static async Task<T> Bounded<T>(Task<T> requestTask,HttpWebRequest request){if(await Task.WhenAny(requestTask,Task.Delay(25000))!=requestTask){request.Abort();throw new Exception("La conexión tardó demasiado. Revise el diagnóstico.");}return await requestTask;}
  }
  sealed class LoginForm:Form {
    readonly TextBox password=new TextBox{UseSystemPasswordChar=true,Dock=DockStyle.Top};
    readonly Label error=new Label{Dock=DockStyle.Fill,ForeColor=Color.Firebrick};
    readonly Button login=new Button{Text="Entrar",Dock=DockStyle.Bottom,Height=34};
    public LoginForm(){
      Text="Laboratorio";ClientSize=new Size(360,150);StartPosition=FormStartPosition.CenterParent;FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;MinimizeBox=false;Padding=new Padding(20);Font=new Font("Segoe UI",10);
      Controls.Add(error);Controls.Add(password);Controls.Add(new Label{Text="Clave del laboratorio",Dock=DockStyle.Top,Height=30});Controls.Add(login);AcceptButton=login;
      login.Click+=async delegate{login.Enabled=false;error.Text="";try{await Api.Call(null,"session",new{token=password.Text});password.Clear();DialogResult=DialogResult.OK;Close();}catch(LoginRequired){error.Text="Clave incorrecta.";}catch(Exception ex){error.Text=ex.Message;}finally{login.Enabled=true;}};
    }
  }
  sealed class ControlForm:Form {
    readonly Options options;StaffSession session;bool closing;
    readonly Label heading=new Label{Dock=DockStyle.Top,Height=42};
    readonly ListView list=new ListView{Dock=DockStyle.Fill,View=View.Details,FullRowSelect=true,HeaderStyle=ColumnHeaderStyle.Nonclickable};
    readonly Button close=new Button{Text="Cerrar",Dock=DockStyle.Bottom,Height=34};
    readonly Dictionary<string,ListViewItem> rows=new Dictionary<string,ListViewItem>();
    public int ResultCode=1;
    static readonly Dictionary<string,string> Labels=new Dictionary<string,string>{{"class","Modo Clase con IA"},{"class-ai","Modo Clase sin IA"},{"exam","Modo Examen"},{"free","Modo Libre"},{"close-apps","Cerrar aplicaciones"},{"shutdown","Apagar"},{"reboot","Reiniciar"}};
    public ControlForm(Options o){
      options=o;Text="Laboratorio · Veyon";ClientSize=new Size(700,370);StartPosition=FormStartPosition.CenterScreen;Font=new Font("Segoe UI",10);Padding=new Padding(15);MinimumSize=new Size(550,300);
      heading.Text=o.Diagnose?"Estado de los equipos":Labels[o.Action];heading.Font=new Font(Font,FontStyle.Bold);
      list.Columns.Add("Equipo",125);list.Columns.Add("Resultado",515);
      foreach(string name in o.Targets){var item=list.Items.Add(name);item.SubItems.Add("Esperando");rows[name]=item;}
      if(o.TestRun){Opacity=0;ShowInTaskbar=false;}
      Controls.Add(list);Controls.Add(heading);Controls.Add(close);close.Click+=delegate{Close();};FormClosing+=delegate{closing=true;};Shown+=async delegate{await Execute();if(o.TestRun){WriteReport();Close();}};
    }
    void Set(string name,string text){if(!closing)rows[name].SubItems[1].Text=text;}
    bool Login(){if(options.TestRun)return false;using(var form=new LoginForm()){if(form.ShowDialog(this)!=DialogResult.OK)return false;}session=SessionStore.Load();return session!=null;}
    async Task<Dictionary<string,object>> Request(string route,object body=null){
      if(session==null&&!Login())throw new Exception("Sin sesión.");
      bool expired=false;Dictionary<string,object> result=null;
      try{result=await Api.Call(session,route,body);}catch(LoginRequired){expired=true;}
      if(!expired)return result;session=null;if(!Login())throw new Exception("Sin sesión.");return await Api.Call(session,route,body);
    }
    static bool Fresh(Dictionary<string,object> d){DateTime time;return DateTime.TryParse(Api.String(d,"lastSeenUtc"),null,System.Globalization.DateTimeStyles.RoundtripKind,out time)&&DateTime.UtcNow-time.ToUniversalTime()<TimeSpan.FromMinutes(3)&&time.ToUniversalTime()<DateTime.UtcNow.AddMinutes(2);}
    async Task Execute(){
      try {
        if(!options.TestRun&&!options.Diagnose&&new[]{"close-apps","shutdown","reboot"}.Contains(options.Action)){
          string message=options.Action=="close-apps"?"¿Cerrar las aplicaciones de los equipos seleccionados? Puede perderse trabajo sin guardar.":"¿"+Labels[options.Action]+" los equipos seleccionados? Guarden su trabajo.";
          if(MessageBox.Show(this,message,"Laboratorio",MessageBoxButtons.YesNo,MessageBoxIcon.Warning,MessageBoxDefaultButton.Button2)!=DialogResult.Yes){Close();return;}
        }
        session=SessionStore.Load();
        var first=await Request("status");var devices=Api.Objects(first,"devices").ToDictionary(x=>Api.String(x,"name"));
        var targets=new List<string>();
        foreach(string name in options.Targets){Dictionary<string,object> device;if(!devices.TryGetValue(name,out device)||!Fresh(device)){Set(name,"Sin conexión");continue;}
          var status=Api.Object(device,"status");
          if(options.Diagnose){Set(name,Api.String(status,"mode")+" · "+(Convert.ToBoolean(status.ContainsKey("modeApplied")?status["modeApplied"]:false)?"Aplicado":"Pendiente")+" · v"+Api.String(status,"version"));continue;}
          targets.Add(name);Set(name,"Enviando…");
        }
        if(options.Diagnose||targets.Count==0)return;
        bool modeChange=new[]{"class","class-ai","exam","free"}.Contains(options.Action);
        var resetTargets=new HashSet<string>();
        if(modeChange)foreach(string name in targets){
          var status=Api.Object(devices[name],"status");var update=Api.Object(status,"update");Version installed;
          if(!Version.TryParse(Api.String(update,"installedVersion"),out installed)||installed<new Version(1,5,5))resetTargets.Add(name);
        }
        if(modeChange&&!options.TestRun){
          string consequence=resetTargets.Count>0?"Se cerrarán las aplicaciones de estudiantes.":"Se cerrarán los navegadores de estudiantes.";
          if(MessageBox.Show(this,"¿Aplicar "+Labels[options.Action]+"? "+consequence,"Laboratorio",MessageBoxButtons.YesNo,MessageBoxIcon.Warning,MessageBoxDefaultButton.Button2)!=DialogResult.Yes){Close();return;}
        }
        var resetSent=new HashSet<string>();
        // The backend accepts at most 33 targets. Reserve VM34 for explicit selection.
        var jobs=new Dictionary<string,string>();
        for(int offset=0;offset<targets.Count;offset+=33){var chunk=targets.Skip(offset).Take(33).ToArray();string requestId=Guid.NewGuid().ToString();var reply=await Request("jobs",new{action=options.Action,targets=chunk,requestId=requestId});foreach(var job in Api.Objects(reply,"jobs")){string name=Api.String(job,"name");if(chunk.Contains(name)){jobs[name]=Api.String(job,"id");Set(name,"Enviada · esperando confirmación");}}foreach(string name in chunk)if(!jobs.ContainsKey(name))Set(name,"No se confirmó el envío");}
        var pending=new HashSet<string>(jobs.Keys);DateTime deadline=DateTime.UtcNow.AddSeconds(110);
        while(pending.Count>0&&!closing&&DateTime.UtcNow<deadline){
          await Task.Delay(2500);if(closing)return;var state=await Request("status");devices=Api.Objects(state,"devices").ToDictionary(x=>Api.String(x,"name"));
          foreach(string name in pending.ToArray()){
            Dictionary<string,object> device;if(!devices.TryGetValue(name,out device))continue;
            var job=Api.Objects(device,"results").Concat(Api.Objects(device,"jobs")).FirstOrDefault(x=>Api.String(x,"id")==jobs[name]);
            if(job==null)continue;string phase=Api.String(job,"state");
            if(phase=="completed"){
              var status=Api.Object(device,"status");
              if(new[]{"class","class-ai","exam","free"}.Contains(options.Action)){
                object applied;if(status==null||Api.String(status,"mode")!=options.Action||!status.TryGetValue("modeApplied",out applied)||!(applied is bool)||!(bool)applied){Set(name,"Esperando verificación del modo");continue;}
              }
              if(resetTargets.Contains(name)&&!resetSent.Contains(name)){
                var reset=await Request("jobs",new{action="close-apps",targets=new[]{name},requestId=Guid.NewGuid().ToString()});
                var resetJob=Api.Objects(reset,"jobs").FirstOrDefault(x=>Api.String(x,"name")==name);
                if(resetJob==null||string.IsNullOrEmpty(Api.String(resetJob,"id")))throw new Exception("No se confirmó el cierre de aplicaciones.");
                jobs[name]=Api.String(resetJob,"id");resetSent.Add(name);Set(name,"Aplicando modo · cerrando aplicaciones");continue;
              }
              Set(name,"Completada");pending.Remove(name);
            }else if(phase=="shutdown-scheduled"){Set(name,"Apagado programado · 60 segundos");pending.Remove(name);}
            else if(phase=="awaiting-restart"&&options.Action=="reboot"){Set(name,"Reinicio programado · 60 segundos");pending.Remove(name);}
            else if(new[]{"failed","rejected","expired","interrupted"}.Contains(phase)){string detail=Api.String(job,"detail");Set(name,"Falló"+(detail.Length>0?": "+detail:""));pending.Remove(name);}
            else Set(name,phase=="running"?"En curso":"Esperando confirmación");
          }
        }
        foreach(string name in pending)Set(name,"Sin confirmación · revisar diagnóstico");
      }catch(Exception ex){
        foreach(string name in options.Targets){string previous=rows[name].SubItems[1].Text;if(previous!="Completada"&&!previous.StartsWith("Apagado programado")&&!previous.StartsWith("Reinicio programado")&&!previous.StartsWith("Falló")&&previous!="Sin conexión"&&!previous.StartsWith("No se confirmó"))Set(name,ex.Message);}
        heading.Text="Revisar conexión";
      }
    }
    void WriteReport(){
      var result=rows.ToDictionary(x=>x.Key,x=>x.Value.SubItems[1].Text);
      bool success=result.Values.All(x=>x=="Completada"||x.StartsWith("Apagado programado")||x.StartsWith("Reinicio programado"));
      Directory.CreateDirectory(Path.GetDirectoryName(options.Report));File.WriteAllText(options.Report,Api.Json.Serialize(new{utc=DateTime.UtcNow.ToString("o"),action=options.Action,targets=options.Targets,results=result,success=success}),new UTF8Encoding(false));ResultCode=success?0:2;
    }
  }
  static class Program {
    static void Assert(bool result){if(!result)throw new Exception("Self-test failed");}
    static void SelfTest(){
      Api.SelfTestErrorMessages();
      foreach(string action in Options.Actions)Assert(Options.Parse(new[]{"--action",action,"--targets","UEPLV-01,UEPLV-34"}).Targets.Length==2);
      Assert(Options.Parse(new[]{"--diagnose","--targets","UEPLV-02"}).Diagnose);
      Assert(Options.Parse(new[]{"--test-run","class","--targets","UEPLV-34","--report",Path.Combine(Path.GetTempPath(),"fixture-report.json")}).TestRun);
      bool physicalDenied=false;try{Options.Parse(new[]{"--test-run","class","--targets","UEPLV-32","--report",Path.Combine(Path.GetTempPath(),"fixture-report.json")});}catch{physicalDenied=true;}Assert(physicalDenied);
      foreach(string bad in new[]{"UEPLV-00","UEPLV-35","192.168.1.1","UEPLV-01,","UEPLV-01;shutdown","LEV-VIGOTSKY-01","UEPLV-01.local"}){bool denied=false;try{Options.ParseTargets(bad);}catch{denied=true;}Assert(denied);}
      foreach(string action in new[]{"powershell","cleanup","maintenance-enter","uwf-disable","class & calc.exe"}){bool denied=false;try{Options.Parse(new[]{"--action",action,"--targets","UEPLV-01"});}catch{denied=true;}Assert(denied);}
      byte[] entropy=Encoding.UTF8.GetBytes("self-test"),data=Encoding.UTF8.GetBytes("fixture-only"),encrypted=ProtectedData.Protect(data,entropy,DataProtectionScope.CurrentUser);Assert(Encoding.UTF8.GetString(ProtectedData.Unprotect(encrypted,entropy,DataProtectionScope.CurrentUser))=="fixture-only");
      bool invalid=false;try{SessionStore.Validate(new StaffSession{Base="http://example.com",Cookie="bad"});}catch{invalid=true;}Assert(invalid);
    }
    [STAThread] public static int Main(string[] args){
      Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
      try{if(args.Length==1&&args[0]=="--chat-listen"){ChatHost.Run(new string[0],true);return 0;}if(args.Length==2&&args[0]=="--chat-qa"){var chat=new ChatWindow(true,new[]{"UEPLV-34"});chat.QaPath=Path.GetFullPath(args[1]);Application.Run(chat);return 0;}if(args.Length==1&&args[0]=="--student-chat"){Application.Run(new ChatWindow(false,null));return 0;}if(args.Length==1&&args[0]=="--presence-snapshot"){
        try {
          var session=SessionStore.Load();if(session==null)throw new Exception("session");
          var status=Api.Call(session,"status").GetAwaiter().GetResult();
          var devices=Api.Objects(status,"devices").Select(d=>{
            var st=Api.Object(d,"status");var summary=new Dictionary<string,object>();
            foreach(string key in new[]{"mode","modeApplied","currentEnabled","nextEnabled","currentCProtected","nextCProtected","overlayMB","availableMB","installation"}){object value;if(st!=null&&st.TryGetValue(key,out value))summary[key]=value;}
            var job=Api.Objects(d,"jobs").FirstOrDefault();
            return new {name=Api.String(d,"name"),lastSeenUtc=Api.String(d,"lastSeenUtc"),status=summary,lastJob=job==null?null:new{action=Api.String(job,"action"),state=Api.String(job,"state"),issuedUtc=Api.String(job,"issuedUtc")}};
          }).Where(d=>Regex.IsMatch(d.name,@"^UEPLV-(0[1-9]|[12][0-9]|3[0-4])$")).ToArray();
          Console.WriteLine(Api.Json.Serialize(new{ok=true,checkedUtc=DateTime.UtcNow.ToString("o"),devices=devices}));return 0;
        }catch{Console.WriteLine("{\"ok\":false}");return 2;}
      }var options=Options.Parse(args);if(options.SelfTest){SelfTest();return 0;}if(options.Import!=null){SessionStore.Import(options.Import);return 0;}if(options.Action=="chat"){ChatHost.Run(options.Targets,false);return 0;}var form=new ControlForm(options);Application.Run(form);return options.TestRun?form.ResultCode:0;}
      catch(Exception){if(!args.Contains("--self-test")&&!args.Contains("--import-session")&&!args.Contains("--test-run"))MessageBox.Show("No se pudo abrir el control del laboratorio.","Laboratorio",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
    }
  }
}
