param(
    [string[]]$IpAddresses = @("192.168.1.39"),
    [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\.local-dev-certs"),
    [string]$Password = "BienHelodiasLocalDev123!"
)

$ErrorActionPreference = "Stop"

$resolvedOutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $resolvedOutputDirectory | Out-Null

$sanEntries = @("DNS=localhost", "IPAddress=127.0.0.1")
foreach ($ip in $IpAddresses) {
    if (-not [string]::IsNullOrWhiteSpace($ip)) {
        $sanEntries += "IPAddress=$($ip.Trim())"
    }
}

$rootSubject = "CN=BienHelodias Local Root CA"
$rootFriendlyName = "BienHelodias Local Root CA"
$serverSubject = "CN=BienHelodias Local Dev"
$serverFriendlyName = "BienHelodias Local HTTPS"

Get-ChildItem "Cert:\CurrentUser\My" | Where-Object { $_.Subject -eq $rootSubject -or $_.Subject -eq $serverSubject } | Remove-Item -Force -ErrorAction SilentlyContinue

$rootCert = New-SelfSignedCertificate `
    -Type Custom `
    -Subject $rootSubject `
    -FriendlyName $rootFriendlyName `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -KeyExportPolicy Exportable `
    -KeyUsageProperty Sign `
    -KeyUsage CertSign, CRLSign, DigitalSignature `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(5) `
    -TextExtension @(
        "2.5.29.19={text}CA=true&pathlength=1"
    )

$cert = New-SelfSignedCertificate `
    -Type Custom `
    -Subject $serverSubject `
    -FriendlyName $serverFriendlyName `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -KeyExportPolicy Exportable `
    -KeyUsage DigitalSignature, KeyEncipherment `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -Signer $rootCert `
    -NotAfter (Get-Date).AddYears(2) `
    -TextExtension @(
        "2.5.29.17={text}$($sanEntries -join '&')",
        "2.5.29.19={text}CA=false",
        "2.5.29.37={text}1.3.6.1.5.5.7.3.1"
    )

$pfxPath = Join-Path $resolvedOutputDirectory "lan-dev-cert.pfx"
$cerPath = Join-Path $resolvedOutputDirectory "lan-dev-cert.cer"
$rootCerPath = Join-Path $resolvedOutputDirectory "lan-root-ca.cer"
$pemPath = Join-Path $resolvedOutputDirectory "lan-dev-cert.pem"
$keyPath = Join-Path $resolvedOutputDirectory "lan-dev-key.pem"
$passwordSecure = ConvertTo-SecureString -String $Password -AsPlainText -Force

Export-PfxCertificate -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" -FilePath $pfxPath -Password $passwordSecure | Out-Null
Export-Certificate -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" -FilePath $cerPath | Out-Null
Export-Certificate -Cert "Cert:\CurrentUser\My\$($rootCert.Thumbprint)" -FilePath $rootCerPath | Out-Null

$exportableCert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new(
    $pfxPath,
    $Password,
    [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable
)

[System.IO.File]::WriteAllText($pemPath, $exportableCert.ExportCertificatePem())
$rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($exportableCert)
[System.IO.File]::WriteAllText($keyPath, $rsa.ExportPkcs8PrivateKeyPem())

$alreadyTrusted = Get-ChildItem "Cert:\CurrentUser\Root" | Where-Object Thumbprint -eq $rootCert.Thumbprint
if (-not $alreadyTrusted) {
    Import-Certificate -FilePath $rootCerPath -CertStoreLocation "Cert:\CurrentUser\Root" | Out-Null
}

Write-Output "Created certificate for SANs: $($sanEntries -join ', ')"
Write-Output "Root CA CER: $rootCerPath"
Write-Output "PFX: $pfxPath"
Write-Output "PEM: $pemPath"
Write-Output "KEY: $keyPath"
Write-Output "CER: $cerPath"
Write-Output "Password: $Password"
