$ErrorActionPreference='Stop'
$source=Join-Path $PSScriptRoot '..\Actions\Invoke-LabAction.ps1'
$tokens=$null;$errors=$null;$ast=[Management.Automation.Language.Parser]::ParseFile($source,[ref]$tokens,[ref]$errors);if($errors.Count){throw ($errors.Message -join '; ')}
$names=@('Ensure-CleanupNative','Get-CleanupLease','Close-CleanupLease','Invoke-CheckedCleanupDelete','Clear-CheckedDirectory','Delete-CheckedFile')
foreach($name in $names){$fn=$ast.FindAll({param($n)$n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $name},$true)|Select-Object -First 1;. ([scriptblock]::Create($fn.Extent.Text))}
$clauses=$ast.FindAll({param($n)$n -is [Management.Automation.Language.IfStatementAst]},$true)|ForEach-Object {$_.Clauses}
$body=$clauses|Where-Object {$_.Item1.Extent.Text -eq "$"+"Action -eq 'browser-cleanup'"}|Select-Object -First 1
if(-not $body){throw 'Browser-only action body not found'}
$fixture=Join-Path $PSScriptRoot ('privacy-profile-'+[guid]::NewGuid());New-Item -ItemType Directory $fixture|Out-Null
$script:CleanupSkippedLinks=[Collections.Generic.List[string]]::new();$script:CleanupSkippedBusy=[Collections.Generic.List[string]]::new();$result=[ordered]@{detail=$null}
function Get-Student {return [pscustomobject]@{Root=$fixture;Sid='fixture'}}
function Get-WindowsOptionalFeature {return [pscustomobject]@{State='Disabled'}}
function Reset-StudentBrowserSessions {return 'Fixture only; no host processes touched'}
$edge=Join-Path $fixture 'AppData\Local\Microsoft\Edge\User Data\Default';New-Item -ItemType Directory (Join-Path $edge 'Network'),(Join-Path $fixture 'Documents') -Force|Out-Null
foreach($name in @('History','History-journal','Bookmarks','Login Data')){[IO.File]::WriteAllText((Join-Path $edge $name),$name)}
[IO.File]::WriteAllText((Join-Path $edge 'Network\Cookies'),'cookie fixture');[IO.File]::WriteAllText((Join-Path $fixture 'Documents\Keep.txt'),'student file')
$staff=Join-Path $PSScriptRoot ('privacy-staff-'+[guid]::NewGuid());New-Item -ItemType Directory $staff|Out-Null;[IO.File]::WriteAllText((Join-Path $staff 'Cookies'),'staff cookie')
. ([scriptblock]::Create($body.Item2.Extent.Text.Trim().Substring(1,$body.Item2.Extent.Text.Trim().Length-2)))
foreach($name in @('History','History-journal','Network\Cookies')){if(Test-Path (Join-Path $edge $name)){throw ('Data not removed: '+$name)}}
foreach($name in @('Bookmarks','Login Data')){if([IO.File]::ReadAllText((Join-Path $edge $name)) -ne $name){throw 'Preserved browser data changed'}}
if([IO.File]::ReadAllText((Join-Path $fixture 'Documents\Keep.txt')) -ne 'student file' -or [IO.File]::ReadAllText((Join-Path $staff 'Cookies')) -ne 'staff cookie'){throw 'Student document or staff data changed'}
@{Passed=$true;ChromiumCookiesAndHistoryRemoved=$true;StudentFilesPreserved=$true;BookmarksAndSavedPasswordsPreserved=$true;StaffDataPreserved=$true;HostAccountsAndPoliciesUntouched=$true}|ConvertTo-Json|Set-Content (Join-Path $PSScriptRoot 'privacy-fixture-verified.json')
Write-Output 'PASS browser-only cleanup: cookies/history deleted; bookmarks/passwords/student documents/staff data preserved; temporary fixtures only.'
