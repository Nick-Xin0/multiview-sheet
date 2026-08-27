# 在 Photoshop 中执行 ExtendScript 脚本（经 COM DoJavaScript）
# 用法: powershell -NoProfile -ExecutionPolicy Bypass -File run_jsx.ps1 <jsx绝对路径>
$ErrorActionPreference = 'Stop'
$app = New-Object -ComObject Photoshop.Application
$jsxPath = $args[0]
$code = [System.IO.File]::ReadAllText($jsxPath, [System.Text.Encoding]::UTF8)
try {
    $result = $app.DoJavaScript($code)
    Write-Host ("JSX RESULT: " + $result)
} catch {
    Write-Host ("JSX ERROR: " + $_.Exception.Message)
    if ($_.Exception.InnerException) { Write-Host ("INNER: " + $_.Exception.InnerException.Message) }
}
