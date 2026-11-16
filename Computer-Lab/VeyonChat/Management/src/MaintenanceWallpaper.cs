using System;using System.IO;using System.Net;using System.Runtime.InteropServices;using System.Security.Principal;using System.Security.Cryptography;using Microsoft.Win32;
namespace UEPLV {static class MaintenanceWallpaper {
 const string Digest="1650F26D61392C546D98FB0DAC323C10BE6965583833321CC7395AA23FCC04B6";
 const string Url="https://headless-fmhdvxksmwz-chiispiitas-140b.wix-site-host.com/maintenance-wallpaper.png";
 static string FilePath {get{return Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"maintenance-wallpaper.png");}}
 static string Hash(byte[] b){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(b)).Replace("-","");}
 [DllImport("user32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool SystemParametersInfo(uint action,uint parameter,string value,uint flags);
 internal static void Install(){
  if(!File.Exists(FilePath)||Hash(File.ReadAllBytes(FilePath))!=Digest){
   var req=(HttpWebRequest)WebRequest.Create(Url);req.Timeout=30000;req.ReadWriteTimeout=30000;
   byte[] bytes;using(var response=req.GetResponse())using(var stream=response.GetResponseStream())using(var memory=new MemoryStream()){var buffer=new byte[8192];int n;while((n=stream.Read(buffer,0,buffer.Length))>0){if(memory.Length+n>10485760)throw new Exception("Wallpaper exceeds limit");memory.Write(buffer,0,n);}bytes=memory.ToArray();}
   if(Hash(bytes)!=Digest)throw new Exception("Maintenance wallpaper hash mismatch");File.WriteAllBytes(FilePath,bytes);
  }
  var sid=(SecurityIdentifier)new NTAccount(Environment.MachineName,"MAINTENANCE").Translate(typeof(SecurityIdentifier));
  string exe=System.Security.SecurityElement.Escape(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"UEPLV.Management.exe"));
  string xml="<?xml version=\"1.0\" encoding=\"UTF-16\"?><Task version=\"1.2\" xmlns=\"http://schemas.microsoft.com/windows/2004/02/mit/task\"><Triggers><LogonTrigger><UserId>"+sid.Value+"</UserId><Enabled>true</Enabled></LogonTrigger></Triggers><Principals><Principal id=\"Staff\"><UserId>"+sid.Value+"</UserId><LogonType>InteractiveToken</LogonType><RunLevel>HighestAvailable</RunLevel></Principal></Principals><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><ExecutionTimeLimit>PT1M</ExecutionTimeLimit></Settings><Actions Context=\"Staff\"><Exec><Command>"+exe+"</Command><Arguments>maintenance-wallpaper</Arguments></Exec></Actions></Task>";
  string task=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),"UEPLV","Management","maintenance-wallpaper-task.xml");File.WriteAllText(task,xml,System.Text.Encoding.Unicode);
  string scheduler=Path.Combine(Environment.SystemDirectory,"schtasks.exe");Util.Run(scheduler,"/Create /TN UEPLV-MaintenanceWallpaper /XML \""+task+"\" /F",15000);
  try{Util.Run(scheduler,"/Run /TN UEPLV-MaintenanceWallpaper",10000);}catch{} // Applied at next staff sign-in when no staff session is open.
 }
 internal static int Apply(){
  if(!WindowsIdentity.GetCurrent().Name.EndsWith("\\MAINTENANCE",StringComparison.OrdinalIgnoreCase))throw new Exception("Maintenance account only");
  if(!File.Exists(FilePath)||Hash(File.ReadAllBytes(FilePath))!=Digest)throw new Exception("Wallpaper missing or invalid");
  using(var key=Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Policies\System")){key.SetValue("Wallpaper",FilePath);key.SetValue("WallpaperStyle","10");}
  using(var key=Registry.CurrentUser.CreateSubKey(@"Control Panel\Desktop")){key.SetValue("WallpaperStyle","10");key.SetValue("TileWallpaper","0");}
  if(!SystemParametersInfo(20,0,FilePath,3))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());return 0;
 }
}}
