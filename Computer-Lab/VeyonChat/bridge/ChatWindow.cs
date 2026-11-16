// SPDX-License-Identifier: GPL-2.0-or-later
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace UEPLV.VeyonIntegration {
  sealed class ChatWindow:Form {
    readonly bool teacher;string[] targets;readonly bool startHidden;
    readonly ListBox contacts=new ListBox{Dock=DockStyle.Left,Width=165,BorderStyle=BorderStyle.None};
    readonly RichTextBox conversation=new RichTextBox{Dock=DockStyle.Fill,ReadOnly=true,BorderStyle=BorderStyle.None,BackColor=Color.White,DetectUrls=false};
    readonly TextBox message=new TextBox{Dock=DockStyle.Fill,MaxLength=2000,Multiline=true};
    readonly Button send=new Button{Text="Enviar",Dock=DockStyle.Right,Width=90};
    readonly Label status=new Label{Dock=DockStyle.Bottom,Height=30,Text="Conectando…",Padding=new Padding(8,4,0,0)};
    readonly ComboBox mode=new ComboBox{DropDownStyle=ComboBoxStyle.DropDownList,Width=240};
    readonly Button apply=new Button{Text="Aplicar",Width=85};
    readonly Label targetLabel=new Label{AutoSize=true,Padding=new Padding(8,7,0,0)};
    readonly CheckBox broadcast=new CheckBox{Text="Enviar a todos los seleccionados",Dock=DockStyle.Top,Height=27,AutoSize=false};
    readonly NotifyIcon tray=new NotifyIcon{Text="Chat del laboratorio",Icon=SystemIcons.Information,Visible=true};
    readonly Timer timer=new Timer{Interval=3000};
    readonly Timer openRequests=new Timer{Interval=350};
    Dictionary<string,object> snapshot;StaffSession session;bool busy,first=true,exiting;string currentName,draftId,draftText;
    readonly HashSet<string> seen=new HashSet<string>();
    public string QaPath;
    sealed class Contact {public string Name;public bool CanSend;public override string ToString(){return Name=="teacher"?"Docente":Name.Replace("UEPLV-","PC ");}}
    static readonly string[] Modes={"teacher-student","teacher-only","students"};
    public ChatWindow(bool isTeacher,string[] selected,bool hidden=false){
      startHidden=hidden;
      teacher=isTeacher;targets=selected??new string[0];Text="Chat del laboratorio";Size=new Size(820,550);MinimumSize=new Size(620,400);StartPosition=FormStartPosition.CenterScreen;Font=new Font("Segoe UI",10);BackColor=Color.FromArgb(247,245,240);
      ForeColor=Color.FromArgb(36,52,81);conversation.ForeColor=ForeColor;contacts.ForeColor=ForeColor;contacts.ItemHeight=28;conversation.Margin=new Padding(14);message.BorderStyle=BorderStyle.FixedSingle;
      foreach(var button in new[]{send,apply}){button.FlatStyle=FlatStyle.Flat;button.FlatAppearance.BorderSize=0;button.BackColor=Color.FromArgb(245,190,79);button.ForeColor=ForeColor;button.Font=new Font("Segoe UI",10,FontStyle.Bold);}
      var bottom=new Panel{Dock=DockStyle.Bottom,Height=64,Padding=new Padding(8)};bottom.Controls.Add(message);bottom.Controls.Add(send);
      var main=new Panel{Dock=DockStyle.Fill,Padding=new Padding(8)};main.Controls.Add(conversation);main.Controls.Add(contacts);
      Controls.Add(main);Controls.Add(bottom);Controls.Add(status);
      if(teacher){var top=new FlowLayoutPanel{Dock=DockStyle.Top,Height=48,Padding=new Padding(8)};mode.Items.AddRange(new object[]{"Docente ↔ estudiantes","Solo mensajes del docente","Permitir entre estudiantes"});mode.SelectedIndex=0;top.Controls.Add(mode);top.Controls.Add(apply);targetLabel.Text=targets.Length==1?targets[0]:targets.Length+" equipos";top.Controls.Add(targetLabel);Controls.Add(top);bottom.Controls.Add(broadcast);bottom.Height=90;apply.Click+=async(s,e)=>await Configure();}
      contacts.SelectedIndexChanged+=(s,e)=>Render();send.Click+=async(s,e)=>await Send();message.KeyDown+=async(s,e)=>{if(e.KeyCode==Keys.Enter&&!e.Shift){e.SuppressKeyPress=true;await Send();}};
      tray.DoubleClick+=(s,e)=>Open();tray.BalloonTipClicked+=(s,e)=>Open();
      var menu=new ContextMenuStrip();menu.Items.Add("Abrir chat",null,(s,e)=>Open());tray.ContextMenuStrip=menu;
      FormClosing+=(s,e)=>{if(!exiting&&e.CloseReason==CloseReason.UserClosing){e.Cancel=true;Hide();}};
      FormClosed+=(s,e)=>{exiting=true;timer.Stop();openRequests.Stop();tray.Dispose();};
      openRequests.Tick+=async(s,e)=>{if(!teacher)return;try{string file=Path.Combine(SessionStore.DirectoryPath,"chat-open.json");if(File.Exists(file)){var request=Api.Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(file));var names=Options.ParseTargets(Api.String(request,"targets"));File.Delete(file);targets=names;targetLabel.Text=targets.Length==1?targets[0]:targets.Length+" equipos";snapshot=null;contacts.Items.Clear();send.Enabled=message.Enabled=false;first=true;Open();timer.Interval=3000;await Poll();}if(System.Diagnostics.Process.GetProcessesByName("veyon-master").Length==0&&QaPath==null){exiting=true;Close();}}catch{}};
      timer.Tick+=async(s,e)=>await Poll();Shown+=async(s,e)=>{if(!teacher||startHidden)Hide();if(teacher)openRequests.Start();await Poll();timer.Start();};
    }
    void Open(){Show();WindowState=FormWindowState.Normal;Activate();}
    async Task<Dictionary<string,object>> Call(Dictionary<string,object> body){
      if(teacher){if(session==null)session=SessionStore.Load();try{return await Api.Call(session,"chat",body);}catch(LoginRequired){}if(!Visible)throw new Exception("Sin sesión.");using(var login=new LoginForm()){if(login.ShowDialog(this)!=DialogResult.OK)throw new Exception("Sin sesión.");}session=SessionStore.Load();return await Api.Call(session,"chat",body);}
      string path=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),"UEPLV","Chat","student-session.json");
      var config=Api.Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(path));body["token"]=Api.String(config,"token");
      var request=(HttpWebRequest)WebRequest.Create(SessionStore.BaseUrl+"/api/chat/student");request.Method="POST";request.ContentType="application/json";request.AllowAutoRedirect=false;request.Timeout=15000;request.ReadWriteTimeout=15000;
      var bytes=Encoding.UTF8.GetBytes(Api.Json.Serialize(body));request.ContentLength=bytes.Length;
      using(var cancel=new System.Threading.CancellationTokenSource(18000))using(cancel.Token.Register(request.Abort)){
        try{using(var stream=await request.GetRequestStreamAsync())await stream.WriteAsync(bytes,0,bytes.Length);
          using(var response=(HttpWebResponse)await request.GetResponseAsync())using(var stream=response.GetResponseStream())using(var output=new MemoryStream()){
            byte[] buffer=new byte[8192];int n;while((n=await stream.ReadAsync(buffer,0,buffer.Length))>0){if(output.Length+n>524288)throw new Exception("Respuesta no válida.");output.Write(buffer,0,n);}return Api.Json.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(output.ToArray()));}}
        catch(WebException ex){var response=ex.Response as HttpWebResponse;if(response!=null){int code=(int)response.StatusCode;response.Dispose();if(code==403)throw new Exception("Este chat no está permitido.");if(code==429)throw new Exception("Espera unos segundos.");}throw new Exception("Chat sin conexión.");}
      }
    }
    async Task Poll(){if(busy||exiting)return;busy=true;try{
      snapshot=await Call(new Dictionary<string,object>{{"op","poll"}});currentName=Api.String(snapshot,"name");
      if(teacher&&first){var configured=Api.Object(snapshot,"deviceModes");if(configured!=null){var modes=targets.Select(n=>Api.String(configured,n)).Where(n=>n.Length>0).Distinct().ToArray();mode.SelectedIndex=modes.Length==1?Array.IndexOf(Modes,modes[0]):-1;}}
      string selected=contacts.SelectedItem is Contact?((Contact)contacts.SelectedItem).Name:null;
      var values=Api.Objects(snapshot,"contacts").Select(c=>new Contact{Name=Api.String(c,"name"),CanSend=c.ContainsKey("canSend")&&Convert.ToBoolean(c["canSend"])}).ToList();
      if(teacher)values=values.Where(c=>targets.Contains(c.Name)).ToList();
      contacts.BeginUpdate();contacts.Items.Clear();contacts.Items.AddRange(values.Cast<object>().ToArray());contacts.SelectedIndex=Math.Max(0,values.FindIndex(c=>c.Name==selected));if(values.Count==0)contacts.SelectedIndex=-1;contacts.EndUpdate();
      foreach(var m in Api.Objects(snapshot,"messages")){string id=Api.String(m,"id");if(seen.Add(id)&&!first&&Api.String(m,"to")==currentName){tray.BalloonTipTitle=LabelFor(Api.String(m,"from"));tray.BalloonTipText=Api.String(m,"text").Substring(0,Math.Min(180,Api.String(m,"text").Length));tray.ShowBalloonTip(5000);}}
      if(seen.Count>2000){seen.Clear();foreach(var m in Api.Objects(snapshot,"messages"))seen.Add(Api.String(m,"id"));}
      first=false;status.Text=teacher?"Conectado":Api.String(snapshot,"mode")=="teacher-only"?"Solo mensajes del docente":"Conectado";timer.Interval=3000;Render();WriteDiagnostics(true);
      if(QaPath!=null){string report=QaPath;QaPath=null;PerformLayout();using(var bitmap=new Bitmap(Width,Height)){DrawToBitmap(bitmap,new Rectangle(0,0,Width,Height));bitmap.Save(report+".png");}File.WriteAllText(report,Api.Json.Serialize(new{connected=true,contactCount=contacts.Items.Count,messageCount=Api.Objects(snapshot,"messages").Count(),sendEnabled=send.Enabled,selected=contacts.SelectedItem==null?"":((Contact)contacts.SelectedItem).Name,utc=DateTime.UtcNow.ToString("o")}));exiting=true;BeginInvoke(new Action(Close));}
    }catch(Exception ex){status.Text=ex is FileNotFoundException?"Conectando…":ex.Message;send.Enabled=false;message.Enabled=false;timer.Interval=Math.Min(30000,timer.Interval+3000);WriteDiagnostics(false);}finally{busy=false;}}
    string lastDiagnostic;DateTime lastDiagnosticUtc;
    void WriteDiagnostics(bool connected){try{string state=Api.Json.Serialize(new{connected,visible=Visible,mode=Api.String(snapshot,"mode"),contacts=contacts.Items.Cast<Contact>().Select(c=>new{name=c.Name,canSend=c.CanSend}).ToArray(),messageCount=Api.Objects(snapshot,"messages").Count(),sendEnabled=send.Enabled});if(state==lastDiagnostic&&DateTime.UtcNow-lastDiagnosticUtc<TimeSpan.FromMinutes(1))return;string root=teacher?SessionStore.DirectoryPath:Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"UEPLV","Chat");Directory.CreateDirectory(root);File.WriteAllText(Path.Combine(root,teacher?"teacher-chat-state.json":"client-status.json"),state);lastDiagnostic=state;lastDiagnosticUtc=DateTime.UtcNow;}catch{}}
    static string LabelFor(string name){return name=="teacher"?"Docente":name.Replace("UEPLV-","PC ");}
    void Render(){if(snapshot==null)return;var contact=contacts.SelectedItem as Contact;bool allowed=contact!=null&&contact.CanSend;send.Enabled=message.Enabled=allowed;
      string text=string.Join(Environment.NewLine+Environment.NewLine,Api.Objects(snapshot,"messages").Where(m=>contact!=null&&(Api.String(m,"from")==contact.Name||Api.String(m,"to")==contact.Name)).Select(m=>LabelFor(Api.String(m,"from"))+" · "+DateTime.Parse(Api.String(m,"utc")).ToLocalTime().ToString("HH:mm")+Environment.NewLine+Api.String(m,"text")));
      if(conversation.Text!=text){conversation.Text=text;conversation.SelectionStart=conversation.TextLength;conversation.ScrollToCaret();}}
    async Task Send(){var contact=contacts.SelectedItem as Contact;if(busy||contact==null||!contact.CanSend||string.IsNullOrWhiteSpace(message.Text))return;busy=true;send.Enabled=false;string text=message.Text;string key=contact.Name+":"+broadcast.Checked+":"+text;if(draftText!=key){draftText=key;draftId=Guid.NewGuid().ToString();}try{await Call(new Dictionary<string,object>{{"op","send"},{"requestId",draftId},{"text",text},{"recipients",teacher&&broadcast.Checked?targets:new[]{contact.Name}}});message.Clear();draftId=draftText=null;}catch(Exception ex){status.Text=ex.Message;}finally{busy=false;}await Poll();}
    async Task Configure(){if(busy||mode.SelectedIndex<0)return;busy=true;apply.Enabled=false;try{var result=await Call(new Dictionary<string,object>{{"op","configure"},{"mode",Modes[mode.SelectedIndex]},{"targets",targets}});var unavailable=result.ContainsKey("unavailable")?result["unavailable"] as System.Collections.IEnumerable:null;var names=unavailable==null?new string[0]:unavailable.Cast<object>().Select(Convert.ToString).ToArray();if(names.Length>0)MessageBox.Show(this,"Chat pendiente de instalar: "+string.Join(", ",names),"Chat");status.Text="Configuración aplicada.";}catch(Exception ex){status.Text=ex.Message;}finally{busy=false;apply.Enabled=true;}await Poll();}
  }
}
