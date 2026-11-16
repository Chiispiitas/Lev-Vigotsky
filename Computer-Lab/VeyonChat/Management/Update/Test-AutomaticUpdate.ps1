[CmdletBinding()]
param()
# Safe regression tests: library definitions, disposable files, and injected in-memory
# operations only. This file never installs a task or changes a service/UWF/host setting.
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'Invoke-AutomaticUpdate.ps1') -LibraryOnly
$script:passed=0;$script:fixture=$null
function Assert-True([bool]$Condition,[string]$Message){if(-not $Condition){throw $Message}}
function Assert-Equal($Actual,$Expected,[string]$Message){if($Actual -cne $Expected){throw ($Message+'; expected '+$Expected+', got '+$Actual)}}
function Test-Case([string]$Name,[scriptblock]$Body){& $Body;$script:passed++;Write-Output ('PASS '+$Name)}
function Assert-Throws([scriptblock]$Body){$thrown=$false;try{& $Body|Out-Null}catch{$thrown=$true};Assert-True $thrown 'Expected rejection'}
function New-SignedTestEnvelope($Entries,[string]$Version='1.2.1',[scriptblock]$ManifestEdit=$null,[scriptblock]$ZipEdit=$null){
    $memory=[IO.MemoryStream]::new();$zip=[IO.Compression.ZipArchive]::new($memory,[IO.Compression.ZipArchiveMode]::Create,$true)
    $files=[Collections.Generic.List[object]]::new()
    try{
        foreach($item in $Entries){
            $entry=$zip.CreateEntry($item.Path,[IO.Compression.CompressionLevel]::Optimal)
            if($item.PSObject.Properties['Attributes']){$entry.ExternalAttributes=$item.Attributes}
            $writer=$entry.Open();try{$writer.Write($item.Bytes,0,$item.Bytes.Length)}finally{$writer.Dispose()}
            $files.Add([pscustomobject]@{path=$item.Path;sha256=(Get-BytesHash $item.Bytes);size=$item.Bytes.Length})
        }
    }finally{$zip.Dispose()}
    $bytes=$memory.ToArray();$memory.Dispose()
    if($ZipEdit){$bytes=& $ZipEdit $bytes}
    $manifest=[pscustomobject]@{schemaVersion=1;version=$Version;issuedUtc=[datetime]::UtcNow.ToString('o');packageSha256=(Get-BytesHash $bytes);files=$files.ToArray()}
    if($ManifestEdit){& $ManifestEdit $manifest}
    $json=$manifest|ConvertTo-Json -Depth 10 -Compress
    $signature=$script:testRsa.SignData([Text.Encoding]::UTF8.GetBytes($json),[Security.Cryptography.CryptoConfig]::MapNameToOID('SHA256'))
    [pscustomobject]@{manifestJson=$json;signature=[Convert]::ToBase64String($signature);packageBase64=[Convert]::ToBase64String($bytes)}
}
function New-TestEntry([string]$Path,[string]$Text){[pscustomobject]@{Path=$Path;Bytes=[Text.Encoding]::UTF8.GetBytes($Text)}}
function New-CycleFixture([bool]$Protected=$true){
    $script:fixture=[pscustomobject]@{
        State=(New-UpdateState '1.2.0');Events=[Collections.Generic.List[string]]::new();Saved=[Collections.Generic.List[object]]::new()
        Snapshot=[pscustomobject]@{BootId='A';CurrentEnabled=$Protected;NextEnabled=$Protected;CurrentCProtected=$true;NextCProtected=$true;Servicing=$false;InitialDeploymentComplete=$true;AgentRunning=$true;Agent=[pscustomobject]@{maintenanceBlocked=$false;activeAction=$null;serviceStartId='old';policiesApplied=$true;version='1.2.0'}}
        Release=[pscustomobject]@{Version='1.2.1';PackageHash=('a'*64);Files=@([pscustomobject]@{Path='Actions/Invoke-LabAction.ps1'})}
        LoadFailure=$false;HealthFailures=0;ClearFailures=0;RestoreFailures=0;RollbackFailure=$false;RestartFailure=$false;SnapshotHook=$null;Runtime=@{}
    }
    $r=$script:fixture.Runtime
    $r.SaveState={param($s)$script:fixture.Events.Add('save:'+$s.phase);$script:fixture.Saved.Add(($s|ConvertTo-Json -Depth 20|ConvertFrom-Json))}
    $r.Snapshot={if($script:fixture.SnapshotHook){& $script:fixture.SnapshotHook};$script:fixture.Snapshot}
    $r.LoadRelease={if($script:fixture.LoadFailure){throw 'mock signature failure'};$script:fixture.Release}
    $r.SetFilter={param([bool]$enabled)$script:fixture.Events.Add('filter:'+$enabled);$script:fixture.Snapshot.NextEnabled=$enabled}
    $r.Backup={param($release)$script:fixture.Events.Add('backup');[pscustomobject]@{path='Actions/Invoke-LabAction.ps1';existed=$true;backup='mock.old';sha256=('b'*64)}}
    $r.StopAgent={$script:fixture.Events.Add('stop');$script:fixture.Snapshot.AgentRunning=$false}
    $r.Install={param($release)$script:fixture.Events.Add('install')}
    $r.StartAgent={$script:fixture.Events.Add('start');$script:fixture.Snapshot.AgentRunning=$true;$script:fixture.Snapshot.Agent.serviceStartId=[guid]::NewGuid().ToString()}
    $r.WaitHealthy={param($old,$expected)$script:fixture.Events.Add('health:'+ $expected);if($script:fixture.HealthFailures -gt 0){$script:fixture.HealthFailures--;throw 'mock unhealthy agent'}}
    $r.Rollback={param($entries)$script:fixture.Events.Add('rollback');if($script:fixture.RollbackFailure){throw 'mock rollback disk failure'}}
    $r.ClearPending={$script:fixture.Events.Add('clear');if($script:fixture.ClearFailures -gt 0){$script:fixture.ClearFailures--;throw 'mock cache write failure'}}
    $r.Restart={$script:fixture.Events.Add('restart');if($script:fixture.RestartFailure){throw 'mock restart failure'}}
    $r.RestoreProtection={param($s,$before)if($script:fixture.RestoreFailures -gt 0){$script:fixture.RestoreFailures--;throw 'mock restore failure'};Restore-UpdateProtection $s $script:fixture.Runtime}
    return $script:fixture
}
function Invoke-FixtureCycle{Invoke-UpdateCycle $script:fixture.State $script:fixture.Runtime}
function Move-FixtureBoot([string]$Boot){$script:fixture.Snapshot.BootId=$Boot;$script:fixture.Snapshot.CurrentEnabled=$script:fixture.Snapshot.NextEnabled}
function Count-Event([string]$Name){return @($script:fixture.Events|Where-Object {$_ -ceq $Name}).Count}

