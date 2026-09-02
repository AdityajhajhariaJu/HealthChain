$source = "C:\Users\adity\Downloads\Happy High Energy"
$dest = "C:\Users\adity\OneDrive\Desktop\HealthChain-Live\public\audio"

$mapping = @{
    "Harvest High (Instrumental).m4a" = "Harvest High.m4a"
    "Instrumental.m4a" = "Timber and Bloom.m4a"
    "Instrumental Version.m4a" = "Sunday Citrus.m4a"
    "Good Ground (Instrumental).m4a" = "Good Ground.m4a"
    "Instrumental Version (1).m4a" = "Personal Best.m4a"
    "Blinding White (Instrumental).m4a" = "Blinding White.m4a"
    "First Light Surge (Instrumental).m4a" = "First Light Surge.m4a"
    "Instrumental Version (2).m4a" = "Line By Line.m4a"
    "Instrumental (1).m4a" = "Clean Slate Sky.m4a"
    "Morning Letting Go (Instrumental).m4a" = "Morning Letting Go.m4a"
    "Instrumental Version (3).m4a" = "First Light Run.m4a"
    "Instrumental (2).m4a" = "Wide Awake Now.m4a"
    "Won Before Sunrise (Instrumental).m4a" = "Won Before Sunrise.m4a"
    "Instrumental Version (4).m4a" = "Afternoon Is Mine.m4a"
    "Instrumental (3).m4a" = "Cold Water Shock.m4a"
}

foreach ($key in $mapping.Keys) {
    Copy-Item -Path "$source\$key" -Destination "$dest\$($mapping[$key])" -Force
}
Write-Output "Copied and renamed files!"
