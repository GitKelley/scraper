# Test script for the rental scraper API

# Test 1: Health check
Write-Host "Testing health endpoint..." -ForegroundColor Cyan
$health = Invoke-WebRequest -Uri "http://localhost:3000/health" | Select-Object -ExpandProperty Content
Write-Host $health -ForegroundColor Green
Write-Host ""

# Test 2: Scrape a rental
Write-Host "Testing scrape endpoint with VRBO URL..." -ForegroundColor Cyan
$body = @{
    url = "https://www.vrbo.com/3334535?chkin=2025-12-30&chkout=2026-01-03&d1=2025-12-30&d2=2026-01-03&startDate=2025-12-30&endDate=2026-01-03&x_pwa=1&rfrr=HSR&pwa_ts=1762737145967&referrerUrl=aHR0cHM6Ly93d3cudnJiby5jb20vSG90ZWwtU2VhcmNo&useRewards=false&adults=10&regionId=553248635976433973&destination=Avery%20County%2C%20North%20Carolina%2C%20United%20States%20of%20America&destType=MARKET&neighborhoodId=975495197446537216&latLong=36.087348%2C-81.927336&nightly_price=1101%2C-2&location_group=mountains_location&privacyTrackingState=CAN_TRACK&productOffersId=ec005c3f-a9c5-4487-b2c3-1a86af83663e&searchId=fe7e2fa5-9746-4d3d-92d5-55d155daa9f6&sort=RECOMMENDED&top_dp=1694&top_cur=USD&userIntent=&selectedRoomType=92503576&selectedRatePlan=00048c5fd8baaf5a44ba870353b388538d59&expediaPropertyId=92503576"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/scrape-rental" -Method POST -Headers @{"Content-Type"="application/json"} -Body $body -TimeoutSec 120
    Write-Host "Success!" -ForegroundColor Green
    Write-Host $response.Content -ForegroundColor Yellow
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

