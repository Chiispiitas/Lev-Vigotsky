// SPDX-License-Identifier: GPL-2.0-or-later
using System;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Management;
using System.Net;
using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Threading;

namespace UEPLV {
  static class ChatSupport {
    static Thread worker;static volatile bool stopping;public static volatile bool Ready;
    static readonly string Root=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),"UEPLV","Chat");
    static string Boot(){using(var q=new ManagementObjectSearcher("SELECT LastBootUpTime FROM Win32_OperatingSystem"))foreach(ManagementObject o in q.Get())return ManagementDateTimeConverter.ToDateTime((string)o["LastBootUpTime"]).ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture);throw new Exception("No boot identity");}
    public static void Start(){worker=new Thread(Loop){IsBackground=true,Name="UEPLV Chat session"};worker.Start();}
    public static void Stop(){stopping=true;}
    static string Hash(byte[] bytes){using(var sha=SHA256.Create())return Convert.ToBase64String(sha.ComputeHash(bytes));}
    static void InstallClient(SecurityIdentifier student){
      string file=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"UEPLV.Chat.exe");byte[] bytes;
      using(var resource=typeof(ChatSupport).Assembly.GetManifestResourceStream("UEPLV.Chat.exe"))using(var memory=new MemoryStream()){if(resource==null)throw new Exception("Chat client resource missing");resource.CopyTo(memory);bytes=memory.ToArray();}
      if(!File.Exists(file)||Hash(File.ReadAllBytes(file))!=Hash(bytes)){
        foreach(var process in Process.GetProcessesByName("UEPLV.Chat")){try{if(string.Equals(process.MainModule.FileName,file,StringComparison.OrdinalIgnoreCase)){process.Kill();process.WaitForExit(5000);}}finally{process.Dispose();}}
        File.WriteAllBytes(file,bytes);
      }
      var acl=new DirectorySecurity();acl.SetAccessRuleProtection(true,false);
      foreach(var sid in new[]{new SecurityIdentifier("S-1-5-18"),new SecurityIdentifier("S-1-5-32-544")})acl.AddAccessRule(new FileSystemAccessRule(sid,FileSystemRights.FullControl,InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit,PropagationFlags.None,AccessControlType.Allow));
      acl.AddAccessRule(new FileSystemAccessRule(student,FileSystemRights.ReadAndExecute,InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit,PropagationFlags.None,AccessControlType.Allow));
      Directory.CreateDirectory(Root);Directory.SetAccessControl(Root,acl);
      ChatDependencies.Ensure(AppDomain.CurrentDomain.BaseDirectory,Root);
      string escapeFile=System.Security.SecurityElement.Escape(file);
      string xml="<?xml version=\"1.0\" encoding=\"UTF-16\"?><Task version=\"1.2\" xmlns=\"http://schemas.microsoft.com/windows/2004/02/mit/task\"><Triggers><LogonTrigger><Enabled>true</Enabled><UserId>"+student.Value+"</UserId></LogonTrigger></Triggers><Principals><Principal id=\"Student\"><UserId>"+student.Value+"</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><ExecutionTimeLimit>PT0S</ExecutionTimeLimit><RestartOnFailure><Interval>PT1M</Interval><Count>10</Count></RestartOnFailure></Settings><Actions Context=\"Student\"><Exec><Command>"+escapeFile+"</Command><Arguments>--student-chat</Arguments></Exec></Actions></Task>";
      string task=Path.Combine(Root,"task.xml");File.WriteAllText(task,xml,Encoding.Unicode);
      Util.Run(Path.Combine(Environment.SystemDirectory,"schtasks.exe"),"/Create /TN UEPLV-StudentChat /XML \""+task+"\" /F",15000);
    }
    static void Enroll(AgentConfig cfg,AgentState state,string boot){
      if(string.IsNullOrEmpty(cfg.cloudKey)||!Util.ValidCloudUrl(cfg.cloudUrl))throw new Exception("Chat needs the managed cloud connection");
      string requestId=Guid.NewGuid().ToString(),body=Util.Protect(cfg.name,cfg.cloudKey,Util.Json(new{purpose="chat-enroll",requestId,sentUtc=Util.Utc(),deviceId=state.deviceId,bootTicks=boot}));
      var request=(HttpWebRequest)WebRequest.Create(new Uri(new Uri(cfg.cloudUrl),"/api/agent/chat"));request.Method="POST";request.ContentType="application/json";request.Timeout=15000;request.ReadWriteTimeout=15000;request.AllowAutoRedirect=false;
      byte[] bytes=Encoding.UTF8.GetBytes(body);request.ContentLength=bytes.Length;using(var stream=request.GetRequestStream())stream.Write(bytes,0,bytes.Length);
      string reply;using(var response=(HttpWebResponse)request.GetResponse())using(var reader=new StreamReader(response.GetResponseStream(),Encoding.UTF8)){char[] buffer=new char[32769];int length=0,n;while(length<buffer.Length&&(n=reader.Read(buffer,length,buffer.Length-length))>0)length+=n;if(length>32768)throw new Exception("Chat response too large");reply=new string(buffer,0,length);}
      var value=Util.From<ChatReply>(Util.Unprotect(cfg.name,cfg.cloudKey,reply));if(!value.accepted||value.purpose!="chat-session"||value.requestId!=requestId||string.IsNullOrEmpty(value.token))throw new Exception("Chat enrollment rejected");
      string path=Path.Combine(Root,"student-session.json"),temp=path+".tmp";File.WriteAllText(temp,Util.Json(new{name=cfg.name,bootTicks=boot,token=value.token,expiresUtc=value.expiresUtc}),new UTF8Encoding(false));if(File.Exists(path))File.Replace(temp,path,null);else File.Move(temp,path);
    }
    sealed class ChatReply {public bool accepted;public string purpose,requestId,token,expiresUtc;}
    static bool NeedsInteractiveLaunch(){
      string file=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"UEPLV.Chat.exe");
      foreach(var p in Process.GetProcessesByName("UEPLV.Chat")){using(p){try{if(p.SessionId>0&&string.Equals(p.MainModule.FileName,file,StringComparison.OrdinalIgnoreCase))return false;}catch{}}}
      var sid=((SecurityIdentifier)new NTAccount(Environment.MachineName,"LEV VIGOTSKY").Translate(typeof(SecurityIdentifier))).Value;
      using(var query=new ManagementObjectSearcher("SELECT * FROM Win32_Process WHERE Name='explorer.exe'"))foreach(ManagementObject p in query.Get()){using(var owner=p.InvokeMethod("GetOwnerSid",null,null)){if(owner!=null&&Convert.ToString(owner["Sid"])==sid)return true;}}
      return false;
    }
    static void Loop(){bool installed=false;DateTime next=DateTime.MinValue;string boot=null;while(!stopping){try{
      if(DateTime.UtcNow>=next){string management=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),"UEPLV","Management");var cfg=Util.From<AgentConfig>(File.ReadAllText(Path.Combine(management,"agent-config.json")));var state=Util.From<AgentState>(File.ReadAllText(Path.Combine(management,"agent-state.json")));
        if(!installed){var student=(SecurityIdentifier)new NTAccount(Environment.MachineName,"LEV VIGOTSKY").Translate(typeof(SecurityIdentifier));InstallClient(student);boot=Boot();installed=true;Ready=true;}
        Enroll(cfg,state,boot);next=DateTime.UtcNow.AddHours(6);
        // InteractiveToken never starts a desktop process as SYSTEM or in maintenance.
        if(NeedsInteractiveLaunch())try{Util.Run(Path.Combine(Environment.SystemDirectory,"schtasks.exe"),"/Run /TN UEPLV-StudentChat",10000);}catch(Exception ex){File.WriteAllText(Path.Combine(Root,"launch-error.txt"),ex.Message);}
        File.WriteAllText(Path.Combine(Root,"status.json"),Util.Json(new{connected=true,utc=Util.Utc()}));
      }
    }catch(Exception ex){next=DateTime.UtcNow.AddSeconds(30);try{Directory.CreateDirectory(Root);File.WriteAllText(Path.Combine(Root,"status.json"),Util.Json(new{connected=false,utc=Util.Utc(),error=ex.Message}));}catch{}}
      if(installed)try{if(NeedsInteractiveLaunch())Util.Run(Path.Combine(Environment.SystemDirectory,"schtasks.exe"),"/Run /TN UEPLV-StudentChat",10000);}catch(Exception ex){try{File.WriteAllText(Path.Combine(Root,"launch-error.txt"),ex.Message);}catch{}}
      for(int i=0;i<10&&!stopping;i++)Thread.Sleep(1000);
    }}
  }
}
