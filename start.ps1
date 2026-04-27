[CmdletBinding()]
param(
    [ValidateSet("vjoy", "log")]
    [string]$Adapter = "vjoy",

    [int]$Port = 3702,

    [string]$HostAddress = "0.0.0.0",

    [int]$VJoyDeviceId = 1,

    [switch]$Reload
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = Join-Path $Root ".venv\Scripts\python.exe"

function Test-PortAvailable {
    param([int]$PortToCheck)

    $connection = Get-NetTCPConnection -LocalPort $PortToCheck -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1

    return $null -eq $connection
}

function Get-FirstLocalIpAddress {
    $address = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -ne "127.0.0.1" -and
            -not $_.IPAddress.StartsWith("169.254.") -and
            $_.PrefixOrigin -ne "WellKnown"
        } |
        Sort-Object InterfaceMetric |
        Select-Object -First 1 -ExpandProperty IPAddress

    if ($address) {
        return $address
    }

    return "<pc-ip>"
}

if (-not (Test-Path $Python)) {
    Write-Host "Virtual environment bulunamadi: $Python" -ForegroundColor Red
    Write-Host "Once kurulumu calistir:" -ForegroundColor Yellow
    Write-Host "  python -m venv .venv"
    Write-Host "  .\.venv\Scripts\python.exe -m pip install --upgrade pip"
    Write-Host "  .\.venv\Scripts\python.exe -m pip install -r requirements.txt"
    exit 1
}

$SelectedPort = $Port
if (-not (Test-PortAvailable -PortToCheck $SelectedPort)) {
    throw "Port $SelectedPort dolu. AxisDeck baska porta gecmeyecek; once bu portu kullanan sureci kapat."
}

$env:AXISDECK_INPUT_ADAPTER = $Adapter
$env:AXISDECK_VJOY_DEVICE_ID = [string]$VJoyDeviceId

$LocalIp = Get-FirstLocalIpAddress
$ReloadArgs = @()
if ($Reload) {
    $ReloadArgs = @("--reload")
}

Write-Host ""
Write-Host "AxisDeck baslatiliyor" -ForegroundColor Cyan
Write-Host "  Adapter : $Adapter"
Write-Host "  vJoy ID : $VJoyDeviceId"
Write-Host "  Host    : $HostAddress"
Write-Host "  Port    : $SelectedPort"
Write-Host ""
Write-Host "PC     : http://127.0.0.1:$SelectedPort"
Write-Host "Tablet : http://$LocalIp`:$SelectedPort"
Write-Host ""

Set-Location $Root
& $Python -m uvicorn backend.app.main:app @ReloadArgs --host $HostAddress --port $SelectedPort
