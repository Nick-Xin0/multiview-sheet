# ExtendScript / Photoshop 自动化踩坑记录

这套模板在 PS 2026 (27.1) 上实测验证过，以下坑都已绕开，改动时别退回旧写法。

## 选择区与填充

- `selection.select(bounds, ShapeType.ELLIPSE, ...)` —— **ShapeType 枚举不存在**，会报"未定义"。椭圆选区用 ActionManager（模板里的 `ellSel()`，等效椭圆选框工具）。
- `selection.fill(color, BlendMode.NORMAL, opacity, false)` —— 显式传 BlendMode 枚举报"参数 2 枚举值类型错误"。**只用单参**：`selection.fill(color)` / `selection.stroke(color, width)`，不透明度改设在图层上（`layer.opacity`），反而更利于编辑。
- `ShapeOperation.SHAPE` 赋给 SubPathInfo 报"无效枚举值"；`k in enumObj`、`typeof` 探测枚举也会炸。路径 API 全程别碰。

## Trim 与透明边距

- `artLayer.trim()` 不是函数；ActionManager 的 `"Trm "`（文档级修整）也会报"命令当前不可用"。
- **不需要 Trim**：`layer.bounds` 返回的就是非透明内容的紧凑边界，基于 bounds 做缩放（`resize`）和平移（`translate`）即自动忽略透明边距。模板的 `placeInto()` 全部依赖这一点。

## 图层操作

- 跨文档复制：`srcDoc.activeLayer.duplicate(targetDoc, ElementPlacement.PLACEATBEGINNING)`，随后必须 `app.activeDocument = targetDoc` 再继续操作，最后 `srcDoc.close(SaveOptions.DONOTSAVECHANGES)`。
- 旋转：`layer.rotate(angle, AnchorPosition.MIDDLECENTER)`，转完重读 bounds 再定位。
- 图层移入组：`layer.move(layerSet, ElementPlacement.INSIDE)`。组的堆叠顺序 = 创建顺序，后创建的在上面；模板按 背景 → 图片 → 版面框线 → 文字 的顺序建组。
- 半透明/带 alpha 的图（如 alpha_min 200+ 的"伪不透明"）直接按不透明处理即可。

## 编码与执行

### Windows（COM）

- JSX 文件含中文时用 UTF-8（带不带 BOM 均可），PowerShell 侧必须 `ReadAllText(path, UTF8)` 后走 COM `app.DoJavaScript(code)`，中文字符经 unicode 变体传递安全。
- PowerShell 里 `New-Object -ComObject Photoshop.Application` 会自动拉起 PS（冷启动约 10-30s），COM 测试脚本要给足超时（120s+），整表生成给 300-600s。
- 报错格式为"错误 N: ... 直线: M -> 代码"，N=8800/1320/1243 一类基本都对应上面的枚举/命令坑。

### macOS（AppleScript）

- 执行器 `scripts/run_jsx.sh` → `osascript scripts/run_jsx.applescript <jsx>`，底层是 Photoshop 字典命令 `do javascript`（等价 COM `DoJavaScript`）。已验证 PS 2026 / **27.10.0**、macOS 27.0.1 可用。
- **必须在文件沙箱外运行**。在 DSH 沙箱内调用时，AppleScript 事件会被 Photoshop 拒绝，报 `Photoshop 报错 (-10004): …發生越權取用的錯誤。 (-2700)`。命令要在 `danger-full-access` 下重跑。
- **错误文本会丢**：`do javascript` 抛错时经 AppleScript 通道回传的消息一律变成 `?`，只剩数字码（中文、英文都一样）。因此**别依赖 macOS 端的错误消息**，要看行号就得靠下面的包装。
- 执行器默认把 JSX 包进 `try { … } catch (__e) { "__JSX_THROW__|" + (__e.line-1) + "|" + __e.name + "|" + __e.message }`：运行时错误改走**无损的返回值通道**，能带回真实源文件行号与完整中文消息。语法/编译错误发生在包装生效前，仍是 `8800` + `?`。
- `__e.line` 是包装后文本里的行号，已按前置的 `try {` 行做 `-1` 修正；改动包装行数时必须同步改这个偏移。
- 脚本含 `#target` / `#include` 等预处理指令时包装会破坏其"必须位于文件首行"的要求，执行器会自动检测并跳过包装（也可用 `MV_NO_WRAP=1` 强制关闭）。
- AppleScript 侧显式设了 `with timeout of 1800 seconds`（默认 120s 不够冷启动 + 整表生成）。
- 返回值通道是 UTF-8 无损的（中文、emoji 均正常），只有错误通道有损——这是包装方案成立的前提。
- Photoshop 冷启动可由执行器自行完成（实测约 5s，首次全新启动更久）；`PHOTOSHOP_BUNDLE_ID` 可指定 bundle id，默认 `com.adobe.Photoshop`。

## 布局常量（3840x2160 版式）

- 左区 x 80..1880：正前/正后各 860 宽、capH 500、`fit:"bottom"` 地平线对齐（y=120..740）；正侧通栏 1800x430（y=820）；俯视转正后放进 1800x710（y=1330）。
- 右区 x 1960..3760：2 列 x 3 行，格 880x613、间距 40。
- 俯视旋转方向口诀：预览里俯视车头与侧视车头**必须同向**，不一致就翻转 TOP_ROT 的符号重跑。
