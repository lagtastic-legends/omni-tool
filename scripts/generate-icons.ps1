Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path (Get-Location) "public\favicon-192x192.png"
if (-not (Test-Path $sourcePath)) {
    $sourcePath = Join-Path (Get-Location) "public\logo.jpg"
}

$targetDir = Join-Path (Get-Location) "public\icons"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$sizes = @(48, 72, 96, 128, 192, 256, 384, 512)

$srcImg = [System.Drawing.Image]::FromFile($sourcePath)

foreach ($size in $sizes) {
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $destImage = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $destImage.SetResolution($srcImg.HorizontalResolution, $srcImg.VerticalResolution)

    $graphics = [System.Drawing.Graphics]::FromImage($destImage)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $wrapMode = New-Object System.Drawing.Imaging.ImageAttributes
    $wrapMode.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)

    $graphics.DrawImage($srcImg, $destRect, 0, 0, $srcImg.Width, $srcImg.Height, [System.Drawing.GraphicsUnit]::Pixel, $wrapMode)
    $graphics.Dispose()

    $outPath = Join-Path $targetDir "icon-$size.png"
    $destImage.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destImage.Dispose()

    Write-Host "Generated: $outPath ($size x $size)"
}

$srcImg.Dispose()
Write-Host "All PWA icons generated successfully."
