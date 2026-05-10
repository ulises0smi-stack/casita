param(
  [int]$ListenPort = 3000,
  [int]$ConnectPort = 3000,
  [string]$RuleName = "Casita API 3000"
)

$wslIpRaw = wsl hostname -I
if (-not $wslIpRaw) {
  Write-Error "No se pudo obtener la IP de WSL."
  exit 1
}

$wslIp = ($wslIpRaw.Trim() -split "\s+")[0]
if (-not $wslIp) {
  Write-Error "IP de WSL invalida."
  exit 1
}

Write-Host "WSL IP detectada: $wslIp"

netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort | Out-Null
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort connectaddress=$wslIp connectport=$ConnectPort | Out-Null

netsh advfirewall firewall delete rule name="$RuleName" | Out-Null
netsh advfirewall firewall add rule name="$RuleName" dir=in action=allow protocol=TCP localport=$ListenPort profile=private | Out-Null

Write-Host "Portproxy actualizado: 0.0.0.0:$ListenPort -> $wslIp:$ConnectPort"
Write-Host "Regla firewall aplicada: $RuleName"
