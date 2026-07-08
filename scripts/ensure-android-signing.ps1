# Ensures apps/web/android uses keystore.properties for release signing.
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$webRoot = Join-Path $repoRoot 'apps\web'
$appGradle = Join-Path $webRoot 'android\app\build.gradle'
$propsFile = Join-Path $webRoot 'android\keystore.properties'

if (-not (Test-Path $appGradle)) {
  Write-Host "Missing $appGradle"
  exit 1
}
if (-not (Test-Path $propsFile)) {
  Write-Host "Missing $propsFile — create it first."
  exit 1
}

$content = Get-Content -Raw $appGradle

$changed = $false

if ($content -notmatch 'keystorePropertiesFile') {
  $loader = @"
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

"@
  $content = $loader + $content
  $changed = $true
  Write-Host "  Added keystore.properties loader"
}

if ($content -notmatch 'signingConfigs\s*\{') {
  $signingConfigs = @"
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
"@
  $content = [regex]::Replace(
    $content,
    '(android\s*\{)',
    "`$1`r`n$signingConfigs",
    1
  )
  $changed = $true
  Write-Host "  Added signingConfigs.release"
}

if ($content -match 'release\s*\{' -and $content -notmatch 'signingConfig\s+signingConfigs\.release') {
  $content = [regex]::Replace(
    $content,
    '(release\s*\{)',
    "`$1`r`n            signingConfig signingConfigs.release",
    1
  )
  $changed = $true
  Write-Host "  Wired release buildType to signingConfigs.release"
}

if ($changed) {
  Set-Content -Path $appGradle -Value $content -NoNewline
  Write-Host "  Updated app/build.gradle"
} else {
  Write-Host "  Release signing already configured"
}

exit 0
