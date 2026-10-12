#!/usr/bin/env bash
# 在 macOS 的 Photoshop 中执行 ExtendScript（经 AppleScript `do javascript`）
#
# 用法: bash run_jsx.sh <jsx绝对路径>
#
# 退出码:
#   0  成功（已打印 JSX RESULT: <返回值>）
#   1  Photoshop / ExtendScript 报错（已打印 JSX ERROR: <原因>）
#   2  用法或环境错误（文件不存在、未装 Photoshop 等）
#
# 环境变量:
#   PHOTOSHOP_BUNDLE_ID  Photoshop 的 bundle id，默认 com.adobe.Photoshop
#                        （多版本共存且需指定某一版时设置，例如 com.adobe.Photoshop.2026）
#   MV_NO_WRAP=1         关闭 try/catch 包装，原样执行 JSX（脚本含 #target 等预处理指令时用）
#
# ⚠️ 必须在 DSH 文件沙箱之外运行本条命令（danger-full-access）。
#    沙箱内的 AppleScript 事件会被 Photoshop 拒绝，报 -2700「越權取用」。
#
# 对应 Windows 侧脚本: run_jsx.ps1（输出格式一致，SKILL.md 的判读方式通用）

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPLESCRIPT="$SCRIPT_DIR/run_jsx.applescript"
PS_BUNDLE_ID="${PHOTOSHOP_BUNDLE_ID:-com.adobe.Photoshop}"

die() { printf 'JSX ERROR: %s\n' "$1" >&2; exit 2; }

[ $# -ge 1 ] || die "用法: bash run_jsx.sh <jsx绝对路径>"
JSX="$1"
[ -f "$JSX" ] || die "找不到 JSX 文件: $JSX"
[ -f "$APPLESCRIPT" ] || die "缺少 run_jsx.applescript（应与本脚本同目录）: $APPLESCRIPT"

# osascript 的 POSIX file 需要绝对路径
JSX_ABS="$(cd "$(dirname "$JSX")" && pwd)/$(basename "$JSX")"

# Photoshop 是否可见（仅提前给出清晰错误；真正启动由 osascript 触发）
if ! osascript -e "id of app id \"$PS_BUNDLE_ID\"" >/dev/null 2>&1; then
    die "未找到 Photoshop（bundle id: $PS_BUNDLE_ID）。请安装 Adobe Photoshop，或用 PHOTOSHOP_BUNDLE_ID 指定其他版本。"
fi

BOM_TMP=""
RUN_TMP=""

# UTF-8 BOM 在 macOS 侧可能被 ExtendScript 当作非法字符，检测到就去掉
SRC_JSX="$JSX_ABS"
if [ "$(head -c 3 "$JSX_ABS" | xxd -p 2>/dev/null)" = "efbbbf" ]; then
    BOM_TMP="$(mktemp -t mvsheet_bom).jsx"
    tail -c +4 "$JSX_ABS" > "$BOM_TMP"
    SRC_JSX="$BOM_TMP"
    printf 'NOTE: JSX 带 UTF-8 BOM，已改用去 BOM 临时副本执行\n' >&2
fi

# try/catch 包装：macOS 的 AppleScript 错误通道会把错误文本丢成 "?"，只留数字码；
# 包装后运行时错误改走无损的返回值通道，能带回真实行号与中文消息。
# （语法/编译错误发生在包装生效之前，仍只能拿到数字码，详见 references/extendscript-gotchas.md）
WRAP=1
[ "${MV_NO_WRAP:-0}" = "1" ] && WRAP=0
if grep -qE '^[[:space:]]*#' "$SRC_JSX" 2>/dev/null; then
    WRAP=0
    printf 'NOTE: 检测到 # 预处理指令（#target/#include 等），跳过 try/catch 包装以保证其位于文件首行\n' >&2
fi

if [ "$WRAP" = "1" ]; then
    RUN_TMP="$(mktemp -t mvsheet_run).jsx"
    {
        printf 'try {\n'
        cat "$SRC_JSX"
        printf '\n} catch (__e) {\n'
        printf '  "__JSX_THROW__|" + (__e.line ? (__e.line - 1) : "?") + "|" + (__e.name || "Error") + "|" + (__e.message || String(__e));\n'
        printf '}\n'
    } > "$RUN_TMP"
    RUN_JSX="$RUN_TMP"
else
    RUN_JSX="$SRC_JSX"
fi

RAW="$(osascript "$APPLESCRIPT" "$RUN_JSX" 2>&1)"
STATUS=$?
[ -n "$RUN_TMP" ] && rm -f "$RUN_TMP"
[ -n "$BOM_TMP" ] && rm -f "$BOM_TMP"

# 桥路本身的失败（权限/超时/冷启动/语法错误）走这里
if [ "$STATUS" -ne 0 ]; then
    # 去掉 osascript 的 "脚本路径:行:列: execution error: " 前缀，只留 Photoshop 的报错
    CLEAN="${RAW##*execution error: }"
    printf 'JSX ERROR: %s\n' "$CLEAN" >&2
    # 注意: Photoshop 的 AppleScript 报错尾部一律带 "(-2700)"，不能用它判断原因，
    #       只能看 osascript 暴露的错误号（8800=编译错误 / -10004=权限拒绝）。
    case "$CLEAN" in
        *-1743*|*"Not authorized"*|*"not allowed"*|*"不允许"*)
            printf 'HINT: 缺少自动化权限。到 系统设置 → 隐私与安全性 → 自动化，勾选运行本脚本的宿主 App（终端 / DSH）控制 "Adobe Photoshop"。\n' >&2 ;;
        *8800*)
            printf 'HINT: 8800 = ExtendScript 语法/编译错误，发生在 try/catch 包装生效之前，因此拿不到行号与消息（错误文本被 AppleScript 通道丢成 "?"）。请先单独核对 JSX 语法。\n' >&2 ;;
        *-10004*|*"越權"*|*"越权"*|*"privilege"*)
            printf 'HINT: Photoshop 拒绝执行（越权）。最常见原因是本条命令跑在 DSH 文件沙箱内——AppleScript 事件会被拒，请在沙箱外（danger-full-access）重跑。\n' >&2 ;;
        *-600*|*"not running"*|*"未运行"*)
            printf 'HINT: Photoshop 没能被拉起，请手动打开一次 Photoshop 后重试。\n' >&2 ;;
        *-1708*|*"timed out"*|*"超时"*)
            printf 'HINT: AppleScript 超时。冷启动或大表生成较慢，可重试；必要时调大 run_jsx.applescript 里 with timeout 的秒数。\n' >&2 ;;
    esac
    exit 1
