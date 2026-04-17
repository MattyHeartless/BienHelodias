param(
    [int]$Port = 4200
)

$ErrorActionPreference = "Stop"

$projectDirectory = Join-Path $PSScriptRoot "..\frontend\deliverypage"

Push-Location $projectDirectory
try {
    if ($Port -ne 4200) {
        throw "This script currently expects port 4200 because the npm serve:lan:https script is fixed to that port."
    }

    npm run start:lan:https
}
finally {
    Pop-Location
}
