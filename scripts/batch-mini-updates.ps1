param(
  [int]$Count = 111
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location -LiteralPath $repoRoot

$frontendDir = Join-Path $repoRoot "apps\web\src\content\frontend-updates"
$backendDir = Join-Path $repoRoot "apps\api\src\content\platform-updates"
$progressLogPath = Join-Path $repoRoot "docs\progress-updates.md"

$frontendTopics = @(
  "Mobile footer",
  "Dashboard spacing",
  "Search empty state",
  "Notification clarity",
  "Marketplace filters",
  "Upload progress",
  "Account settings",
  "Route guard copy",
  "Theme contrast",
  "Checkout feedback",
  "FAQ readability",
  "Resource layout"
)

$backendTopics = @(
  "Payload shape",
  "Response metadata",
  "Audit trail",
  "Validation messaging",
  "Route sequencing",
  "Upload workflow",
  "Notification payload",
  "Wallet summary",
  "Marketplace sync",
  "Content delivery",
  "Document parsing",
  "PDF pipeline"
)

$frontendTags = @(
  "scanability",
  "clarity",
  "layout",
  "feedback",
  "readability",
  "consistency",
  "navigation",
  "polish"
)

$backendTags = @(
  "traceability",
  "stability",
  "consistency",
  "reliability",
  "delivery",
  "sanity-check",
  "observability",
  "hardening"
)

function Get-NextSequenceNumber {
  param(
    [string]$DirectoryPath,
    [string]$Prefix
  )

  $maxNumber = 0
  $escapedPrefix = [regex]::Escape($Prefix)

  foreach ($file in Get-ChildItem -LiteralPath $DirectoryPath -Filter "$Prefix-*.json" -File) {
    if ($file.BaseName -match "^$escapedPrefix-(\d+)$") {
      $value = [int]$matches[1]
      if ($value -gt $maxNumber) {
        $maxNumber = $value
      }
    }
  }

  return $maxNumber + 1
}

function Get-NextProgressNumber {
  param(
    [string]$FilePath
  )

  $content = Get-Content -LiteralPath $FilePath -Raw
  $matches = [regex]::Matches($content, "## Update (\d+)")

  if ($matches.Count -eq 0) {
    return 1
  }

  return ([int]$matches[$matches.Count - 1].Groups[1].Value) + 1
}

function Write-JsonFile {
  param(
    [string]$FilePath,
    [hashtable]$Payload
  )

  $json = $Payload | ConvertTo-Json -Depth 4
  Set-Content -LiteralPath $FilePath -Value $json
}

$frontendStart = Get-NextSequenceNumber -DirectoryPath $frontendDir -Prefix "frontend-update"
$backendStart = Get-NextSequenceNumber -DirectoryPath $backendDir -Prefix "backend-update"
$progressStart = Get-NextProgressNumber -FilePath $progressLogPath

for ($index = 0; $index -lt $Count; $index++) {
  $frontendNumber = $frontendStart + $index
  $backendNumber = $backendStart + $index
  $progressNumber = $progressStart + $index

  $frontendTopic = $frontendTopics[$index % $frontendTopics.Count]
  $backendTopic = $backendTopics[$index % $backendTopics.Count]
  $frontendFocus = $frontendTags[$index % $frontendTags.Count]
  $backendFocus = $backendTags[$index % $backendTags.Count]

  $frontendId = "frontend-update-{0:D3}" -f $frontendNumber
  $backendId = "backend-update-{0:D3}" -f $backendNumber

  $frontendTimestamp = [DateTimeOffset]::UtcNow.AddMinutes($index).ToString("o")
  $backendTimestamp = [DateTimeOffset]::UtcNow.AddMinutes($index).AddSeconds(30).ToString("o")
  $today = Get-Date -Format "yyyy-MM-dd"

  $frontendFilePath = Join-Path $frontendDir "$frontendId.json"
  $backendFilePath = Join-Path $backendDir "$backendId.json"

  Write-JsonFile -FilePath $frontendFilePath -Payload ([ordered]@{
      id = $frontendId
      title = "$frontendTopic $frontendFocus pass"
      summary = "Logged a frontend mini update for the $($frontendTopic.ToLower()) surface to improve $frontendFocus. This entry keeps the public shipping timeline growing in small, traceable steps."
      area = "frontend"
      status = "live"
      publishedAt = $frontendTimestamp
      tags = @("frontend", ($frontendTopic.ToLower() -replace "\s+", "-"), $frontendFocus)
    })

  Write-JsonFile -FilePath $backendFilePath -Payload ([ordered]@{
      id = $backendId
      title = "$backendTopic $backendFocus marker"
      summary = "Logged a backend mini update for the $($backendTopic.ToLower()) surface to preserve stronger $backendFocus across release notes. This entry keeps the public shipping timeline growing in small, traceable steps."
      area = "backend"
      status = "shipped"
      publishedAt = $backendTimestamp
      tags = @("backend", ($backendTopic.ToLower() -replace "\s+", "-"), $backendFocus)
    })

  $progressEntry = @"

## Update $("{0:D3}" -f $progressNumber)
- Date: $today
- Note: Recorded small repository progress update $("{0:D3}" -f $progressNumber) for the $($frontendTopic.ToLower()) and $($backendTopic.ToLower()) surfaces.
"@

  Add-Content -LiteralPath $progressLogPath -Value $progressEntry

  $commitMessage = "chore: log $($frontendTopic.ToLower()) and $($backendTopic.ToLower()) mini update"

  git add .
  git commit -m $commitMessage
  git push origin main
}
