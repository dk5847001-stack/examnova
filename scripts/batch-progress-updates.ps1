[CmdletBinding()]
param(
  [int]$Count = 110
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $workspaceRoot "apps\api\src\content\platform-updates"
$frontendDir = Join-Path $workspaceRoot "apps\web\src\content\frontend-updates"
$initialTimestamp = (Get-Date).ToUniversalTime()

$frontendDomains = @(
  @{ Slug = "marketplace-search"; Label = "Marketplace search" },
  @{ Slug = "public-sidebar"; Label = "Public sidebar" },
  @{ Slug = "updates-timeline"; Label = "Updates timeline" },
  @{ Slug = "mobile-footer"; Label = "Mobile footer" },
  @{ Slug = "navigation-route"; Label = "Navigation route" },
  @{ Slug = "discovery-header"; Label = "Discovery header" },
  @{ Slug = "theme-surface"; Label = "Theme surface" },
  @{ Slug = "marketplace-filters"; Label = "Marketplace filters" },
  @{ Slug = "listing-cards"; Label = "Listing cards" },
  @{ Slug = "auth-prompts"; Label = "Auth prompts" },
  @{ Slug = "public-cta"; Label = "Public CTA" }
)

$backendDomains = @(
  @{ Slug = "public-updates-route"; Label = "Public updates route" },
  @{ Slug = "timeline-loader"; Label = "Timeline loader" },
  @{ Slug = "content-parsing"; Label = "Content parsing" },
  @{ Slug = "json-feed"; Label = "JSON feed" },
  @{ Slug = "media-surface"; Label = "Media surface" },
  @{ Slug = "public-controller"; Label = "Public controller" },
  @{ Slug = "route-mapping"; Label = "Route mapping" },
  @{ Slug = "payload-shape"; Label = "Payload shape" },
  @{ Slug = "feed-sorting"; Label = "Feed sorting" },
  @{ Slug = "timestamp-notes"; Label = "Timestamp notes" },
  @{ Slug = "content-catalog"; Label = "Content catalog" }
)

$actions = @(
  @{ Label = "visibility pass"; Slug = "visibility"; Outcome = "improve scan clarity" },
  @{ Label = "microcopy refresh"; Slug = "copy"; Outcome = "tighten user-facing wording" },
  @{ Label = "status note"; Slug = "status"; Outcome = "make release intent easier to follow" },
  @{ Label = "metadata pass"; Slug = "metadata"; Outcome = "keep update labels consistent" },
  @{ Label = "navigation polish"; Slug = "navigation"; Outcome = "make the surface easier to discover" },
  @{ Label = "traceability marker"; Slug = "traceability"; Outcome = "preserve a clearer shipping trail" },
  @{ Label = "feed extension"; Slug = "feed"; Outcome = "expand the public update stream" },
  @{ Label = "support note"; Slug = "support"; Outcome = "document another small product-facing change" },
  @{ Label = "release marker"; Slug = "release"; Outcome = "signal one more shipped increment" },
  @{ Label = "cadence entry"; Slug = "cadence"; Outcome = "keep update momentum visible" }
)

function Write-Utf8NoBomFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$Content
  )

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Invoke-GitCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & git @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed."
  }
}

function Get-NextSequence {
  param(
    [Parameter(Mandatory = $true)]
    [string]$DirectoryPath,

    [Parameter(Mandatory = $true)]
    [string]$Prefix
  )

  $files = Get-ChildItem -LiteralPath $DirectoryPath -Filter "$Prefix-*.json" -File -ErrorAction SilentlyContinue
  if (-not $files) {
    return 1
  }

  $numbers = foreach ($file in $files) {
    if ($file.BaseName -match "(\d+)$") {
      [int]$Matches[1]
    }
  }

  if (-not $numbers) {
    return 1
  }

  return (($numbers | Measure-Object -Maximum).Maximum + 1)
}

function New-UpdateDefinition {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("frontend", "backend")]
    [string]$Area,

    [Parameter(Mandatory = $true)]
    [int]$Sequence
  )

  $domains = if ($Area -eq "frontend") { $frontendDomains } else { $backendDomains }
  $status = if ($Area -eq "frontend") { "live" } else { "shipped" }
  $prefix = if ($Area -eq "frontend") { "frontend-update" } else { "backend-update" }
  $directory = if ($Area -eq "frontend") { $frontendDir } else { $backendDir }

  $domain = $domains[($Sequence - 1) % $domains.Count]
  $action = $actions[($Sequence - 1) % $actions.Count]
  $id = "{0}-{1}" -f $prefix, $Sequence.ToString("000")
  $filePath = Join-Path $directory "$id.json"
  $publishedAt = $initialTimestamp.AddMinutes($Sequence).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $title = "{0} {1}" -f $domain.Label, $action.Label
  $summary = "Logged a {0} mini update for the {1} surface to {2}. This entry keeps the public shipping timeline growing in small, traceable steps." -f $Area, $domain.Label.ToLowerInvariant(), $action.Outcome

  return @{
    Id = $id
    FilePath = $filePath
    Payload = [ordered]@{
      id = $id
      title = $title
      summary = $summary
      area = $Area
      status = $status
      publishedAt = $publishedAt
      tags = @($Area, $domain.Slug, $action.Slug)
    }
    CommitMessage = "feat: add $Area mini update $($Sequence.ToString("000"))"
  }
}

Push-Location $workspaceRoot
try {
  $workingTreeState = git status --porcelain
  if ($workingTreeState) {
    throw "Working tree must be clean before running batch updates."
  }

  $backendSequence = Get-NextSequence -DirectoryPath $backendDir -Prefix "backend-update"
  $frontendSequence = Get-NextSequence -DirectoryPath $frontendDir -Prefix "frontend-update"

  for ($index = 0; $index -lt $Count; $index += 1) {
    $area = if (($index % 2) -eq 0) { "backend" } else { "frontend" }
    $sequence = if ($area -eq "backend") { $backendSequence } else { $frontendSequence }
    $definition = New-UpdateDefinition -Area $area -Sequence $sequence
    $json = $definition.Payload | ConvertTo-Json -Depth 4

    Write-Utf8NoBomFile -Path $definition.FilePath -Content "$json`n"
    Write-Host "Created $($definition.Id)"

    Invoke-GitCommand -Arguments @("add", ".")
    Invoke-GitCommand -Arguments @("commit", "-m", $definition.CommitMessage)
    Invoke-GitCommand -Arguments @("push", "origin", "main")

    if ($area -eq "backend") {
      $backendSequence += 1
    } else {
      $frontendSequence += 1
    }
  }
}
finally {
  Pop-Location
}
