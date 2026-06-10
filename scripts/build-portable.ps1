$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root "src-tauri\target\release"
$artifactDir = Join-Path $root "artifacts\portable"
$portableExe = Join-Path $artifactDir "TieZ.exe"
$portableData = Join-Path $artifactDir "tiez-data"
$portableZip = Join-Path $artifactDir "tiez-portable.zip"

Push-Location $root
try {
    npx tauri build --no-bundle --features portable

    $builtExe = Join-Path $releaseDir "tiez-app.exe"
    if (-not (Test-Path -LiteralPath $builtExe)) {
        throw "Portable executable was not generated: $builtExe"
    }

    if (Test-Path -LiteralPath $artifactDir) {
        Remove-Item -LiteralPath $artifactDir -Recurse -Force
    }

    New-Item -ItemType Directory -Path $portableData -Force | Out-Null
    Copy-Item -LiteralPath $builtExe -Destination $portableExe
    Compress-Archive -LiteralPath $portableExe, $portableData -DestinationPath $portableZip -Force

    Add-Type -AssemblyName System.IO.Compression
    $archive = [System.IO.Compression.ZipFile]::Open(
        $portableZip,
        [System.IO.Compression.ZipArchiveMode]::Update
    )
    try {
        if (-not $archive.GetEntry("tiez-data/")) {
            $archive.CreateEntry("tiez-data/") | Out-Null
        }
    }
    finally {
        $archive.Dispose()
    }

    Write-Host "Portable bundle created: $portableZip"
}
finally {
    Pop-Location
}
