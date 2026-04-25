$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add('http://localhost:8080/')
$listener.Start()
Write-Host "Colony Clash server on http://localhost:8080  (Ctrl+C para parar)"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css'
  '.js'   = 'text/javascript'
  '.png'  = 'image/png'
  '.ico'  = 'image/x-icon'
  '.md'   = 'text/plain'
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response

  $localPath = $req.Url.LocalPath
  if ($localPath -eq '/') { $localPath = '/index.html' }
  $file = Join-Path 'C:\Users\59598\Downloads\assets' ($localPath.TrimStart('/').Replace('/', '\'))
  $ext  = [System.IO.Path]::GetExtension($file).ToLower()
  $type = if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' }

  try {
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $res.ContentType     = $type
    $res.ContentLength64 = $bytes.Length
    $res.Headers.Add('Cache-Control', 'no-cache')
    $res.Headers.Add('Access-Control-Allow-Origin', '*')
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    Write-Host "200 $localPath"
  } catch {
    $msg   = [System.Text.Encoding]::UTF8.GetBytes("404 - Not Found: $localPath")
    $res.StatusCode      = 404
    $res.ContentType     = 'text/plain'
    $res.ContentLength64 = $msg.Length
    $res.OutputStream.Write($msg, 0, $msg.Length)
    Write-Host "404 $localPath"
  }
  $res.OutputStream.Close()
}
