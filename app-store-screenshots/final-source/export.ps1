$ErrorActionPreference = 'Stop'

$shotNames = @(
  '01-study-without-cramming',
  '02-build-your-semester',
  '03-keep-every-class-ready',
  '04-review-in-small-bites',
  '05-quiz-before-class',
  '06-request-study-chunks'
)

$sourceDir = $PSScriptRoot
$outputDir = Join-Path (Split-Path -Parent $sourceDir) 'final-framed'
$htmlPath = Join-Path $sourceDir 'index.html'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$edge = (Get-Command msedge.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1)
if (-not $edge) {
  $edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
}
if (-not (Test-Path -LiteralPath $edge)) {
  throw 'Microsoft Edge was not found. Install Edge or update export.ps1 with a browser path.'
}

Add-Type -AssemblyName System.Drawing

for ($i = 0; $i -lt $shotNames.Count; $i++) {
  $shotNumber = $i + 1
  $outPath = Join-Path $outputDir "$($shotNames[$i]).png"
  $url = ([Uri]$htmlPath).AbsoluteUri + "?shot=$shotNumber"

  & $edge `
    --headless=new `
    --disable-gpu `
    --disable-extensions `
    --hide-scrollbars `
    --no-first-run `
    --allow-file-access-from-files `
    --force-device-scale-factor=1 `
    --window-size=1284,2778 `
    "--screenshot=$outPath" `
    $url | Out-Null

  $image = [System.Drawing.Image]::FromFile($outPath)
  try {
    if ($image.Width -ne 1284 -or $image.Height -ne 2778) {
      throw "$($shotNames[$i]).png exported at $($image.Width)x$($image.Height), expected 1284x2778."
    }
  } finally {
    $image.Dispose()
  }
}

Write-Host "Exported $($shotNames.Count) framed screenshots to $outputDir"
