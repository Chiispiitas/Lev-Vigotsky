// SPDX-License-Identifier: GPL-2.0-or-later
using System;
using System.IO;
using System.Security.Principal;
using System.Threading;
using System.Windows.Forms;
namespace UEPLV.VeyonIntegration {
  static class ChatHost {
    public static void Run(string[] targets,bool hidden){
      using(var mutex=new Mutex(false,"Local\\UEPLVTeacherChat_"+WindowsIdentity.GetCurrent().User.Value)){
        bool acquired=false;try{try{acquired=mutex.WaitOne(0);}catch(AbandonedMutexException){acquired=true;}
          if(!acquired){if(!hidden){Directory.CreateDirectory(SessionStore.DirectoryPath);string file=Path.Combine(SessionStore.DirectoryPath,"chat-open.json"),temp=file+"."+Guid.NewGuid()+".tmp";File.WriteAllText(temp,Api.Json.Serialize(new{targets=string.Join(",",targets)}));try{if(File.Exists(file))File.Replace(temp,file,null);else File.Move(temp,file);}finally{if(File.Exists(temp))File.Delete(temp);}}return;}
          Application.Run(new ChatWindow(true,targets,hidden));
        }finally{if(acquired)mutex.ReleaseMutex();}
      }
    }
  }
}
