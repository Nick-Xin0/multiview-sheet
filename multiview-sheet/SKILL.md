---
name: multiview-sheet
description: 用 Photoshop 脚本把一个主体的多视角图片文件夹排版成图生视频用的多视图参考表（3840x2160 16:9、无文字、纯黑底、左侧多视图右侧细节图）。当用户给出一个图片文件夹并要求生成"多视图/多视角参考表、模型表、turnaround sheet、三视图排版"，或提到图生视频/视频生成的主体参考图时使用——即使用户只是说"帮我把这个文件夹的图排成一张图"。
---

# 多视图参考表生成（图生视频用）

把一个主体（车辆/产品/角色等）的多视角图排成一张 3840x2160 的参考表，供图生视频模型保持主体一致性。

**规格（已验证的默认版式，勿擅自更改）：** 无任何文字；纯黑底 `#000000`（因为细节特写通常是黑底棚拍不透明图，白/灰底会出现黑色方块）；左=正交多视图，右=细节图 2x3；页边距均衡（上/下约120px、左右80px）。

## 前置条件

Photoshop + `uv`（用于跑 Pillow 辅助脚本：素材盘点、预览缩放）。执行器按平台分，**JSX 模板本身跨平台，不用改**：

| 平台 | 执行器 | 要求 |
|---|---|---|
| Windows | `scripts/run_jsx.ps1` | Photoshop CC 2017 ~ 2026，COM 接口 `Photoshop.Application` |
| macOS | `scripts/run_jsx.sh` | Adobe Photoshop（已在 2026 / 27.10 验证），AppleScript `do javascript` |

macOS 额外要求：
- 执行器**必须在文件沙箱之外运行**（DSH 里即 `danger-full-access`）。沙箱内的 AppleScript 事件会被 Photoshop 拒绝，报 `-10004 / 越權取用`。这是硬性限制，重试沙箱内执行没有意义。
- 首次调用会弹「允许 … 控制 Adobe Photoshop」的自动化授权，需允许（系统设置 → 隐私与安全性 → 自动化）。
- 未运行 Photoshop 时执行器会自行冷启动（实测约 5s；首次全新启动更久）。

## 工作流

### 1. 素材盘点

```bash
uv run --with pillow python "<技能目录>/scripts/inspect_folder.py" "<主体图片文件夹>" --contact "<输出预览>/_contact.jpg"
```

输出每张图的尺寸/透明度分类（TRANSPARENT / OPAQUE / SEMI）。用 Read 工具查看联系表 jpg，确认：
- 哪些是**正交视图**（正前/正侧/正后/俯视，通常是透明抠图）→ 分到左侧
- 哪些是**细节/棚拍图**（不透明黑底）→ 分到右侧
- 俯视图的**车头朝向**（上/下）——决定旋转方向，第 4 步预览后必须复核

透明度分类只是辅助：最终以内容判断归属（比如带 alpha 但实质不透明的图当 OPAQUE 用）。

### 2. 生成脚本

复制 `assets/sheet_template.jsx` 到工作目录（如 `<工作区>/_build/make_<主体名>.jsx`），只改文件顶部的 **CONFIG 区**：`SRC`（源图文件夹，正斜杠）、`OUTD`（输出目录，惯例用图片文件夹的**上一级**）、`DOCNAME`、左侧四个视图的文件名与 `TOP_ROT`（+90 顺时针 / -90 逆时针）、右侧 6 格明细。

`SRC`/`OUTD` 用**绝对路径 + 正斜杠**，两个平台都吃（macOS 例：`/Users/me/Desktop/1211/1211/`）。

改 CONFIG 前先读 `references/extendscript-gotchas.md`（这套模板踩过的坑，别绕开模板里的 helper 另起炉灶）。

### 3. 在 Photoshop 中执行

Windows：

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File "<技能目录>/scripts/run_jsx.ps1" "<jsx绝对路径>"
```

macOS：

```bash
bash "<技能目录>/scripts/run_jsx.sh" "<jsx绝对路径>"
```

成功返回 `SHEET_DONE|layers=N`；失败返回**非 0 退出码**并打印 `JSX ERROR: <原因>` 后按 gotchas 排查。两个执行器输出格式一致，判读方式相同。

macOS 端的报错能力：
- **运行时错误**：执行器已内置 `try/catch` 包装，错误改走无损返回值通道，能拿到**真实源文件行号 + 完整中文消息**，例如 `JSX ERROR: ExtendScript 在源文件第 42 行抛出 Error: …`。
- **语法/编译错误**：发生在包装生效前，只能拿到代码 `8800`，错误文本会被 AppleScript 通道丢成 `?`——先单独核对 JSX 语法。
- 需要原样执行（脚本含 `#target`/`#include` 等预处理指令）时设 `MV_NO_WRAP=1`，此时会跳过包装、自动退回数字码报错。

### 4. 预览校验（必做，常需一轮修正）

PNG 约 20MB+，超出部分工具的图片读取限制，先缩小再查：

```bash
uv run --with pillow python -c "
from PIL import Image
im = Image.open('<输出>/多视图参考表_视频版_3840x2160.png')
im.convert('RGB').resize((1600,900), Image.LANCZOS).save('<输出>/_preview.jpg', quality=88)"
```

（路径用正斜杠，Windows/macOS 通用；Windows 的 `C:\...` 也写成 `C:/...`。）

用 Read 检查清单：
- **俯视图车头朝向与侧视图一致**（最容易错的一项，错了就翻转 TOP_ROT 符号重跑）
- 无文字残留；纯黑底上不透明图边缘无可见接缝
- 左排正前/正后底边是否对齐同一地平线
- 页边距是否均衡
- 源图自带的水印/标注箭头无法去除，如发现应告知用户（需修补/重渲染）

### 5. 交付

输出目录下 `多视图参考表_视频版_3840x2160.psd`（分层，图层按 L1-L4/R1-R6 命名）+ `.png`（直接可喂给视频工具）。PNG 超过 20MB 时提醒用户可压一版高画质 JPG。

## 变体需求处理

- 用户要**带文字的设计版**（标题/标签/特征清单排版）：参考 `assets/sheet_design_text_version.jsx`（真实项目示例，仅借鉴其文字排版与卡片画法，CONFIG 路径需替换）
- 用户改**底色/画布尺寸/网格数**：只动 CONFIG 和常量区，布局逻辑不变
