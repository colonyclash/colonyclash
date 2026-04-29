$arr = [System.IO.File]::ReadAllBytes('game.js')
Write-Host "Byte 0: $($arr[0])"
Write-Host "Byte 1: $($arr[1])"
Write-Host "Byte 2: $($arr[2])"
Write-Host "Byte 3: $($arr[3])"
Write-Host "Total bytes: $($arr.Length)"
