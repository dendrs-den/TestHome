$ErrorActionPreference = "Stop"

Write-Host "[1/4] Checking Node.js"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js not found. Install Node.js 16.x and rerun script."
}

$nodeVersion = node -v
Write-Host "Node version: $nodeVersion"

Write-Host "[2/5] Installing server dependencies"
Push-Location "$PSScriptRoot\..\src_frontend\server"
cmd /c "npm.cmd install --legacy-peer-deps --no-audit --no-fund"
Pop-Location

Write-Host "[3/5] Normalizing client dependencies"
Push-Location "$PSScriptRoot\..\src_frontend\client"
cmd /c "npm.cmd pkg delete devDependencies.node-sass"
cmd /c "npm.cmd pkg delete devDependencies.@types/node-sass"
cmd /c "npm.cmd pkg set devDependencies.sass=^1.93.2"
Pop-Location

Write-Host "[4/5] Installing client dependencies"
Push-Location "$PSScriptRoot\..\src_frontend\client"
cmd /c "npm.cmd install --legacy-peer-deps --no-audit --no-fund"
Pop-Location

Write-Host "[5/5] Done"
Write-Host "Start server: cd src_frontend/server; npm start"
Write-Host "Start client: cd src_frontend/client; npm start"
