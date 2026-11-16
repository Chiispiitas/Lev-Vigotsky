using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace UEPLV {
  static class ShutdownSchedule {
    public const int WarningSeconds=120;
    public const int CancelExitCode=42;
    static readonly TimeZoneInfo Zone=TimeZoneInfo.FindSystemTimeZoneById("SA Pacific Standard Time");
    public static string LocalDate(DateTime utc){return TimeZoneInfo.ConvertTimeFromUtc(utc.ToUniversalTime(),Zone).ToString("yyyy-MM-dd",CultureInfo.InvariantCulture);}
    public static bool Due(DateTime utc,string handledDate){var local=TimeZoneInfo.ConvertTimeFromUtc(utc.ToUniversalTime(),Zone);return local.Hour==14&&local.Minute==0&&LocalDate(utc)!=handledDate;}
    public static bool KeyboardKey(int key){return key>=8&&key<=254;}
    public static void PowerOff(int seconds){if(seconds!=0&&seconds!=60)throw new ArgumentException("Invalid shutdown delay");Util.Run(Path.Combine(Environment.SystemDirectory,"shutdown.exe"),"/s /f /t "+seconds+" /c \"LEV VIGOTSKY: apagado del equipo. Guarda tu trabajo.\"",10000);}

    [StructLayout(LayoutKind.Sequential)] struct Session {public int Id;public IntPtr Name;public int State;}
    [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct Startup {public int cb;public string reserved,desktop,title;public int x,y,cx,cy,charsX,charsY,fill,flags;public short show,reservedSize;public IntPtr reservedBytes,input,output,error;}
    [StructLayout(LayoutKind.Sequential)] struct ProcessInfo {public IntPtr process,thread;public int pid,tid;}
    [DllImport("wtsapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool WTSEnumerateSessions(IntPtr server,int reserved,int version,out IntPtr data,out int count);
    [DllImport("wtsapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool WTSQuerySessionInformation(IntPtr server,int session,int info,out IntPtr data,out int bytes);
    [DllImport("wtsapi32.dll")] static extern void WTSFreeMemory(IntPtr data);
    [DllImport("wtsapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool WTSQueryUserToken(uint session,out IntPtr token);
    [DllImport("userenv.dll",SetLastError=true)] static extern bool CreateEnvironmentBlock(out IntPtr environment,IntPtr token,bool inherit);
    [DllImport("userenv.dll")] static extern bool DestroyEnvironmentBlock(IntPtr environment);
    [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcessAsUser(IntPtr token,string application,StringBuilder command,IntPtr processSecurity,IntPtr threadSecurity,bool inherit,int flags,IntPtr environment,string directory,ref Startup startup,out ProcessInfo process);
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process,out uint exitCode);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr process,uint exitCode);

    static List<int> ActiveSessions(){IntPtr data;int count;var sessions=new List<int>();if(!WTSEnumerateSessions(IntPtr.Zero,0,1,out data,out count))throw new Win32Exception();try{int size=Marshal.SizeOf(typeof(Session));for(int i=0;i<count;i++){var item=(Session)Marshal.PtrToStructure(IntPtr.Add(data,i*size),typeof(Session));if(item.Id<=0||item.State!=0)continue;IntPtr name;int length;if(!WTSQuerySessionInformation(IntPtr.Zero,item.Id,5,out name,out length))throw new Win32Exception();try{if(!string.IsNullOrWhiteSpace(Marshal.PtrToStringUni(name)))sessions.Add(item.Id);}finally{WTSFreeMemory(name);}}}finally{WTSFreeMemory(data);}return sessions;}
    static IntPtr Launch(int session,int seconds,bool preview){IntPtr token=IntPtr.Zero,environment=IntPtr.Zero;try{if(!WTSQueryUserToken((uint)session,out token))throw new Win32Exception();if(!CreateEnvironmentBlock(out environment,token,false))throw new Win32Exception();string exe=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"UEPLV.Management.exe");var startup=new Startup{cb=Marshal.SizeOf(typeof(Startup)),desktop=@"winsta0\default",flags=1,show=1};ProcessInfo process;var command=new StringBuilder("\""+exe+"\" shutdown-warning "+seconds+" "+(preview?"preview":"daily"));if(!CreateProcessAsUser(token,exe,command,IntPtr.Zero,IntPtr.Zero,false,0x400|0x08000000,environment,AppDomain.CurrentDomain.BaseDirectory,ref startup,out process))throw new Win32Exception();CloseHandle(process.thread);return process.process;}finally{if(environment!=IntPtr.Zero)DestroyEnvironmentBlock(environment);if(token!=IntPtr.Zero)CloseHandle(token);}}
    // Only the exit status of our own notification processes is read. No key values are stored or transmitted.
    public static string Warn(int seconds,bool preview,Func<bool> stopped){var children=new List<IntPtr>();try{var sessions=ActiveSessions();if(sessions.Count==0)return "no-session";foreach(int session in sessions)children.Add(Launch(session,seconds,preview));var timer=Stopwatch.StartNew();while(timer.Elapsed.TotalSeconds<seconds+30){if(stopped())return "interrupted";bool allExited=true;foreach(var child in children){uint code;if(!GetExitCodeProcess(child,out code))throw new Win32Exception();if(code==CancelExitCode)return "cancelled";if(code==259)allExited=false;else if(code!=0)throw new Exception("La notificación de apagado terminó con un error.");}if(allExited&&timer.Elapsed.TotalSeconds>=seconds)return "timeout";Thread.Sleep(100);}throw new Exception("La notificación de apagado no confirmó el vencimiento.");}finally{foreach(var child in children){uint code;if(GetExitCodeProcess(child,out code)&&code==259)TerminateProcess(child,0);CloseHandle(child);}}}
    public static bool ShouldPowerOff(string outcome,bool preview,bool safe){return !preview&&safe&&(outcome=="timeout"||outcome=="no-session");}

    [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
    public static int ShowWarning(int seconds,bool preview){if(seconds<10||seconds>600)throw new ArgumentException("Invalid warning duration");Application.SetUnhandledExceptionMode(UnhandledExceptionMode.ThrowException);Application.EnableVisualStyles();int result=0;using(var form=new Form()){form.Text=preview?"Prueba de apagado automático":"Apagado automático";form.Size=new Size(560,285);form.FormBorderStyle=FormBorderStyle.FixedDialog;form.MaximizeBox=false;form.MinimizeBox=false;form.ControlBox=false;form.StartPosition=FormStartPosition.CenterScreen;form.TopMost=true;form.KeyPreview=true;form.Font=new Font("Segoe UI",12);form.BackColor=Color.FromArgb(250,248,244);var heading=new Label{Text=preview?"Prueba de aviso de apagado":"Este equipo se apagará automáticamente",AutoSize=false,Location=new Point(24,20),Size=new Size(500,35),Font=new Font("Segoe UI",15,FontStyle.Bold)};var countdown=new Label{Text="",Location=new Point(24,60),Size=new Size(500,52),Font=new Font("Segoe UI",28,FontStyle.Bold),TextAlign=ContentAlignment.MiddleCenter};var message=new Label{Text=preview?"Presiona cualquier tecla para cancelar la prueba.":"Guarda tu trabajo. Presiona cualquier tecla para cancelar el apagado de hoy.",Location=new Point(24,120),Size=new Size(500,56),TextAlign=ContentAlignment.MiddleCenter};var cancel=new Button{Text="Seguir usando este equipo",Location=new Point(110,184),Size=new Size(320,38)};Action cancelAction=()=>{result=CancelExitCode;form.Close();};cancel.Click+=(s,e)=>cancelAction();form.KeyDown+=(s,e)=>{e.Handled=true;e.SuppressKeyPress=true;cancelAction();};form.Controls.AddRange(new Control[]{heading,countdown,message,cancel});var elapsed=Stopwatch.StartNew();using(var tick=new System.Windows.Forms.Timer{Interval=100}){tick.Tick+=(s,e)=>{for(int key=8;key<=254;key++)if(KeyboardKey(key)&&(GetAsyncKeyState(key)&0x8000)!=0){cancelAction();return;}int remaining=Math.Max(0,seconds-(int)elapsed.Elapsed.TotalSeconds);countdown.Text=TimeSpan.FromSeconds(remaining).ToString(@"mm\:ss");if(elapsed.Elapsed.TotalSeconds>=seconds){result=0;form.Close();}};form.Shown+=(s,e)=>{elapsed.Restart();form.Activate();tick.Start();};Application.Run(form);}}return result;}
  }
}
