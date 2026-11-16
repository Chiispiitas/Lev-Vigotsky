[CmdletBinding()]
param(
    [switch]$LibraryOnly,
    [string]$StateRoot = (Join-Path $env:ProgramData 'UEPLV\Update'),
    [string]$ProgramRoot = (Join-Path $env:ProgramFiles 'UEPLV\Management')
)
# Definitions are safe to load with -LibraryOnly; production mutations start at the bottom.
Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-ReleaseVersion([string]$Value) {
    if($Value -notmatch '^(0|[1-9][0-9]{0,4})\.(0|[1-9][0-9]{0,4})\.(0|[1-9][0-9]{0,4})$') { throw 'Invalid release version.' }
    $parts=$Value.Split('.')
    if(@($parts|Where-Object {[int]$_ -gt 65535}).Count) { throw 'Release version component is too large.' }
    return [version]($Value+'.0')
}
function Test-AssignedUpdateComputer([string]$Name) {
    return [bool]($Name -cmatch '^(?:UEPLV-|LEV-VIGOTSKY-)(0[1-9]|[12][0-9]|3[0-4])$')
}
function Get-BytesHash([byte[]]$Bytes) {
    $hash=[Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($hash.ComputeHash($Bytes))).Replace('-','').ToLowerInvariant() }
    finally { $hash.Dispose() }
}
function Get-PathHash([string]$Path) {
    $stream=[IO.File]::Open($Path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
    $hash=[Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($hash.ComputeHash($stream))).Replace('-','').ToLowerInvariant() }
    finally { $hash.Dispose();$stream.Dispose() }
}
function Move-VerifiedUpdateFile([string]$Temporary,[string]$Target) {
    # Windows PowerShell converts $null to an empty string for this .NET overload.
    # NullString preserves the null backup path required by File.Replace.
    # Installer-media copies and rollback copies can carry the ISO read-only bit.
    # ACLs, rather than this DOS attribute, protect these administrator-owned files.
    foreach($path in @($Temporary,$Target)) {
        if([IO.File]::Exists($path)) {
            $attributes=[IO.File]::GetAttributes($path)
            if($attributes -band [IO.FileAttributes]::ReadOnly) {
                [IO.File]::SetAttributes($path,($attributes -band (-bnot [IO.FileAttributes]::ReadOnly)))
            }
        }
    }
    try {
        if([IO.File]::Exists($Target)) {
            [IO.File]::Replace($Temporary,$Target,[System.Management.Automation.Language.NullString]::Value)
        } else { [IO.File]::Move($Temporary,$Target) }
    } catch { throw ('Could not replace update file '+$Target+': '+$_.Exception.Message) }
}
function Test-ReleasePath([string]$Path) {
    return [bool]($Path -cmatch '^(UEPLV\.Management\.exe|Actions/Invoke-LabAction\.ps1|Update/Invoke-AutomaticUpdate\.ps1|Commands/[A-Za-z0-9_-]+\.json)$')
}
function Read-PrivateJson([string]$Path,[int]$MaximumBytes=524288) {
    for($attempt=0;$attempt -lt 3;$attempt++) {
        try {
            $stream=[IO.File]::Open($Path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
            try {
                if($stream.Length -gt $MaximumBytes) { throw 'Private update file exceeds its size limit.' }
                $reader=[IO.StreamReader]::new($stream,[Text.Encoding]::UTF8,$true)
                try { $text=$reader.ReadToEnd() } finally { $reader.Dispose() }
            } finally { $stream.Dispose() }
            if([string]::IsNullOrWhiteSpace($text)) { return $null }
            return ($text|ConvertFrom-Json)
        } catch {
            if($attempt -eq 2) { throw }
            Start-Sleep -Milliseconds 250
        }
    }
}
function Write-PrivateJson([string]$Path,$Value) {
    # Exact-file UWF exclusions require updating the existing file, never temp-and-replace.
    $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($Value|ConvertTo-Json -Depth 25))
    $stream=[IO.File]::Open($Path,[IO.FileMode]::Open,[IO.FileAccess]::Write,[IO.FileShare]::Read)
    try { $stream.Position=0;$stream.Write($bytes,0,$bytes.Length);$stream.SetLength($bytes.Length);$stream.Flush($true) }
    finally { $stream.Dispose() }
}
function Test-UpdateStateRecord($Value) {
    if(-not $Value){return $false}
    foreach($name in @('schemaVersion','installedVersion','previousInstalledVersion','expectedAgentVersion','requiresStaffReview','phase','pendingVersion','failedVersion','lastError','lastCheckedUtc','completedUtc','wasProtected','preparedBootId','restoreBootId','rebootsRemaining','packageSha256','rollback','serviceStartIdBefore')) {
        if(-not $Value.PSObject.Properties[$name]){return $false}
    }
    if($Value.schemaVersion -ne 1 -or $Value.phase -notin @('idle','preparing-restart','awaiting-normal-restart','backing-up','installing','restoring-protection','verifying-protection','rolling-back','complete','failed')){return $false}
    try {Get-ReleaseVersion ([string]$Value.installedVersion)|Out-Null;if($Value.previousInstalledVersion){Get-ReleaseVersion ([string]$Value.previousInstalledVersion)|Out-Null}}catch{return $false}
    return $true
}
function Read-UpdateState([string]$Primary,[string]$Checkpoint) {
    foreach($path in @($Primary,$Checkpoint)) {
        try {$value=Read-PrivateJson $path;if(Test-UpdateStateRecord $value){return $value}}catch{}
    }
    throw 'Both updater journals are invalid; staff repair is required. State was not reset.'
}
function Write-UpdateState([string]$Primary,[string]$Checkpoint,$Value) {
    # Ordered duplicate journals survive interruption of either in-place excluded-file write.
    Write-PrivateJson $Primary $Value
    Write-PrivateJson $Checkpoint $Value
}
function Assert-PrivateUpdateFile([string]$Path) {
    if(-not(Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'Private update state file is missing.' }
    $item=Get-Item -LiteralPath $Path -Force
    if($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Private update state cannot be a link.' }
    foreach($rule in (Get-Acl -LiteralPath $Path).Access) {
        if($rule.AccessControlType -ne 'Allow') { continue }
        $sid=$rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
        if($sid -notin @('S-1-5-18','S-1-5-32-544')) { throw 'Update credentials/state must be private to SYSTEM and administrators.' }
    }
}
function Assert-OrdinaryUpdatePath([string]$Path,[string]$Root,[switch]$AllowMissing) {
    $full=[IO.Path]::GetFullPath($Path)
    $base=[IO.Path]::GetFullPath($Root).TrimEnd('\')
    if(-not($full.Equals($base,[StringComparison]::OrdinalIgnoreCase) -or $full.StartsWith($base+'\',[StringComparison]::OrdinalIgnoreCase))) { throw 'Update path escaped its approved root.' }
    $current=[IO.Path]::GetPathRoot($full)
    foreach($segment in $full.Substring($current.Length).Split('\')) {
        if(-not $segment) { continue }
        $current=Join-Path $current $segment
        if(-not(Test-Path -LiteralPath $current)) {
            if($AllowMissing) { continue }
            throw 'An expected update path is missing.'
        }
        if((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Update paths cannot traverse links or junctions.' }
    }
    return $full
}
function Get-ValidatedRelease($Envelope,[string]$PublicKeyXml) {
    if(-not $Envelope -or -not $Envelope.PSObject.Properties['manifestJson'] -or -not $Envelope.PSObject.Properties['signature'] -or -not $Envelope.PSObject.Properties['packageBase64']) { throw 'Update envelope is incomplete.' }
    if($Envelope.manifestJson -isnot [string] -or $Envelope.manifestJson.Length -gt 32768 -or $Envelope.signature -isnot [string] -or $Envelope.signature.Length -gt 1024 -or $Envelope.packageBase64 -isnot [string] -or $Envelope.packageBase64.Length -gt 349528) { throw 'Update envelope exceeds its limits.' }
    $rsa=[Security.Cryptography.RSACryptoServiceProvider]::new()
    $rsa.PersistKeyInCsp=$false
    try {
        $rsa.FromXmlString($PublicKeyXml)
        if(-not $rsa.PublicOnly -or $rsa.KeySize -lt 3072) { throw 'The pinned update key is not a sufficiently strong public key.' }
        $signature=[Convert]::FromBase64String($Envelope.signature)
        if($signature.Length -ne ($rsa.KeySize/8) -or -not $rsa.VerifyData([Text.Encoding]::UTF8.GetBytes($Envelope.manifestJson),[Security.Cryptography.CryptoConfig]::MapNameToOID('SHA256'),$signature)) { throw 'Update signature verification failed.' }
    } finally { $rsa.Dispose() }
    $manifest=$Envelope.manifestJson|ConvertFrom-Json
    if($manifest.schemaVersion -ne 1) { throw 'Unsupported signed release schema.' }
    $version=Get-ReleaseVersion ([string]$manifest.version)
    $issued=[datetime]::MinValue
    if(-not [datetime]::TryParse([string]$manifest.issuedUtc,[ref]$issued) -or $issued.ToUniversalTime() -gt [datetime]::UtcNow.AddMinutes(10)) { throw 'Signed release timestamp is invalid.' }
    if([string]$manifest.packageSha256 -notmatch '^[A-Fa-f0-9]{64}$') { throw 'Signed package hash is invalid.' }
    $bytes=[Convert]::FromBase64String($Envelope.packageBase64)
    if($bytes.Length -eq 0 -or $bytes.Length -gt 262144 -or (Get-BytesHash $bytes) -cne ([string]$manifest.packageSha256).ToLowerInvariant()) { throw 'Downloaded package hash verification failed.' }
    $files=@($manifest.files)
    if($files.Count -lt 1 -or $files.Count -gt 16) { throw 'Signed release file count is invalid.' }
    $declared=@{};$total=0L
    foreach($file in $files) {
        if(-not(Test-ReleasePath ([string]$file.path)) -or [string]$file.sha256 -notmatch '^[A-Fa-f0-9]{64}$') { throw 'Signed release contains an unapproved path or hash.' }
        if($declared.ContainsKey(([string]$file.path).ToLowerInvariant())) { throw 'Signed release repeats a file path.' }
        if($file.size -isnot [ValueType] -or [long]$file.size -lt 1 -or [long]$file.size -gt 8388608 -or [long]$file.size -ne $file.size) { throw 'Signed file size is invalid.' }
        $total += [long]$file.size
        if($total -gt 8388608) { throw 'Uncompressed release exceeds 8 MiB.' }
        $declared[([string]$file.path).ToLowerInvariant()]=$file
    }
    $stream=[IO.MemoryStream]::new($bytes,$false)
    $zip=[IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Read,$false)
    $payload=[Collections.Generic.List[object]]::new()
    try {
        if($zip.Entries.Count -ne $files.Count) { throw 'ZIP entries do not match the signed manifest.' }
        $seen=@{}
        foreach($entry in $zip.Entries) {
            $path=$entry.FullName
            if(-not(Test-ReleasePath $path) -or $seen.ContainsKey($path.ToLowerInvariant()) -or -not $declared.ContainsKey($path.ToLowerInvariant())) { throw 'ZIP contains a duplicate, extra, or unsafe path.' }
            $unixType=(([long]$entry.ExternalAttributes -shr 16) -band 0xF000)
            if($unixType -eq 0xA000 -or ($entry.ExternalAttributes -band 0x400) -ne 0 -or $path.EndsWith('/')) { throw 'ZIP links and directories are not allowed.' }
            $expected=$declared[$path.ToLowerInvariant()]
            if($path -cne [string]$expected.path -or $entry.Length -ne [long]$expected.size) { throw 'ZIP file path/length differs from its signed manifest.' }
            $input=$entry.Open();$output=[IO.MemoryStream]::new()
            try {
                $buffer=[byte[]]::new(65536);$actual=0L
                while(($count=$input.Read($buffer,0,$buffer.Length)) -gt 0) {
                    $actual+=$count
                    if($actual -gt [long]$expected.size) { throw 'ZIP stream exceeds its signed file size.' }
                    $output.Write($buffer,0,$count)
                }
                $content=$output.ToArray()
            } finally { $input.Dispose();$output.Dispose() }
            if($content.Length -ne [long]$expected.size -or (Get-BytesHash $content) -cne ([string]$expected.sha256).ToLowerInvariant()) { throw 'An update file failed its signed hash check.' }
            if($path.EndsWith('.ps1',[StringComparison]::Ordinal)) {
                $tokens=$null;$errors=$null
                [Management.Automation.Language.Parser]::ParseInput([Text.Encoding]::UTF8.GetString($content).TrimStart([char]0xFEFF),[ref]$tokens,[ref]$errors)|Out-Null
                if($errors.Count) { throw 'An update PowerShell script has syntax errors.' }
            }
            if($path.EndsWith('.json',[StringComparison]::Ordinal)) { [Text.Encoding]::UTF8.GetString($content).TrimStart([char]0xFEFF)|ConvertFrom-Json|Out-Null }
            $payload.Add([pscustomobject]@{Path=$path;Hash=([string]$expected.sha256).ToLowerInvariant();Bytes=$content})
            $seen[$path.ToLowerInvariant()]=$true
        }
    } finally { $zip.Dispose();$stream.Dispose() }
    return [pscustomobject]@{Version=[string]$manifest.version;ComparableVersion=$version;PackageHash=([string]$manifest.packageSha256).ToLowerInvariant();ManifestJson=$Envelope.manifestJson;Files=$payload.ToArray()}
}
function New-UpdateState([string]$InitialVersion='1.2.0') {
    Get-ReleaseVersion $InitialVersion|Out-Null
    return [pscustomobject][ordered]@{schemaVersion=1;installedVersion=$InitialVersion;previousInstalledVersion=$null;expectedAgentVersion=$null;requiresStaffReview=$false;phase='idle';pendingVersion=$null;failedVersion=$null;lastError=$null;lastCheckedUtc=$null;completedUtc=$null;wasProtected=$false;preparedBootId=$null;restoreBootId=$null;rebootsRemaining=1;packageSha256=$null;rollback=@();serviceStartIdBefore=$null}
}
function Test-UpdateAgentIdle($Agent,[switch]$AllowMaintenanceBlocked) {
    if(-not $Agent) { return $false }
    if($Agent.PSObject.Properties['freezeLease'] -and $Agent.freezeLease -and $Agent.freezeLease.phase -ne 'complete'){return $false}
    if($Agent.PSObject.Properties['session'] -and $Agent.session -and $Agent.session.phase -ne 'student'){return $false}
    if(-not $AllowMaintenanceBlocked -and $Agent.PSObject.Properties['maintenanceBlocked'] -and $Agent.maintenanceBlocked) { return $false }
    return [bool](-not $Agent.PSObject.Properties['activeAction'] -or -not $Agent.activeAction -or $Agent.activeAction -in @('status','uwf-status'))
}
function Restore-UpdateProtection($State,$Runtime) {
    if($State.wasProtected) {
        & $Runtime.SetFilter $true
        $check=& $Runtime.Snapshot
        if(-not $check.NextEnabled -or -not $check.NextCProtected){throw 'Next-session protection could not be restored.'}
        if($check.CurrentEnabled -and $check.CurrentCProtected){
            $State.phase=if($State.failedVersion -eq $State.pendingVersion){'failed'}else{'complete'}
            $State.pendingVersion=$null;$State.completedUtc=[datetime]::UtcNow.ToString('o');return
        }
        if([int]$State.rebootsRemaining -lt 1){throw 'The single protection-restoration restart was already used.'}
        $State.phase='verifying-protection';$State.restoreBootId=$check.BootId;$State.rebootsRemaining=[int]$State.rebootsRemaining-1
        & $Runtime.SaveState $State
        & $Runtime.Restart
    } else {
        $State.phase=if($State.failedVersion -eq $State.pendingVersion){'failed'}else{'complete'}
        $State.pendingVersion=$null;$State.completedUtc=[datetime]::UtcNow.ToString('o')
    }
}
function Invoke-UpdateCycle($State,$Runtime) {
    # Runtime is an injected set of fixed operations; tests use only in-memory fake operations.
    $save={ $State.lastCheckedUtc=[datetime]::UtcNow.ToString('o'); & $Runtime.SaveState $State }
    $snapshot=& $Runtime.Snapshot
    if($State.phase -eq 'verifying-protection') {
        if($snapshot.BootId -eq $State.restoreBootId) { & $save;return }
        if($snapshot.CurrentEnabled -and $snapshot.NextEnabled -and $snapshot.CurrentCProtected -and $snapshot.NextCProtected -and -not $snapshot.Servicing) {
            $State.phase=if($State.failedVersion -eq $State.pendingVersion){'failed'}else{'complete'}
            $State.pendingVersion=$null;$State.completedUtc=[datetime]::UtcNow.ToString('o');& $save;return
        }
        $State.phase='failed';$State.pendingVersion=$null;$State.requiresStaffReview=$true;$State.lastError='Protection did not verify after its single restoration restart. No further automatic restart will occur.';& $save;return
    }
    if($State.phase -eq 'restoring-protection') {
        # This checkpoint is durable only after a fresh service passed health/policy checks.
        # A power interruption now finishes protection for the already healthy release.
        try { & $Runtime.ClearPending } catch { $State.lastError='Update cache cleanup needs staff review: '+$_.Exception.Message }
        try { & $Runtime.RestoreProtection $State $snapshot }
        catch { $State.phase='failed';$State.pendingVersion=$null;$State.requiresStaffReview=$true;$State.lastError='Protection restoration needs staff review: '+$_.Exception.Message }
        & $save;return
    }
    if($State.phase -in @('installing','rolling-back')) {
        if($snapshot.Servicing -or ($snapshot.AgentRunning -and -not(Test-UpdateAgentIdle $snapshot.Agent -AllowMaintenanceBlocked))) { $State.lastError='Interrupted update waits for servicing or the previous management action.';& $save;return }
        if($snapshot.CurrentEnabled) {
            & $Runtime.SetFilter $false
            $State.lastError='Interrupted update waits for the next normal restart before rollback.';& $save;return
        }
        if($snapshot.NextEnabled) { $State.lastError='Interrupted update waits for consistent disabled UWF protection before rollback.';& $save;return }
        $State.phase='rolling-back';$State.failedVersion=$State.pendingVersion;$State.lastError='Interrupted update detected; restoring the previous installed files.';& $save
        if($State.previousInstalledVersion) { $State.installedVersion=$State.previousInstalledVersion }
        try { & $Runtime.StopAgent; & $Runtime.Rollback $State.rollback; & $Runtime.StartAgent; & $Runtime.WaitHealthy $State.serviceStartIdBefore $null }
        catch { $State.requiresStaffReview=$true;$State.lastError='Rollback needs staff review: '+$_.Exception.Message }
        try { & $Runtime.ClearPending } catch { $State.lastError+=' Cache cleanup needs staff review: '+$_.Exception.Message }
        try { & $Runtime.RestoreProtection $State $snapshot }
        catch { $State.phase='failed';$State.pendingVersion=$null;$State.requiresStaffReview=$true;$State.lastError+=' Protection needs staff review: '+$_.Exception.Message }
        & $save;return
    }
    if($State.requiresStaffReview){return}
    if($snapshot.Servicing -or -not $snapshot.InitialDeploymentComplete) { $State.lastError='Update waits for Windows/UWF servicing or initial deployment to finish.';& $save;return }
    $release=$null
    try { $release=& $Runtime.LoadRelease }
    catch {
        $State.lastError='Downloaded update is not yet readable or did not verify: '+$_.Exception.Message
        if($State.phase -in @('preparing-restart','awaiting-normal-restart','backing-up')) {
            # A pending version here was verified before preparing UWF. Never mark a first
            # partial download as failed; only cancel a previously verified preparation.
            $State.failedVersion=$State.pendingVersion
            try { & $Runtime.ClearPending } catch { $State.lastError+=' Cache cleanup needs staff review: '+$_.Exception.Message }
            try { & $Runtime.RestoreProtection $State $snapshot }
            catch { $State.phase='failed';$State.pendingVersion=$null;$State.requiresStaffReview=$true;$State.lastError+=' Protection needs staff review: '+$_.Exception.Message }
        }
        & $save;return
    }
    if(-not $release) {
        if($State.phase -eq 'idle' -and $State.lastError -eq 'Update waits for Windows/UWF servicing or initial deployment to finish.'){$State.lastError=$null;& $save}
        if($State.phase -in @('preparing-restart','awaiting-normal-restart','backing-up')) {
            $State.failedVersion=$State.pendingVersion;$State.lastError='The previously verified pending package is missing; protection is being restored.'
            try { & $Runtime.RestoreProtection $State $snapshot }
            catch { $State.phase='failed';$State.pendingVersion=$null;$State.requiresStaffReview=$true;$State.lastError+=' '+$_.Exception.Message }
            & $save
        }
        return
    }
    if((Get-ReleaseVersion $release.Version) -le (Get-ReleaseVersion $State.installedVersion) -or $release.Version -eq $State.failedVersion) { return }
    if($State.pendingVersion -and ($State.pendingVersion -cne $release.Version -or $State.packageSha256 -cne $release.PackageHash)) {
        $State.lastError='A different release replaced a verified pending package; restoring protection before considering it.';$State.failedVersion=$State.pendingVersion
        try { & $Runtime.RestoreProtection $State $snapshot }
        catch { $State.phase='failed';$State.pendingVersion=$null;$State.requiresStaffReview=$true;$State.lastError+=' '+$_.Exception.Message }
        & $save;return
    }
    if($State.phase -notin @('preparing-restart','awaiting-normal-restart','backing-up')) {
        if($snapshot.Agent -and $snapshot.Agent.PSObject.Properties['freezeLease'] -and $snapshot.Agent.freezeLease -and $snapshot.Agent.freezeLease.phase -ne 'complete'){ $State.lastError='Update waits for thaw protection restoration.';& $save;return }
        if($snapshot.Agent -and $snapshot.Agent.PSObject.Properties['session'] -and $snapshot.Agent.session -and $snapshot.Agent.session.phase -ne 'student'){ $State.lastError='Update waits for student mode.';& $save;return }
        if($snapshot.CurrentEnabled -ne $snapshot.NextEnabled -or ($snapshot.CurrentEnabled -and (-not $snapshot.CurrentCProtected -or -not $snapshot.NextCProtected))) { $State.lastError='Update waits for consistent current and next UWF protection.';& $save;return }
        $State.pendingVersion=$release.Version;$State.packageSha256=$release.PackageHash;$State.wasProtected=[bool]$snapshot.CurrentEnabled;$State.preparedBootId=$snapshot.BootId;$State.rebootsRemaining=1;$State.rollback=@();$State.lastError=$null;$State.previousInstalledVersion=$State.installedVersion
        $State.expectedAgentVersion=if(@($release.Files|Where-Object {$_.Path -ceq 'UEPLV.Management.exe'}).Count){$release.Version}else{$null}
        $State.phase='preparing-restart';& $save
    }
    if($State.phase -eq 'preparing-restart') {
        # Phase-first/activeAction-second pairs with the agent's inverse handshake.
        $snapshot=& $Runtime.Snapshot
        if(-not $snapshot.AgentRunning -or -not(Test-UpdateAgentIdle $snapshot.Agent)) { $State.lastError='Update waits for a running idle management service.';& $save;return }
        if($snapshot.Servicing -or -not $snapshot.InitialDeploymentComplete){$State.lastError='Update waits for initial deployment or servicing.';& $save;return}
        if($State.wasProtected) {
            if($snapshot.CurrentEnabled) { & $Runtime.SetFilter $false;$snapshot=& $Runtime.Snapshot;if($snapshot.NextEnabled){throw 'UWF disable was not confirmed for the next boot.'} }
            elseif($snapshot.BootId -eq $State.preparedBootId) { throw 'Unexpected unprotected state during preparation.' }
        }
        elseif($snapshot.CurrentEnabled -or $snapshot.NextEnabled) { $State.lastError='Update preserves a separately scheduled protection change and waits.';& $save;return }
        $State.phase='awaiting-normal-restart';& $save
    }
    if($State.phase -eq 'awaiting-normal-restart') {
        if($snapshot.BootId -eq $State.preparedBootId) { return }
        if($snapshot.CurrentEnabled -or $snapshot.NextEnabled -or $snapshot.Servicing) { $State.lastError='Update will not replace files while current/next UWF protection or servicing is enabled.';& $save;return }
        $State.phase='backing-up';& $save
    }
    if($State.phase -eq 'backing-up') {
        $snapshot=& $Runtime.Snapshot
        if($snapshot.CurrentEnabled -or $snapshot.NextEnabled -or $snapshot.Servicing) { $State.lastError='Update backup waits for UWF to be fully disabled.';& $save;return }
        if(-not $snapshot.AgentRunning -or -not(Test-UpdateAgentIdle $snapshot.Agent)) { $State.lastError='Update waits for a running idle management service.';& $save;return }
        try {
            $State.serviceStartIdBefore=if($snapshot.Agent.PSObject.Properties['serviceStartId']){[string]$snapshot.Agent.serviceStartId}else{$null}
            $State.rollback=@(& $Runtime.Backup $release)
            $State.phase='installing';& $save
            & $Runtime.StopAgent
            & $Runtime.Install $release
            & $Runtime.StartAgent
            & $Runtime.WaitHealthy $State.serviceStartIdBefore $State.expectedAgentVersion
            # Installed version is committed only after the new service and classroom policy are healthy.
            $State.installedVersion=$release.Version;$State.lastError=$null;$State.failedVersion=$null
            $State.phase='restoring-protection';& $save
            & $Runtime.ClearPending
            & $Runtime.RestoreProtection $State $snapshot
            & $save
        } catch {
            $failure=$_.Exception.Message;$State.failedVersion=$release.Version;$State.lastError='Update failed: '+$failure
            if($State.previousInstalledVersion) { $State.installedVersion=$State.previousInstalledVersion }
            $State.phase='rolling-back';& $save
            try { & $Runtime.StopAgent; & $Runtime.Rollback $State.rollback; & $Runtime.StartAgent; & $Runtime.WaitHealthy $State.serviceStartIdBefore $null }
            catch { $State.requiresStaffReview=$true;$State.lastError+=' Rollback needs staff review: '+$_.Exception.Message }
            try { & $Runtime.ClearPending } catch { $State.lastError+=' Cache cleanup needs staff review: '+$_.Exception.Message }
            try { & $Runtime.RestoreProtection $State $snapshot }
            catch { $State.phase='failed';$State.pendingVersion=$null;$State.requiresStaffReview=$true;$State.lastError+=' Protection needs staff review: '+$_.Exception.Message }
            & $save
        }
    }
}

if($LibraryOnly) { return }
$identity=[Security.Principal.WindowsIdentity]::GetCurrent()
if(-not([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) -or -not [Environment]::Is64BitProcess) { throw 'The update coordinator requires 64-bit SYSTEM or administrator execution.' }
if(-not(Test-AssignedUpdateComputer $env:COMPUTERNAME)) { throw 'The update coordinator is only for assigned UEPLV lab PCs or test PC 34.' }
$StateRoot=[IO.Path]::GetFullPath($StateRoot).TrimEnd('\')
$ProgramRoot=[IO.Path]::GetFullPath($ProgramRoot).TrimEnd('\')
if($StateRoot -cne (Join-Path $env:ProgramData 'UEPLV\Update') -or $ProgramRoot -cne (Join-Path $env:ProgramFiles 'UEPLV\Management')) { throw 'Production update locations are fixed.' }
Assert-OrdinaryUpdatePath $StateRoot $StateRoot|Out-Null
Assert-OrdinaryUpdatePath $ProgramRoot $ProgramRoot|Out-Null
$statePath=Join-Path $StateRoot 'update-state.json';$checkpointPath=Join-Path $StateRoot 'update-checkpoint.json';$pendingPath=Join-Path $StateRoot 'pending-package.json'
Assert-PrivateUpdateFile $statePath;Assert-PrivateUpdateFile $checkpointPath;Assert-PrivateUpdateFile $pendingPath
$keyPath=Join-Path $ProgramRoot 'Update\release-public.xml'
Assert-OrdinaryUpdatePath $keyPath $ProgramRoot|Out-Null
$keyXml=[IO.File]::ReadAllText($keyPath)
$mutexSecurity=[Security.AccessControl.MutexSecurity]::new();$mutexSecurity.SetAccessRuleProtection($true,$false)
foreach($sid in @('S-1-5-18','S-1-5-32-544')) { $mutexSecurity.AddAccessRule([Security.AccessControl.MutexAccessRule]::new([Security.Principal.SecurityIdentifier]::new($sid),[Security.AccessControl.MutexRights]::FullControl,[Security.AccessControl.AccessControlType]::Allow)) }
$created=$false;$mutex=[Threading.Mutex]::new($false,'Global\UEPLVAutomaticUpdateCoordinator',[ref]$created,$mutexSecurity)
$locked=$false
try {
    try { $locked=$mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked=$true }
    if(-not $locked) { return }
    $state=Read-UpdateState $statePath $checkpointPath
    $runtime=@{}
    $runtime.SaveState={param($value) Write-UpdateState $statePath $checkpointPath $value}
    $runtime.Snapshot={
        $boot=(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().Ticks.ToString()
        $agent=$null;try{$agent=Read-PrivateJson (Join-Path $env:ProgramData 'UEPLV\Management\agent-state.json') 2097152}catch{}
        $initial=$false;$initialPath=Join-Path $env:ProgramData 'UEPLV\finalization-state.json'
        if(Test-Path -LiteralPath $initialPath){try{$initial=[bool](Read-PrivateJson $initialPath).Complete}catch{$initial=$false}}
        $current=$false;$next=$false;$currentC=$false;$nextC=$false;$servicing=$false
        $feature=Get-WindowsOptionalFeature -Online -FeatureName Client-UnifiedWriteFilter
        if($feature.State -in @('EnablePending','DisablePending')){$servicing=$true}
        elseif($feature.State -eq 'Enabled'){
            $filter=Get-CimInstance -Namespace 'root\standardcimv2\embedded' -ClassName UWF_Filter
            $volumes=@(Get-CimInstance -Namespace 'root\standardcimv2\embedded' -ClassName UWF_Volume)
            $service=@(Get-CimInstance -Namespace 'root\standardcimv2\embedded' -ClassName UWF_Servicing)
            $current=[bool]$filter.CurrentEnabled;$next=[bool]$filter.NextEnabled
            $currentC=[bool]@($volumes|Where-Object {$_.CurrentSession -and $_.DriveLetter -eq 'C:' -and $_.Protected}).Count
            $nextC=[bool]@($volumes|Where-Object {-not $_.CurrentSession -and $_.DriveLetter -eq 'C:' -and $_.Protected}).Count
            $servicing=[bool]@($service|Where-Object ServicingEnabled).Count
        }
        $agentRunning=(Get-Service -Name UEPLVAgent -ErrorAction Stop).Status -eq 'Running'
        [pscustomobject]@{BootId=$boot;CurrentEnabled=$current;NextEnabled=$next;CurrentCProtected=$currentC;NextCProtected=$nextC;Servicing=$servicing;InitialDeploymentComplete=$initial;Agent=$agent;AgentRunning=$agentRunning}
    }
    $runtime.LoadRelease={
        $envelope=Read-PrivateJson $pendingPath
        if(-not $envelope -or -not $envelope.PSObject.Properties['manifestJson']){return $null}
        Get-ValidatedRelease $envelope $keyXml
    }
    $runtime.SetFilter={param([bool]$enabled)
        $arg=if($enabled){'enable'}else{'disable'}
        $text=& (Join-Path $env:windir 'System32\uwfmgr.exe') filter $arg 2>&1|Out-String
        if($LASTEXITCODE -ne 0){throw ('UWF filter '+$arg+' failed: '+$text.Trim())}
    }
    $runtime.Backup={param($release)
        $directory=Join-Path $StateRoot ('rollback\'+$release.Version)
        Assert-OrdinaryUpdatePath $directory $StateRoot -AllowMissing|Out-Null
        [IO.Directory]::CreateDirectory($directory)|Out-Null
        $entries=[Collections.Generic.List[object]]::new()
        foreach($file in $release.Files){
            $relative=$file.Path.Replace('/','\');$target=Assert-OrdinaryUpdatePath (Join-Path $ProgramRoot $relative) $ProgramRoot -AllowMissing
            $backup=Join-Path $directory ($relative+'.old')
            Assert-OrdinaryUpdatePath $backup $StateRoot -AllowMissing|Out-Null
            $existed=[IO.File]::Exists($target);$hash=$null
            if($existed){[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($backup))|Out-Null;$hash=Get-PathHash $target;[IO.File]::Copy($target,$backup,$true);if((Get-PathHash $backup) -cne $hash){throw 'Rollback backup hash failed.'}}
            $entries.Add([pscustomobject]@{path=$file.Path;existed=$existed;backup=$backup;sha256=$hash})
        }
        $entries.ToArray()
    }
    $runtime.StopAgent={
        $service=Get-Service -Name UEPLVAgent -ErrorAction Stop
        if($service.Status -ne 'Stopped'){Stop-Service -Name UEPLVAgent -Force;$service.WaitForStatus('Stopped',[TimeSpan]::FromSeconds(30))}
    }
    $runtime.Install={param($release)
        foreach($file in $release.Files){
            $target=Assert-OrdinaryUpdatePath (Join-Path $ProgramRoot $file.Path.Replace('/','\')) $ProgramRoot -AllowMissing
            [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))|Out-Null
            $temporary=$target+'.ueplv-next'
            Assert-OrdinaryUpdatePath $temporary $ProgramRoot -AllowMissing|Out-Null
            [IO.File]::WriteAllBytes($temporary,$file.Bytes)
            if((Get-PathHash $temporary) -cne $file.Hash){throw 'Staged update file hash failed.'}
            Move-VerifiedUpdateFile $temporary $target
            if((Get-PathHash $target) -cne $file.Hash){throw 'Installed update file hash failed.'}
        }
    }
    $runtime.Rollback={param($entries)
        foreach($entry in @($entries)){
            if(-not(Test-ReleasePath ([string]$entry.path))){throw 'Rollback path is invalid.'}
            $target=Assert-OrdinaryUpdatePath (Join-Path $ProgramRoot $entry.path.Replace('/','\')) $ProgramRoot -AllowMissing
            if($entry.existed){
                $backup=Assert-OrdinaryUpdatePath ([string]$entry.backup) $StateRoot
                if((Get-PathHash $backup) -cne [string]$entry.sha256){throw 'Rollback file hash failed.'}
                $temporary=$target+'.ueplv-rollback';Assert-OrdinaryUpdatePath $temporary $ProgramRoot -AllowMissing|Out-Null
                [IO.File]::Copy($backup,$temporary,$true)
                Move-VerifiedUpdateFile $temporary $target
                if((Get-PathHash $target) -cne [string]$entry.sha256){throw 'Restored rollback file hash failed.'}
            }elseif([IO.File]::Exists($target)){[IO.File]::Delete($target)}
        }
    }
    $runtime.StartAgent={Start-Service -Name UEPLVAgent;(Get-Service UEPLVAgent).WaitForStatus('Running',[TimeSpan]::FromSeconds(30))}
    $runtime.WaitHealthy={param([string]$oldStartId,[string]$expectedVersion)
        $deadline=[datetime]::UtcNow.AddSeconds(300);$stable=0
        do{
            $service=Get-Service -Name UEPLVAgent
            $agent=$null;try{$agent=Read-PrivateJson (Join-Path $env:ProgramData 'UEPLV\Management\agent-state.json') 2097152}catch{}
            $valid=[bool]($service.Status -eq 'Running' -and $agent -and $agent.PSObject.Properties['serviceStartId'] -and $agent.serviceStartId -and $agent.serviceStartId -ne $oldStartId -and $agent.policiesApplied -eq $true -and -not $agent.maintenanceBlocked)
            if($expectedVersion -and $valid -and [string]$agent.version -cne $expectedVersion){$valid=$false}
            if($valid){$stable++}else{$stable=0}
            if($stable -ge 3){return}
            Start-Sleep -Seconds 5
        }while([datetime]::UtcNow -lt $deadline)
        throw 'The updated agent did not confirm a healthy fresh service start and applied classroom policy.'
    }
    $runtime.ClearPending={Write-PrivateJson $pendingPath ([pscustomobject]@{})}
    $runtime.Restart={
        & (Join-Path $env:windir 'System32\shutdown.exe') /r /t 30 /c 'UEPLV: actualizacion aplicada; reiniciando una vez para restaurar la proteccion.'|Out-Null
        if($LASTEXITCODE -ne 0){throw 'Protection restoration restart could not be scheduled.'}
    }
    $runtime.RestoreProtection={param($value,$before) Restore-UpdateProtection $value $runtime}
    Invoke-UpdateCycle $state $runtime
} catch {
    if($statePath -and (Test-Path -LiteralPath $statePath)){
        try{$record=Read-UpdateState $statePath $checkpointPath;$record.lastError=$_.Exception.Message;$record.lastCheckedUtc=[datetime]::UtcNow.ToString('o');Write-UpdateState $statePath $checkpointPath $record}catch{}
    }
    throw
} finally { if($locked){$mutex.ReleaseMutex()};$mutex.Dispose() }
