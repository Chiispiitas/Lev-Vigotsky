[CmdletBinding()]
param([string]$OutputName='UEPLV.VeyonBridge.exe')
$ErrorActionPreference='Stop'
if($OutputName -notmatch '^UEPLV\.VeyonBridge(?:-[a-z]+)?\.exe$'){throw 'Unexpected bridge output name'}
$framework=Join-Path $env:windir 'Microsoft.NET\Framework64\v4.0.30319'
& (Join-Path $framework 'csc.exe') /nologo /target:winexe /platform:anycpu /optimize+ ('/out:'+(Join-Path $PSScriptRoot $OutputName)) /r:System.dll /r:System.Core.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:System.Web.Extensions.dll /r:System.Security.dll (Join-Path $PSScriptRoot 'LabControlBridge.cs') (Join-Path $PSScriptRoot 'ChatWindow.cs') (Join-Path $PSScriptRoot 'ChatHost.cs')
if($LASTEXITCODE -ne 0){throw 'Bridge build failed'}
$p=Start-Process -FilePath (Join-Path $PSScriptRoot $OutputName) -ArgumentList '--self-test' -Wait -PassThru
if($p.ExitCode -ne 0){throw 'Bridge self-test failed'}
Write-Output 'Bridge built; argument and DPAPI self-tests passed without network requests.'
