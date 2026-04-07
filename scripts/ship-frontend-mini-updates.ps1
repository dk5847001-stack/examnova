$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-GitCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($Arguments -join ' ')"
    }
}

function Write-Utf8File {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Content
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Test-GitTrackedPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "git"
    $processInfo.Arguments = "ls-files --error-unmatch -- `"$RelativePath`""
    $processInfo.WorkingDirectory = (Get-Location).Path
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true

    $process = [System.Diagnostics.Process]::Start($processInfo)
    $process.WaitForExit()

    return $process.ExitCode -eq 0
}

$surfaceDefinitions = @(
    @{ slug = "marketplace-surface"; title = "Marketplace surface"; tag = "marketplace" },
    @{ slug = "updates-timeline"; title = "Updates timeline"; tag = "updates" },
    @{ slug = "signup-flow"; title = "Signup flow"; tag = "auth" },
    @{ slug = "login-form"; title = "Login form"; tag = "auth" },
    @{ slug = "otp-verification"; title = "OTP verification"; tag = "auth" },
    @{ slug = "password-reset"; title = "Password reset"; tag = "auth" },
    @{ slug = "dashboard-metrics"; title = "Dashboard metrics"; tag = "dashboard" },
    @{ slug = "upload-generator"; title = "Upload generator"; tag = "generator" },
    @{ slug = "question-detection"; title = "Question detection"; tag = "generator" },
    @{ slug = "answer-preview"; title = "Answer preview"; tag = "answers" },
    @{ slug = "generated-pdf"; title = "Generated PDF"; tag = "pdf" },
    @{ slug = "purchased-library"; title = "Purchased library"; tag = "library" },
    @{ slug = "seller-listings"; title = "Seller listings"; tag = "seller" },
    @{ slug = "wallet-summary"; title = "Wallet summary"; tag = "wallet" },
    @{ slug = "withdrawal-flow"; title = "Withdrawal flow"; tag = "wallet" },
    @{ slug = "payment-history"; title = "Payment history"; tag = "payments" },
    @{ slug = "notification-center"; title = "Notification center"; tag = "notifications" },
    @{ slug = "account-settings"; title = "Account settings"; tag = "settings" },
    @{ slug = "admin-dashboard"; title = "Admin dashboard"; tag = "admin" },
    @{ slug = "admin-listings"; title = "Admin listings"; tag = "admin" },
    @{ slug = "admin-uploads"; title = "Admin uploads"; tag = "admin" },
    @{ slug = "admin-commerce"; title = "Admin commerce"; tag = "admin" },
    @{ slug = "admin-withdrawals"; title = "Admin withdrawals"; tag = "admin" },
    @{ slug = "public-discovery"; title = "Public discovery"; tag = "seo" },
    @{ slug = "resource-linking"; title = "Resource linking"; tag = "seo" }
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$statusBefore = & git status --porcelain
if ($LASTEXITCODE -ne 0) {
    throw "Unable to inspect git status."
}

if ($statusBefore) {
    Invoke-GitCommand -Arguments @("add", ".")
    Invoke-GitCommand -Arguments @("commit", "-m", "chore: prepare frontend mini update rollout")
    Invoke-GitCommand -Arguments @("push", "origin", "main")
    Write-Host "Prepared frontend mini update rollout."
}

$startNumber = 111
$endNumber = 211
$baseTime = [DateTimeOffset]::UtcNow

for ($number = $startNumber; $number -le $endNumber; $number++) {
    $id = "frontend-update-{0:D3}" -f $number
    $relativePath = "apps/web/src/content/frontend-updates/$id.json"
    $absolutePath = Join-Path $repoRoot $relativePath

    if (Test-GitTrackedPath -RelativePath $relativePath) {
        Write-Host "Skipping $id because it is already tracked."
        continue
    }

    $surfaceIndex = ($number - $startNumber) % $surfaceDefinitions.Count
    $surface = $surfaceDefinitions[$surfaceIndex]
    $publishOffset = $number - $startNumber
    $publishedAt = $baseTime.AddMinutes($publishOffset).ToString("o")

    $updateEntry = [ordered]@{
        id = $id
        title = "$($surface.title) cadence entry"
        summary = "Logged a frontend mini update for the $($surface.title.ToLowerInvariant()) to keep the public shipping timeline growing in small, traceable steps."
        area = "frontend"
        status = "live"
        publishedAt = $publishedAt
        tags = @(
            "frontend",
            $surface.tag,
            "cadence"
        )
    }

    $json = ($updateEntry | ConvertTo-Json -Depth 4)
    Write-Utf8File -Path $absolutePath -Content $json

    Invoke-GitCommand -Arguments @("add", ".")
    Invoke-GitCommand -Arguments @("commit", "-m", "feat: add frontend mini update $number")
    Invoke-GitCommand -Arguments @("push", "origin", "main")

    Write-Host "Shipped $id"
}
