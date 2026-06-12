# Bake EXIF orientation into the pixels of a JPEG so it is physically upright.
# Phone photos are often stored sideways with only an orientation tag; tools that
# read raw pixels (like our try-on test) then see them rotated. This fixes that.
#
# Usage (PowerShell, from the project root):
#   .\scripts\fix-rotation.ps1 person.jpg
#
# Overwrites the file in place.
param(
  [Parameter(Mandatory = $true)][string]$Path
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $Path)) { Write-Error "File not found: $Path"; exit 1 }
$full = (Resolve-Path $Path).Path

$bytes = [System.IO.File]::ReadAllBytes($full)
$ms = New-Object System.IO.MemoryStream(, $bytes)
$img = [System.Drawing.Image]::FromStream($ms)

$ORIENT = 274  # EXIF orientation property id (0x0112)
$rotated = $false
if ($img.PropertyIdList -contains $ORIENT) {
  $o = $img.GetPropertyItem($ORIENT).Value[0]
  switch ($o) {
    3 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone); $rotated = $true }
    6 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone);  $rotated = $true }
    8 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone); $rotated = $true }
  }
  if ($rotated) { $img.RemovePropertyItem($ORIENT) }
}

$img.Save($full, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$img.Dispose(); $ms.Dispose()

if ($rotated) { "Rotated upright and saved: $Path" } else { "Already upright (no EXIF rotation needed): $Path" }