$temporary=Join-Path ([IO.Path]::GetTempPath()) ('UEPLV-update-tests-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($temporary)|Out-Null
$script:testRsa=[Security.Cryptography.RSACryptoServiceProvider]::new(3072);$script:testRsa.PersistKeyInCsp=$false
$public=$script:testRsa.ToXmlString($false)
try{
    Test-Case 'Windows PowerShell 5.1 syntax of updater and installer' {
        foreach($path in @('Invoke-AutomaticUpdate.ps1','Install-AutoUpdate.ps1')){
            $tokens=$null;$errors=$null;[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot $path),[ref]$tokens,[ref]$errors)|Out-Null
            Assert-Equal $errors.Count 0 ('Syntax '+$path)
        }
    }
    $valid=New-SignedTestEnvelope @((New-TestEntry 'Actions/Invoke-LabAction.ps1' "param()`r`nWrite-Output 'safe fixture'"),(New-TestEntry 'Commands/exam.json' '{"mode":"exam"}'))
    Test-Case 'RSA3072 SHA256 signed manifest, ZIP and per-file hashes accepted' {$release=Get-ValidatedRelease $valid $public;Assert-Equal $release.Version '1.2.1' 'Release version';Assert-Equal $release.Files.Count 2 'File count'}
    Test-Case 'Changed signed manifest rejected' {$bad=$valid.PSObject.Copy();$bad.manifestJson=$bad.manifestJson.Replace('1.2.1','1.2.2');Assert-Throws {Get-ValidatedRelease $bad $public}}
    Test-Case 'Wrong signing key rejected' {$other=[Security.Cryptography.RSACryptoServiceProvider]::new(3072);$other.PersistKeyInCsp=$false;try{Assert-Throws {Get-ValidatedRelease $valid $other.ToXmlString($false)}}finally{$other.Dispose()}}
    Test-Case 'Private signing key never accepted as pinned public key' {Assert-Throws {Get-ValidatedRelease $valid $script:testRsa.ToXmlString($true)}}
    Test-Case 'Changed package rejected before extraction' {$bad=$valid.PSObject.Copy();$bytes=[Convert]::FromBase64String($bad.packageBase64);$bytes[10]=$bytes[10] -bxor 1;$bad.packageBase64=[Convert]::ToBase64String($bytes);Assert-Throws {Get-ValidatedRelease $bad $public}}
    Test-Case 'Signed file hash mismatch rejected' {$bad=New-SignedTestEnvelope @((New-TestEntry 'Commands/exam.json' '{}')) -ManifestEdit {param($m)$m.files[0].sha256='f'*64};Assert-Throws {Get-ValidatedRelease $bad $public}}
    Test-Case 'ZIP traversal rejected' {$bad=New-SignedTestEnvelope @((New-TestEntry '../Actions/Invoke-LabAction.ps1' 'exit'));Assert-Throws {Get-ValidatedRelease $bad $public}}
    Test-Case 'Case mismatch, unknown script and duplicate paths rejected' {
        foreach($path in @('actions/Invoke-LabAction.ps1','Update/Install-AutoUpdate.ps1','Commands/exam.ps1','C:/Windows/payload.exe','Commands/a/../exam.json')){
            $bad=New-SignedTestEnvelope @((New-TestEntry $path '{}'));Assert-Throws {Get-ValidatedRelease $bad $public}
        }
        $bad=New-SignedTestEnvelope @((New-TestEntry 'Commands/exam.json' '{}'),(New-TestEntry 'Commands/exam.json' '{}'));Assert-Throws {Get-ValidatedRelease $bad $public}
    }
    Test-Case 'ZIP extra file and missing entry rejected' {
        $bad=New-SignedTestEnvelope @((New-TestEntry 'Commands/exam.json' '{}'),(New-TestEntry 'Commands/free.json' '{}')) -ManifestEdit {param($m)$m.files=@($m.files[0])};Assert-Throws {Get-ValidatedRelease $bad $public}
        $bad=New-SignedTestEnvelope @((New-TestEntry 'Commands/exam.json' '{}')) -ManifestEdit {param($m)$m.files+=([pscustomobject]@{path='Commands/free.json';size=2;sha256=('a'*64)})};Assert-Throws {Get-ValidatedRelease $bad $public}
    }
    Test-Case 'ZIP symlink and reparse entry rejected' {
        foreach($attributes in @(-1610612736,1024)){
            $entry=New-TestEntry 'Commands/exam.json' '{}';$entry|Add-Member NoteProperty Attributes $attributes
            $bad=New-SignedTestEnvelope @($entry);Assert-Throws {Get-ValidatedRelease $bad $public}
        }
    }
    Test-Case 'Signed oversized length, invalid version, future timestamp rejected' {
        foreach($edit in @({param($m)$m.files[0].size=8388609},{param($m)$m.version='01.2.1'},{param($m)$m.version='1.2.99999'},{param($m)$m.issuedUtc=[datetime]::UtcNow.AddHours(1).ToString('o')})){
            $bad=New-SignedTestEnvelope @((New-TestEntry 'Commands/exam.json' '{}')) -ManifestEdit $edit;Assert-Throws {Get-ValidatedRelease $bad $public}
        }
    }
    Test-Case 'Forged ZIP advertised length cannot overrun bounded signed read' {
        $bad=New-SignedTestEnvelope @((New-TestEntry 'Commands/exam.json' (' '*131072))) -ZipEdit {
            param($bytes)
            for($i=0;$i -lt $bytes.Length-24;$i++){
                if($bytes[$i] -eq 80 -and $bytes[$i+1] -eq 75 -and $bytes[$i+2] -eq 1 -and $bytes[$i+3] -eq 2){[Array]::Copy([BitConverter]::GetBytes([int]1),0,$bytes,$i+24,4)}
            };return ,$bytes
        } -ManifestEdit {param($m)$m.files[0].size=1}
        Assert-Throws {Get-ValidatedRelease $bad $public}
    }
    Test-Case 'Malformed PowerShell/JSON updates rejected before any install' {
        foreach($entry in @((New-TestEntry 'Actions/Invoke-LabAction.ps1' 'function {'),(New-TestEntry 'Commands/exam.json' '{broken'))){$bad=New-SignedTestEnvelope @($entry);Assert-Throws {Get-ValidatedRelease $bad $public}}
    }
    Test-Case 'Precreated excluded JSON writes truncate and preserve file identity' {
        $path=Join-Path $temporary 'inplace.json';[IO.File]::WriteAllText($path,'{"longOldValue":"zzzzzzzzzzzzzzzzzzzzzzzz"}')
        $created=(Get-Item -LiteralPath $path).CreationTimeUtc;Write-PrivateJson $path ([pscustomobject]@{ok=1});Assert-Equal (Read-PrivateJson $path).ok 1 'Read saved JSON';Assert-Equal (Get-Item -LiteralPath $path).CreationTimeUtc $created 'Identity creation timestamp preserved'
    }
    Test-Case 'Primary torn journal uses checkpoint; both corrupt journals fail closed' {
        $primary=Join-Path $temporary 'state.json';$checkpoint=Join-Path $temporary 'checkpoint.json'
        [IO.File]::WriteAllText($primary,'{}');[IO.File]::WriteAllText($checkpoint,'{}');$s=New-UpdateState;Write-UpdateState $primary $checkpoint $s
        [IO.File]::WriteAllText($primary,'{"phase":');Assert-Equal (Read-UpdateState $primary $checkpoint).installedVersion '1.2.0' 'Checkpoint recovered'
        [IO.File]::WriteAllText($checkpoint,'{}');Assert-Throws {Read-UpdateState $primary $checkpoint}
    }
    Test-Case 'Lexical path traversal rejected by ordinary-path guard' {Assert-Throws {Assert-OrdinaryUpdatePath (Join-Path $temporary '..\escape') $temporary -AllowMissing}}
    Test-Case 'Protected update stages next boot only, with no immediate restart or copy' {
        $f=New-CycleFixture;Invoke-FixtureCycle
        Assert-Equal $f.State.phase 'awaiting-normal-restart' 'Staged phase';Assert-True $f.Snapshot.CurrentEnabled 'Current classroom stays protected';Assert-True (-not $f.Snapshot.NextEnabled) 'Next boot disabled'
        Assert-Equal (Count-Event 'install') 0 'No live install';Assert-Equal (Count-Event 'restart') 0 'No forced class restart'
        Invoke-FixtureCycle;Assert-Equal (Count-Event 'install') 0 'Same boot keeps waiting'
        Assert-True ($f.Events.IndexOf('save:preparing-restart') -lt $f.Events.IndexOf('filter:False')) 'Busy intent durable before UWF change'
    }
    Test-Case 'Normal restart installs, verifies policy, restores protection with one restart' {
        $f=New-CycleFixture;Invoke-FixtureCycle;Move-FixtureBoot 'B';Invoke-FixtureCycle
        Assert-Equal $f.State.installedVersion '1.2.1' 'Healthy version committed';Assert-Equal $f.State.phase 'verifying-protection' 'Restoration phase';Assert-Equal (Count-Event 'restart') 1 'One restoration restart'
        Assert-True ($f.Events.IndexOf('backup') -lt $f.Events.IndexOf('install')) 'Backup precedes replacement';Assert-True ($f.Events.IndexOf('save:backing-up') -lt $f.Events.IndexOf('backup')) 'Busy intent before backup'
        Invoke-FixtureCycle;Assert-Equal (Count-Event 'restart') 1 'No same boot repeat';Move-FixtureBoot 'C';Invoke-FixtureCycle;Assert-Equal $f.State.phase 'complete' 'Protected boot verified'
    }
    Test-Case 'Originally unprotected machine waits normal restart then stays unprotected' {$f=New-CycleFixture $false;Invoke-FixtureCycle;Assert-Equal (Count-Event 'install') 0 'No immediate install';Move-FixtureBoot 'B';Invoke-FixtureCycle;Assert-Equal $f.State.phase 'complete' 'Completed';Assert-Equal (Count-Event 'restart') 0 'No forced reboot';Assert-Equal (Count-Event 'filter:True') 0 'No unsolicited protection'}
    Test-Case 'Mutating active action blocks preparation after durable phase handshake' {$f=New-CycleFixture;$f.Snapshot.Agent.activeAction='repair';Invoke-FixtureCycle;Assert-Equal $f.State.phase 'preparing-restart' 'Busy intent published';Assert-Equal (Count-Event 'filter:False') 0 'No race with existing operation';$f.Snapshot.Agent.activeAction=$null;Invoke-FixtureCycle;Assert-Equal $f.State.phase 'awaiting-normal-restart' 'Continues after action ends'}
    Test-Case 'Action starting between snapshot and saved phase blocks filter change' {$f=New-CycleFixture;$f.SnapshotHook={if($script:fixture.State.phase -eq 'preparing-restart'){$script:fixture.Snapshot.Agent.activeAction='uwf-enable'}};Invoke-FixtureCycle;Assert-Equal (Count-Event 'filter:False') 0 'Handshake defers raced action'}
    Test-Case 'Action starting on next boot before backing-up snapshot blocks replacement' {$f=New-CycleFixture;Invoke-FixtureCycle;Move-FixtureBoot 'B';$f.SnapshotHook={if($script:fixture.State.phase -eq 'backing-up'){$script:fixture.Snapshot.Agent.activeAction='cleanup'}};Invoke-FixtureCycle;Assert-Equal (Count-Event 'install') 0 'Handshake defers copy race'}
    Test-Case 'Initial deployment, UWF servicing, stopped agent and maintenance block defer' {
        foreach($condition in @('deployment','servicing','stopped','maintenance')){
            $f=New-CycleFixture
            switch($condition){'deployment'{$f.Snapshot.InitialDeploymentComplete=$false};'servicing'{$f.Snapshot.Servicing=$true};'stopped'{$f.Snapshot.AgentRunning=$false};'maintenance'{$f.Snapshot.Agent.maintenanceBlocked=$true}}
            Invoke-FixtureCycle;Assert-Equal (Count-Event 'filter:False') 0 ('No disable '+$condition);Assert-Equal (Count-Event 'install') 0 ('No install '+$condition)
        }
    }
    Test-Case 'Current off/next on initial protection intent is preserved' {$f=New-CycleFixture $false;$f.Snapshot.NextEnabled=$true;Invoke-FixtureCycle;Assert-Equal $f.State.phase 'idle' 'No OTA preparation';Assert-True $f.Snapshot.NextEnabled 'Next protection retained';Assert-Equal (Count-Event 'filter:False') 0 'No filter mutation'}
    Test-Case 'Bad signature/partial initial download makes no changes and no failed version' {$f=New-CycleFixture;$f.LoadFailure=$true;Invoke-FixtureCycle;Assert-Equal (Count-Event 'filter:False') 0 'No UWF change';Assert-True (-not $f.State.failedVersion) 'No unverified failed version'}
    Test-Case 'Downgrade, replay, and failed exact version are ignored' {foreach($v in @('1.1.9','1.2.0','1.2.1')){$f=New-CycleFixture;$f.Release.Version=$v;if($v -eq '1.2.1'){$f.State.failedVersion=$v};Invoke-FixtureCycle;Assert-Equal (Count-Event 'filter:False') 0 ('Ignored '+$v)}}
    Test-Case 'Unhealthy update rolls files/version back and restores protected boot once' {$f=New-CycleFixture;Invoke-FixtureCycle;Move-FixtureBoot 'B';$f.HealthFailures=1;Invoke-FixtureCycle;Assert-Equal (Count-Event 'rollback') 1 'Rollback called';Assert-Equal $f.State.installedVersion '1.2.0' 'Prior version retained';Assert-Equal $f.State.failedVersion '1.2.1' 'Failure remembered';Assert-Equal (Count-Event 'restart') 1 'Protection restored once';Move-FixtureBoot 'C';Invoke-FixtureCycle;Assert-Equal $f.State.phase 'failed' 'Failed version terminal';Invoke-FixtureCycle;Assert-Equal (Count-Event 'install') 1 'No retry loop'}
    Test-Case 'ClearPending failure rolls back version but cannot skip UWF restoration' {$f=New-CycleFixture;Invoke-FixtureCycle;Move-FixtureBoot 'B';$f.ClearFailures=2;Invoke-FixtureCycle;Assert-Equal $f.State.installedVersion '1.2.0' 'Previous version on cleanup failure';Assert-Equal (Count-Event 'restart') 1 'Protection still restored'}
    Test-Case 'RestoreProtection failure rolls back version then restores protection' {$f=New-CycleFixture;Invoke-FixtureCycle;Move-FixtureBoot 'B';$f.RestoreFailures=1;Invoke-FixtureCycle;Assert-Equal $f.State.installedVersion '1.2.0' 'Previous version on restore failure';Assert-Equal (Count-Event 'rollback') 1 'Files rolled back';Assert-Equal (Count-Event 'restart') 1 'Recovery restores protection'}
    Test-Case 'Interrupted file replacement rolls back complete backup set' {$f=New-CycleFixture;Invoke-FixtureCycle;Move-FixtureBoot 'B';$f.State.phase='installing';$f.State.rollback=@([pscustomobject]@{path='Actions/Invoke-LabAction.ps1'});$f.Snapshot.AgentRunning=$false;$f.Snapshot.Agent.activeAction='restore-mode';Invoke-FixtureCycle;Assert-Equal (Count-Event 'rollback') 1 'Interrupted set rolled back';Assert-Equal (Count-Event 'restart') 1 'Protection restart';Assert-Equal $f.State.installedVersion '1.2.0' 'Prior version restored'}
    Test-Case 'Interrupted unhealthy running agent can be rolled back despite maintenance block' {$f=New-CycleFixture;Invoke-FixtureCycle;Move-FixtureBoot 'B';$f.State.phase='installing';$f.State.rollback=@([pscustomobject]@{path='Actions/Invoke-LabAction.ps1'});$f.Snapshot.Agent.maintenanceBlocked=$true;Invoke-FixtureCycle;Assert-Equal (Count-Event 'rollback') 1 'Broken new service rollback is not blocked'}
    Test-Case 'Interrupted healthy protection checkpoint completes without recopy/rollback' {$f=New-CycleFixture;Invoke-FixtureCycle;Move-FixtureBoot 'B';$f.State.phase='restoring-protection';$f.State.installedVersion='1.2.1';Invoke-FixtureCycle;Assert-Equal (Count-Event 'rollback') 0 'Healthy checkpoint retained';Assert-Equal (Count-Event 'install') 0 'No duplicate copy';Assert-Equal (Count-Event 'restart') 1 'Single protection restart'}
    Test-Case 'Power loss after filter enable and before checkpoint completes on protected boot' {$f=New-CycleFixture;Invoke-FixtureCycle;Move-FixtureBoot 'B';$f.State.phase='restoring-protection';$f.State.installedVersion='1.2.1';$f.Snapshot.NextEnabled=$true;Move-FixtureBoot 'C';Invoke-FixtureCycle;Assert-Equal $f.State.phase 'complete' 'Already protected completed';Assert-Equal (Count-Event 'restart') 0 'No unnecessary restart'}
    Test-Case 'Corrupted previously verified pending cache restores protection at new boot' {$f=New-CycleFixture;Invoke-FixtureCycle;Move-FixtureBoot 'B';$f.LoadFailure=$true;Invoke-FixtureCycle;Assert-Equal (Count-Event 'install') 0 'No unverified install';Assert-Equal (Count-Event 'restart') 1 'Restoration restart';Assert-Equal $f.State.failedVersion '1.2.1' 'Only previously verified version failed'}
    Test-Case 'Missing verified pending cache cancels next disable while still protected' {$f=New-CycleFixture;Invoke-FixtureCycle;$f.Release=$null;Invoke-FixtureCycle;Assert-Equal $f.State.phase 'failed' 'Prepared release cancelled';Assert-True $f.Snapshot.NextEnabled 'Protection restored';Assert-Equal (Count-Event 'restart') 0 'Still protected no restart'}
    Test-Case 'Failed rollback preserves review flag, backups and blocks later upgrades' {$f=New-CycleFixture;Invoke-FixtureCycle;Move-FixtureBoot 'B';$f.HealthFailures=1;$f.RollbackFailure=$true;Invoke-FixtureCycle;Assert-True $f.State.requiresStaffReview 'Staff repair required';Assert-True ($f.State.rollback.Count -gt 0) 'Backup records retained';Move-FixtureBoot 'C';Invoke-FixtureCycle;$f.Release.Version='1.2.2';Invoke-FixtureCycle;Assert-Equal (Count-Event 'install') 1 'No upgrade of broken rollback'}
    Test-Case 'One restoration restart cap prevents reboot loop after failed protection' {$f=New-CycleFixture;Invoke-FixtureCycle;Move-FixtureBoot 'B';Invoke-FixtureCycle;$f.Snapshot.NextEnabled=$false;Move-FixtureBoot 'C';Invoke-FixtureCycle;Assert-Equal $f.State.phase 'failed' 'Protection failure recorded';Assert-True $f.State.requiresStaffReview 'Staff review';Invoke-FixtureCycle;Assert-Equal (Count-Event 'restart') 1 'Never loops'}
    Test-Case 'Binary-containing release requests exact agent version; command-only does not' {$f=New-CycleFixture $false;$f.Release.Files=@([pscustomobject]@{Path='UEPLV.Management.exe'});Invoke-FixtureCycle;Move-FixtureBoot 'B';Invoke-FixtureCycle;Assert-Equal (Count-Event 'health:1.2.1') 1 'Binary health version';$f=New-CycleFixture $false;Invoke-FixtureCycle;Move-FixtureBoot 'B';Invoke-FixtureCycle;Assert-Equal (Count-Event 'health:') 1 'Command-only accepts current exe version'}
    Test-Case 'Idle updater clears obsolete initial-deployment wait once setup completes' {$f=New-CycleFixture;$f.Release=$null;$f.Snapshot.InitialDeploymentComplete=$false;Invoke-FixtureCycle;Assert-True ([bool]$f.State.lastError) 'Wait message recorded';$f.Snapshot.InitialDeploymentComplete=$true;Invoke-FixtureCycle;Assert-Equal $f.State.lastError $null 'Healthy idle status clears stale wait';Assert-Equal (Count-Event 'install') 0 'No installation without a package';Assert-Equal (Count-Event 'restart') 0 'No restart while idle';Assert-True $f.Snapshot.NextEnabled 'Protection retained'}
    Test-Case 'UTF8 BOM scripts and JSON verify while their signed raw bytes stay intact' {
        $script=New-TestEntry 'Actions/Invoke-LabAction.ps1' ("[CmdletBinding()]`r`nparam()`r`nWrite-Output 'ok'")
        $script.Bytes=[byte[]]([Text.Encoding]::UTF8.GetPreamble()+$script.Bytes)
        $json=New-TestEntry 'Commands/release-info.json' '{"schemaVersion":1}'
        $json.Bytes=[byte[]]([Text.Encoding]::UTF8.GetPreamble()+$json.Bytes)
        $envelope=New-SignedTestEnvelope @($script,$json)
        $release=Get-ValidatedRelease $envelope $public
        Assert-Equal $release.Files.Count 2 'BOM files accepted'
        Assert-Equal (Get-BytesHash $release.Files[0].Bytes) (Get-BytesHash $script.Bytes) 'Signed script bytes unchanged'
    }
    Test-Case 'Real Windows file replacement and rollback preserve exact bytes' {
        $target=Join-Path $temporary 'atomic-target.bin';$next=Join-Path $temporary 'atomic-next.bin'
        $original=[byte[]](1,2,3,4);$updated=[byte[]](5,6,7)
        [IO.File]::WriteAllBytes($next,$original);Move-VerifiedUpdateFile $next $target
        Assert-Equal (Get-PathHash $target) (Get-BytesHash $original) 'New target created'
        [IO.File]::SetAttributes($target,[IO.FileAttributes]::ReadOnly);[IO.File]::WriteAllBytes($next,$updated);[IO.File]::SetAttributes($next,[IO.FileAttributes]::ReadOnly);Move-VerifiedUpdateFile $next $target
        Assert-Equal (Get-PathHash $target) (Get-BytesHash $updated) 'Existing target replaced'
        [IO.File]::WriteAllBytes($next,$original);Move-VerifiedUpdateFile $next $target
        Assert-Equal (Get-PathHash $target) (Get-BytesHash $original) 'Original bytes restored'
    }
    Test-Case 'Maintenance and session changes defer updates without scheduling protection changes' {
        foreach($phase in @('maintenance','disabling','maintenance-login','student-login','error')){
            $f=New-CycleFixture $true
            $f.Snapshot.Agent|Add-Member -NotePropertyName session -NotePropertyValue ([pscustomobject]@{phase=$phase})
            Invoke-FixtureCycle
            Assert-Equal $f.State.phase 'idle' ('Updater must stay idle during '+$phase)
            Assert-Equal (Count-Event 'filter:False') 0 'Maintenance must not change scheduled UWF state'
            Assert-Equal (Count-Event 'restart') 0 'Maintenance must not trigger update restarts'
            $f.Snapshot.Agent.session.phase='student'
            Invoke-FixtureCycle
            Assert-Equal $f.State.phase 'awaiting-normal-restart' 'Student return must release the pending update without a deadlock'
        }
    }
    Test-Case 'Timed thaw blocks updater until protection is restored' {
        foreach($phase in @('waiting-thaw','active','waiting-freeze','error')){
            $f=New-CycleFixture $true
            $f.Snapshot.Agent|Add-Member -NotePropertyName freezeLease -NotePropertyValue ([pscustomobject]@{phase=$phase})
            Invoke-FixtureCycle
            Assert-Equal $f.State.phase 'idle' 'Timed thaw must keep the updater idle'
            Assert-Equal (Count-Event 'filter:False') 0 'Updater must preserve the thaw protection schedule'
            Assert-Equal (Count-Event 'restart') 0 'Updater must not spend thaw boots'
            $f.Snapshot.Agent.freezeLease.phase='complete'
            Invoke-FixtureCycle
            Assert-Equal $f.State.phase 'awaiting-normal-restart' 'Restored protection releases updates'
        }
    }
    Test-Case 'Manual policy never thaws a protected PC or blocks its thaw action' {
        $f=New-CycleFixture;$f.Runtime.ManualThawOnly=$true;Invoke-FixtureCycle
        Assert-Equal $f.State.phase 'idle' 'No active install lock while waiting for teacher'
        Assert-Equal (Count-Event 'filter:False') 0 'No automatic thaw'
        Assert-Equal (Count-Event 'install') 0 'No writes in overlay'
    }
    Test-Case 'Manual thaw installs on current thawed boot without another restart' {
        $f=New-CycleFixture $false;$f.Runtime.ManualThawOnly=$true;Invoke-FixtureCycle
        Assert-Equal $f.State.phase 'complete' 'Installed in already thawed session'
        Assert-Equal (Count-Event 'install') 1 'Installed once'
        Assert-Equal (Count-Event 'restart') 0 'No forced restart'
    }
    Test-Case 'Manual maintenance and finite thaw preserve next-boot freeze intent' {
        $f=New-CycleFixture $false;$f.Runtime.ManualThawOnly=$true;$f.Snapshot.NextEnabled=$true
        $f.Snapshot.Agent|Add-Member session ([pscustomobject]@{phase='maintenance'})
        $f.Snapshot.Agent|Add-Member freezeLease ([pscustomobject]@{phase='active'})
        Invoke-FixtureCycle
        Assert-Equal $f.State.phase 'complete' 'Stable maintenance is a valid update window'
        Assert-True $f.Snapshot.NextEnabled 'Teacher freeze choice preserved'
        Assert-Equal (Count-Event 'restart') 0 'No boot consumed'
    }
    Test-Case 'Manual policy waits for session transitions and active mutations' {
        foreach($phase in @('disabling','student-login','maintenance-login','error')){
            $f=New-CycleFixture $false;$f.Runtime.ManualThawOnly=$true
            $f.Snapshot.Agent|Add-Member session ([pscustomobject]@{phase=$phase})
            Invoke-FixtureCycle
            Assert-Equal (Count-Event 'install') 0 'Transition never interrupted'
        }
    }
    Test-Case 'Manual failed health rolls back without forced reboot or thaw' {
        $f=New-CycleFixture $false;$f.Runtime.ManualThawOnly=$true;$f.HealthFailures=1;Invoke-FixtureCycle
        Assert-Equal (Count-Event 'rollback') 1 'Previous service restored'
        Assert-Equal $f.State.installedVersion '1.2.0' 'Failed release not called installed'
        Assert-Equal (Count-Event 'restart') 0 'No reboot'
        Assert-Equal (Count-Event 'filter:False') 0 'No thaw'
    }
    Test-Case 'Failed disk/network/restart preflight preserves service and releases action interlock' {
        $f=New-CycleFixture $false;$f.Runtime.ManualThawOnly=$true;$f.Runtime.Preflight={throw 'No space or stale authenticated report'}
        Invoke-FixtureCycle
        Assert-Equal $f.State.phase 'idle' 'Teacher actions stay available'
        Assert-Equal (Count-Event 'stop') 0 'Existing service remains running'
        Assert-Equal (Count-Event 'install') 0 'No partial install'
    }
    Write-Output ('ALL '+$script:passed+' AUTOMATIC UPDATE TESTS PASSED (no host settings changed).')
}finally{
    $script:testRsa.Dispose()
    $resolved=[IO.Path]::GetFullPath($temporary);$expected=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\UEPLV-update-tests-'
    if($resolved.StartsWith($expected,[StringComparison]::OrdinalIgnoreCase)){Remove-Item -LiteralPath $resolved -Recurse -Force}
}
