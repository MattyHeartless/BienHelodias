param(
    [string]$CertificateDirectory = (Join-Path $PSScriptRoot "..\.local-dev-certs"),
    [string]$CertificatePassword = "BienHelodiasLocalDev123!",
    [int]$HttpsPort = 7296,
    [int]$HttpPort = 5078
)

$ErrorActionPreference = "Stop"

$projectPath = Join-Path $PSScriptRoot "..\backend\src\LiquorSaaS.Api\LiquorSaaS.Api.csproj"
$certificatePath = [System.IO.Path]::GetFullPath((Join-Path $CertificateDirectory "lan-dev-cert.pfx"))

if (-not (Test-Path $certificatePath)) {
    throw "Certificate not found at $certificatePath. Run scripts/generate-local-https-cert.ps1 first."
}

$env:ASPNETCORE_Kestrel__Certificates__Default__Path = $certificatePath
$env:ASPNETCORE_Kestrel__Certificates__Default__Password = $CertificatePassword

dotnet run --project $projectPath --urls "https://0.0.0.0:$HttpsPort;http://0.0.0.0:$HttpPort"
