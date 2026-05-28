param(
  [string]$SshHost = "flow@192.168.0.177",
  [string]$KeyPath = "$env:USERPROFILE\.ssh\codex_pi_new",
  [string]$RemoteRoot = "/opt/inflightflow",
  [string]$RemoteEnvPath = "/etc/inflightflow/inflightflow-core.env",
  [string]$RemoteUploadDir = "/home/flow/inflightflow-upload",
  [switch]$Upload,
  [switch]$Install
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$coreDir = Join-Path $root "apps\core"
$outDir = Join-Path $root ".runtime\pi-release"
$binName = "inflightflow-core"
$binPath = Join-Path $outDir $binName
$servicePath = Join-Path $root "infra\systemd\inflightflow-core.service"
$envTemplate = Join-Path $coreDir ".env.example"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Push-Location $coreDir
try {
  go test ./...
  $env:GOOS = "linux"
  $env:GOARCH = "arm64"
  go build -o $binPath ./cmd/core
} finally {
  Remove-Item Env:GOOS -ErrorAction SilentlyContinue
  Remove-Item Env:GOARCH -ErrorAction SilentlyContinue
  Pop-Location
}

Copy-Item $servicePath (Join-Path $outDir "inflightflow-core.service") -Force
Copy-Item $envTemplate (Join-Path $outDir "inflightflow-core.env.example") -Force

Write-Host "Prepared Raspberry release bundle: $outDir"
Write-Host "Binary: $binPath"
Write-Host "Service template: $(Join-Path $outDir 'inflightflow-core.service')"
Write-Host "Env template: $(Join-Path $outDir 'inflightflow-core.env.example')"

if (-not $Upload) {
  Write-Host "Upload skipped. Re-run with -Upload to copy files to Raspberry."
  return
}

ssh -i $KeyPath $SshHost "mkdir -p '$RemoteUploadDir' '$RemoteRoot/bin' '$RemoteRoot/core' '$RemoteRoot/releases' ~/.cache/inflightflow"
scp -i $KeyPath $binPath "${SshHost}:$RemoteUploadDir/$binName"
scp -i $KeyPath (Join-Path $outDir "inflightflow-core.service") "${SshHost}:$RemoteUploadDir/inflightflow-core.service"
scp -i $KeyPath (Join-Path $outDir "inflightflow-core.env.example") "${SshHost}:$RemoteUploadDir/inflightflow-core.env.example"

Write-Host "Uploaded release bundle to ${SshHost}:$RemoteUploadDir"

if (-not $Install) {
  Write-Host "Remote install skipped."
  Write-Host "If Raspberry is already configured for passwordless deploy, run:"
  Write-Host "  ssh -i $KeyPath $SshHost sudo /usr/local/bin/inflightflow-deploy"
  return
}

ssh -i $KeyPath $SshHost "sudo /usr/local/bin/inflightflow-deploy"
Write-Host "Remote install completed. Core should now run via systemd binary service."
