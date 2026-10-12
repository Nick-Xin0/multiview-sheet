-- 在 macOS 的 Photoshop 中执行 ExtendScript 脚本（经 AppleScript do javascript）
-- 用法: osascript run_jsx.applescript <jsx绝对路径>
-- 成功: 输出 JSX 的返回值（如 SHEET_DONE|layers=N）
-- 失败: 以非零状态退出并输出 "JSX ERROR: ..."（由 run_jsx.sh 转发）
--
-- 说明:
--   * Photoshop 的 AppleScript 字典命令 `do javascript` 等价于 Windows 侧的 COM DoJavaScript。
--   * 冷启动 Photoshop 约 10-30s，整表生成可达 300-600s，故显式放大 AppleScript 超时。
--   * 代码经 AppleScript 文本变量传递，中文字符走 UTF-8，避免命令行转义问题。

on run argv
	set jsxPath to item 1 of argv

	-- 以 UTF-8 读取；JSX 含中文时必须显式指定编码
	try
		set jsxCode to read (POSIX file jsxPath) as «class utf8»
	on error errMsg number errNum
		error "无法读取 JSX 文件 " & jsxPath & " (" & errNum & ": " & errMsg & ")"
	end try

	with timeout of 1800 seconds
		tell application id "com.adobe.Photoshop"
			try
				set res to do javascript jsxCode
			on error errMsg number errNum
				-- 保留 ExtendScript 的行号信息，便于按 references/extendscript-gotchas.md 排查
				error "Photoshop 报错 (" & errNum & "): " & errMsg
			end try
		end tell
	end timeout

	if res is missing value then
		return "__JSX_NO_RESULT__"
	end if
	return res as text
end run
