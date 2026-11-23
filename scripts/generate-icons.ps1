# Genera los iconos de la extensión (public/icon/*.png) sin dependencias externas.
# Uso: powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1

Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot '..\public\icon'
New-Item -ItemType Directory -Force -Path $out | Out-Null

function New-RoundedPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

$ink = [System.Drawing.ColorTranslator]::FromHtml('#2C2720')
$cream = [System.Drawing.ColorTranslator]::FromHtml('#F8F2E4')
$rule = [System.Drawing.ColorTranslator]::FromHtml('#D8CBB2')
$accent = [System.Drawing.ColorTranslator]::FromHtml('#B1532C')

foreach ($size in 16, 32, 48, 96, 128) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $s = $size / 128.0

  # Hoja de papel
  $paper = New-RoundedPath (7 * $s) (5 * $s) (114 * $s) (118 * $s) (15 * $s)
  $paperBrush = New-Object System.Drawing.SolidBrush($cream)
  $g.FillPath($paperBrush, $paper)
  $pen = New-Object System.Drawing.Pen($ink, [float](4.2 * $s))
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawPath($pen, $paper)

  # Renglones
  $linePen = New-Object System.Drawing.Pen($rule, [float](4.4 * $s))
  $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  foreach ($y in 88, 104) {
    $g.DrawLine($linePen, [float](27 * $s), [float]($y * $s), [float](74 * $s), [float]($y * $s))
  }

  # Pluma
  $nib = New-Object System.Drawing.Drawing2D.GraphicsPath
  $nib.AddPolygon(@(
      (New-Object System.Drawing.PointF([float](82 * $s), [float](20 * $s))),
      (New-Object System.Drawing.PointF([float](105 * $s), [float](43 * $s))),
      (New-Object System.Drawing.PointF([float](63 * $s), [float](91 * $s))),
      (New-Object System.Drawing.PointF([float](35 * $s), [float](101 * $s))),
      (New-Object System.Drawing.PointF([float](42 * $s), [float](72 * $s)))
    ))
  $nibBrush = New-Object System.Drawing.SolidBrush($accent)
  $g.FillPath($nibBrush, $nib)
  $g.DrawPath($pen, $nib)

  # Ojo de la plumilla
  $hole = New-Object System.Drawing.SolidBrush($cream)
  $g.FillEllipse($hole, [float](73 * $s), [float](36 * $s), [float](11 * $s), [float](11 * $s))

  $path = Join-Path $out ("{0}.png" -f $size)
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

  $g.Dispose(); $bmp.Dispose()
  $paper.Dispose(); $paperBrush.Dispose(); $pen.Dispose()
  $linePen.Dispose(); $nib.Dispose(); $nibBrush.Dispose(); $hole.Dispose()
}

Write-Host "Iconos generados en $out"
