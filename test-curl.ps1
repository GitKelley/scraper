# Simple curl test for VRBO
$url = "https://www.vrbo.com/3334535?chkin=2025-12-30&chkout=2026-01-03"

Write-Host "Testing URL: $url" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Content Length: $($response.Content.Length)" -ForegroundColor Green
    
    # Search for amenities-related content
    $content = $response.Content
    $matches = $content | Select-String -Pattern "content-item|uitk-text.uitk-type-300" -AllMatches
    Write-Host "`nFound $($matches.Matches.Count) matches" -ForegroundColor Yellow
    
    if ($matches.Matches.Count -gt 0) {
        Write-Host "`nFirst 5 matches:" -ForegroundColor Cyan
        $matches.Matches | Select-Object -First 5 | ForEach-Object {
            Write-Host "  $($_.Value)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}

