$ErrorActionPreference = 'Stop'
$p = 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{71a27cdd-812a-11d0-bec7-08002be2092f}'

if (!(Test-Path $p)) {
    Write-Host '[!] No existe la clave de clase de volumen.'
    exit 1
}

try {
    $v = (Get-ItemProperty -Path $p -Name LowerFilters -ErrorAction SilentlyContinue).LowerFilters
} catch {
    $v = $null
}

if ($null -eq $v) {
    $arr = @()
} elseif ($v -is [string]) {
    $arr = @($v)
} else {
    $arr = @($v)
}

$arr = @($arr | Where-Object { $_ -and $_.Trim() -ne '' })

if ($arr -notcontains 'uwfvol') {
    $arr = @('uwfvol') + $arr
    New-ItemProperty -Path $p -Name LowerFilters -PropertyType MultiString -Value $arr -Force | Out-Null
    Write-Host '[OK] LowerFilters restaurado: uwfvol'
} else {
    Write-Host '[OK] LowerFilters ya contiene uwfvol'
}
exit 0