fi

# try/catch 捕获到的运行时错误：从返回值里还原真实行号与消息
case "$RAW" in
    "__JSX_THROW__|"*)
        DETAIL="${RAW#__JSX_THROW__|}"
        LINE="${DETAIL%%|*}"; REST="${DETAIL#*|}"
        NAME="${REST%%|*}"; MSG="${REST#*|}"
        printf 'JSX ERROR: ExtendScript 在源文件第 %s 行抛出 %s: %s\n' "$LINE" "$NAME" "$MSG" >&2
        printf 'HINT: 对照 references/extendscript-gotchas.md 检查该行附近的枚举/命令写法（8800/1320/1243 一类多为已知坑）。\n' >&2
        exit 1 ;;
esac

printf 'JSX RESULT: %s\n' "$RAW"

# Photoshop 会把 ExtendScript 的 undefined 转成字面量 "undefined" 回传
case "$RAW" in
    "__JSX_NO_RESULT__"|"undefined"|"null"|"")
        printf 'WARN: JSX 正常结束但没有返回值；模板脚本应返回 SHEET_DONE|layers=N，请确认脚本末尾有返回值。\n' >&2
        exit 0 ;;
esac

# 返回值以错误标记开头时按失败处理（Windows 侧 COM 只把错误塞进返回值，不抛异常）
case "$RAW" in
    "JSX ERROR"*|"Error "*|"错误 "*)
        printf 'JSX ERROR: Photoshop 在返回值中报告了错误，详见上方内容\n' >&2
        exit 1 ;;
esac

exit 0
