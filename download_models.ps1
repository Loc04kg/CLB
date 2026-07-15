$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/"
$files = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2"
)

$outDir = "D:\clb\hutech clb\public\models"
if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Force -Path $outDir
}

foreach ($file in $files) {
    $url = $baseUrl + $file
    $outPath = Join-Path $outDir $file
    Write-Host "Downloading $file..."
    Invoke-WebRequest -Uri $url -OutFile $outPath
}
Write-Host "Done."
