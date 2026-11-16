#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [string]$PayloadRoot,
    [string]$InitialVersion='1.6.0'
)
$ErrorActionPreference='Stop'
if(-not $PayloadRoot){$PayloadRoot=$PSScriptRoot}
if(-not [Environment]::Is64BitProcess){throw 'Use 64-bit Windows PowerShell.'}
. (Join-Path $PayloadRoot 'Invoke-AutomaticUpdate.ps1') -LibraryOnly
Get-ReleaseVersion $InitialVersion|Out-Null
$key=Join-Path $PayloadRoot 'release-public.xml';$coordinator=Join-Path $PayloadRoot 'Invoke-AutomaticUpdate.ps1'
foreach($path in @($key,$coordinator)){if(-not(Test-Path -LiteralPath $path -PathType Leaf)){throw 'Automatic updater package is incomplete.'}}
$rsa=[Security.Cryptography.RSACryptoServiceProvider]::new();$rsa.PersistKeyInCsp=$false
try{$rsa.FromXmlString([IO.File]::ReadAllText($key));if(-not $rsa.PublicOnly -or $rsa.KeySize -lt 3072){throw 'Updater package must contain only a pinned RSA3072 public key.'}}finally{$rsa.Dispose()}
try{$filter=Get-CimInstance -Namespace 'root\standardcimv2\embedded' -ClassName UWF_Filter -ErrorAction Stop;if($filter.CurrentEnabled -or $filter.NextEnabled){throw 'Install/update the automatic updater only while UWF is disabled now and next boot.'}}catch{
    $feature=Get-WindowsOptionalFeature -Online -FeatureName Client-UnifiedWriteFilter
    if($feature.State -in @('Enabled','EnablePending','DisablePending')){throw}
}
$program=Join-Path $env:ProgramFiles 'UEPLV\Management\Update';$state=Join-Path $env:ProgramData 'UEPLV\Update'
Assert-OrdinaryUpdatePath $program (Join-Path $env:ProgramFiles 'UEPLV') -AllowMissing|Out-Null
Assert-OrdinaryUpdatePath $state (Join-Path $env:ProgramData 'UEPLV') -AllowMissing|Out-Null
[IO.Directory]::CreateDirectory($program)|Out-Null;[IO.Directory]::CreateDirectory($state)|Out-Null
$acl=[Security.AccessControl.DirectorySecurity]::new();$acl.SetAccessRuleProtection($true,$false)
foreach($sid in @('S-1-5-18','S-1-5-32-544')){$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new($sid),'FullControl','ContainerInherit,ObjectInherit','None','Allow'))}
Set-Acl -LiteralPath $state -AclObject $acl
$installedKey=Join-Path $program 'release-public.xml'
if(Test-Path -LiteralPath $installedKey){if((Get-PathHash $installedKey) -cne (Get-PathHash $key)){throw 'Pinned update key differs; it was not replaced silently.'}}
Copy-Item -LiteralPath $coordinator -Destination (Join-Path $program 'Invoke-AutomaticUpdate.ps1') -Force
Copy-Item -LiteralPath $key -Destination $installedKey -Force
Get-ChildItem -LiteralPath $program -File | ForEach-Object { $_.IsReadOnly=$false }
$statePath=Join-Path $state 'update-state.json';$checkpointPath=Join-Path $state 'update-checkpoint.json';$pendingPath=Join-Path $state 'pending-package.json'
if(-not(Test-Path -LiteralPath $statePath)){[IO.File]::WriteAllText($statePath,(New-UpdateState $InitialVersion|ConvertTo-Json -Depth 20),[Text.UTF8Encoding]::new($false))}
if(-not(Test-Path -LiteralPath $checkpointPath)){[IO.File]::WriteAllText($checkpointPath,([IO.File]::ReadAllText($statePath)),[Text.UTF8Encoding]::new($false))}
if(-not(Test-Path -LiteralPath $pendingPath)){[IO.File]::WriteAllText($pendingPath,'{}',[Text.UTF8Encoding]::new($false))}
Assert-PrivateUpdateFile $statePath;Assert-PrivateUpdateFile $checkpointPath;Assert-PrivateUpdateFile $pendingPath
Read-UpdateState $statePath $checkpointPath|Out-Null
$action=New-ScheduledTaskAction -Execute (Join-Path $env:windir 'System32\WindowsPowerShell\v1.0\powershell.exe') -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+(Join-Path $program 'Invoke-AutomaticUpdate.ps1')+'"')
$startup=New-ScheduledTaskTrigger -AtStartup
$periodic=New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(2)) -RepetitionInterval (New-TimeSpan -Minutes 15)
$principal=New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName 'UEPLV-AutomaticUpdate' -Action $action -Trigger @($startup,$periodic) -Principal $principal -Settings $settings -Description 'Verifies signed online UEPLV releases and installs at the next normal restart.' -Force|Out-Null
$scheduler=New-Object -ComObject Schedule.Service;$scheduler.Connect()
$task=$scheduler.GetFolder('\').GetTask('UEPLV-AutomaticUpdate');$task.SetSecurityDescriptor('D:P(A;;FA;;;SY)(A;;FA;;;BA)',0)
Write-Output 'Automatic signed updates installed. Downloaded releases wait for the next normal restart; no restart was requested.'
