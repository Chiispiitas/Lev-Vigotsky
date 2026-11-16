[CmdletBinding()]
param([switch]$CompileOnly)
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$csc=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
New-Item -ItemType Directory -Path (Join-Path $root 'bin') -Force | Out-Null
$sdk=Join-Path $root '..\Runtime\1.0.4314.35'
& $csc /nologo /target:winexe /platform:x64 /optimize+ ('/out:'+(Join-Path $root 'bin\UEPLV.Chat.exe')) /r:System.dll /r:System.Core.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:System.Web.Extensions.dll /r:System.Security.dll ('/r:'+(Join-Path $sdk 'Microsoft.Web.WebView2.Core.dll')) ('/r:'+(Join-Path $sdk 'Microsoft.Web.WebView2.WinForms.dll')) (Join-Path $root 'ChatSource\LabControlBridge.cs') (Join-Path $root 'ChatSource\ChatWindow.cs') (Join-Path $root 'ChatSource\ChatHost.cs') ('/resource:'+(Join-Path $root 'ChatSource\chat.html')+',chat.html')
if($LASTEXITCODE -ne 0){throw 'Chat client compilation failed.'}
& $csc /nologo /target:exe /platform:x64 /optimize+ ('/out:'+ (Join-Path $root 'bin\UEPLV.Management.exe')) /reference:System.Security.dll /reference:System.ServiceProcess.dll /reference:System.Management.dll /reference:System.Web.Extensions.dll /reference:System.Windows.Forms.dll /reference:System.Drawing.dll (Join-Path $root 'src\UEPLV.Management.cs') (Join-Path $root 'src\ShutdownSchedule.cs') (Join-Path $root 'src\SessionTransitions.cs') (Join-Path $root 'src\FreezeSchedule.cs') (Join-Path $root 'src\ChatSupport.cs') (Join-Path $root 'src\ChatDependencies.cs') (Join-Path $root 'src\MaintenanceWallpaper.cs') ('/resource:'+(Join-Path $root 'bin\UEPLV.Chat.exe')+',UEPLV.Chat.exe')
if($LASTEXITCODE -ne 0){throw 'Management compilation failed.'}
& (Join-Path $root 'bin\UEPLV.Management.exe') self-test
if($LASTEXITCODE -ne 0){throw 'Management security checks failed.'}
if($CompileOnly){return}
$teacher=Join-Path $root 'TeacherGateway'
$enrollment=Join-Path $root 'Enrollment'
if(Test-Path -LiteralPath (Join-Path $teacher 'gateway-config.json')){throw 'Credentials already exist. Use -CompileOnly to preserve deployed identities.'}
New-Item -ItemType Directory -Path $teacher,$enrollment -Force | Out-Null
$rng=[Security.Cryptography.RandomNumberGenerator]::Create()
function New-Token([int]$Length){$bytes=New-Object byte[] $Length;$rng.GetBytes($bytes);[Convert]::ToBase64String($bytes)}
$rsa=New-Object Security.Cryptography.RSACryptoServiceProvider 3072
$rsa.PersistKeyInCsp=$false
try{
  $public=$rsa.ToXmlString($false)
  $keys=[ordered]@{}
  foreach($n in 1..33){
    $name='UEPLV-{0:D2}' -f $n
    $key=New-Token 64
    $keys[$name]=$key
    $profile=[ordered]@{name=$name;key=$key;discoveryPublicKey=$public;gatewayPort=8773;discoveryPort=8774;pollSeconds=15;gatewayHost=$null;cloudUrl=$null;cloudKey=$null;cloudPollSeconds=75}
    [IO.File]::WriteAllText((Join-Path $enrollment ($name+'.json')),($profile|ConvertTo-Json -Depth 4),(New-Object Text.UTF8Encoding $false))
  }
  $config=[ordered]@{discoveryPrivateKey=$rsa.ToXmlString($true);dashboardToken=(New-Token 32);agentPort=8773;dashboardPort=8772;discoveryPort=8774;keys=$keys}
  [IO.File]::WriteAllText((Join-Path $teacher 'gateway-config.json'),($config|ConvertTo-Json -Depth 5),(New-Object Text.UTF8Encoding $false))
  [IO.File]::WriteAllText((Join-Path $root 'discovery-public.xml'),$public)
}finally{$rsa.Dispose();$rng.Dispose()}
Write-Output 'Built agent/gateway and 33 distinct device credentials. TeacherGateway and Enrollment are staff-only installation media.'
