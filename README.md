# multiview-sheet · 图生视频多视图参考表生成技能

一个 [ZCode](https://zcode.ai) Agent Skill：把一个主体（车辆/产品/角色等）的多视角图片文件夹，自动排版成一张 3840×2160（4K 16:9）的**多视图参考表**，供可灵、即梦等图生视频模型保持主体一致性。

An agent skill that arranges a folder of subject multi-view renders into a single 4K 16:9 reference sheet for image-to-video models — driven entirely through Photoshop scripting (ExtendScript, dispatched via COM on Windows or AppleScript on macOS).

## 版式规格（已验证）

- **3840×2160 · 16:9 · 纯黑底**（兼容黑底棚拍不透明特写与透明抠图，无缝融合）
- **无任何文字**（视频规范版）；带文字的设计版脚本也附在技能内
- **左侧多视图**：正前 + 正后（capH 等高、底边对齐同一地平线）→ 正侧通栏 → 俯视（自动旋转，车头朝向与侧视一致）
- **右侧细节图**：2×3 网格（整体/侧棚拍/特写×4）
- 页边距均衡：上下 ~120px、左右 80px
- 输出：分层 **PSD**（图层按 L1-L4 / R1-R6 命名）+ **PNG**

## 安装

把 `multiview-sheet/` 整个文件夹复制到技能目录即可：

```bash
# 个人级（所有工作区可用）
git clone https://github.com/Nick-Xin0/multiview-sheet.git
mkdir -p ~/.dsh/skills          # DeepSeek Harness；ZCode/兼容 agent 用 ~/.agents/skills
cp -r multiview-sheet/multiview-sheet ~/.dsh/skills/
chmod 755 ~/.dsh/skills/multiview-sheet/scripts/run_jsx.sh
```

技能目录被 watcher 监视，落盘即生效无需重启；也可用 `/multiview-sheet` 手动加载。

## 依赖

| 依赖 | 说明 |
|---|---|
| Adobe Photoshop | CC 2017 ~ 2026（Windows 侧在 PS 2026 / 27.1 验证；macOS 侧在 PS 2026 / 27.10 验证） |
| [uv](https://docs.astral.sh/uv/) | 运行 Pillow 辅助脚本（素材盘点、预览缩放） |
| Windows **或** macOS | 见下方平台支持；JSX 模板本身跨平台，不用改 |

## 平台支持

| 平台 | 执行器 | 机制 |
|---|---|---|
| Windows | `scripts/run_jsx.ps1` | COM `Photoshop.Application.DoJavaScript` |
| macOS | `scripts/run_jsx.sh` + `run_jsx.applescript` | AppleScript `do javascript` |

两个执行器输出格式一致（成功打印 `JSX RESULT: SHEET_DONE|layers=N`，失败退出码非 0 并打印 `JSX ERROR:`），SKILL.md 的判读方式通用。

macOS 侧有两个已实测确认的坑，执行器已内置对应诊断：

1. **必须在文件沙箱之外执行。** 沙箱内的 AppleScript 事件会被 Photoshop 拒绝，报 `Photoshop 报错 (-10004): …發生越權取用的錯誤。 (-2700)`。在 DeepSeek Harness 里即用 `danger-full-access` 运行。
2. **AppleScript 的错误通道会把错误文本丢成 `?`**（中英文一样，只剩数字码）。因此执行器默认把 JSX 包进 `try/catch`，让运行时错误改走**无损的返回值通道**，从而带回真实源文件行号与完整中文消息；语法/编译错误发生在包装生效前，仍是 `8800`。需要原样执行可设 `MV_NO_WRAP=1`。

首次调用会弹「允许 … 控制 Adobe Photoshop」的自动化授权，需允许。Photoshop 未运行时可被自动冷启动。

## 使用示例

对 Agent 说：

> "C:\Users\me\Desktop\1211\1211 这个文件夹帮我排一张图生视频用的多视图"

> "/Users/me/Desktop/1211/1211 这个文件夹帮我排一张图生视频用的多视图"

或手动：`/multiview-sheet C:\path\to\folder`（macOS：`/multiview-sheet /path/to/folder`）

Agent 会自动执行：**素材盘点**（尺寸/透明度分类 + 联系表识图）→ **生成脚本**（复制模板改 CONFIG）→ **驱动 Photoshop 排版导出**（Windows 走 COM / macOS 走 AppleScript）→ **预览自检**（俯视图朝向、地平线对齐、页边距）→ **交付 PSD + PNG**。

`SRC`/`OUTD` 一律用**绝对路径 + 正斜杠**，两个平台通用（Windows 的 `C:\...` 写成 `C:/...`）。

## 文件结构

```
multiview-sheet/
├── SKILL.md                              # 工作流主文档
├── references/
│   └── extendscript-gotchas.md           # Photoshop 脚本化踩坑记录（枚举/Trim/fill 等 + macOS 执行坑）
├── scripts/
│   ├── inspect_folder.py                 # 素材盘点：透明度分类 + 联系表（跨平台）
│   ├── run_jsx.ps1                       # Windows 执行器（COM DoJavaScript）
│   ├── run_jsx.sh                        # macOS 执行器（含 try/catch 包装与诊断）
│   └── run_jsx.applescript               # macOS 桥：AppleScript do javascript
└── assets/
    ├── sheet_template.jsx                # 视频规范版生成器（CONFIG 化，改顶部即可复用）
    └── sheet_design_text_version.jsx     # 带文字设计版真实项目示例（借鉴排版技法用）
```

## 已知注意事项

- 每个新主体的**俯视图源朝向**可能不同（车头朝上/朝下），生成后必须预览核对与侧视图方向是否一致，错了翻转 `TOP_ROT` 符号重跑
- 源渲染图里自带的标注（箭头/水印）无法脚本去除
- 4K PNG 约 20MB+，部分视频工具有上传大小限制，可压一版高画质 JPG
- macOS：执行器必须在文件沙箱之外运行，且运行时错误依赖 `try/catch` 包装才能拿到行号（详见[平台支持](#平台支持)）
- `assets/sheet_design_text_version.jsx` 是真实项目产物的示例，其 `SRC`/`OUTD` 仍是原作者本机路径，复用时需替换

## License

[MIT](LICENSE)
