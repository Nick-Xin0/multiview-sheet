// ==== 多视图参考表生成模板（图生视频用 / 3840x2160 / 纯黑底 / 无文字）====
// 使用方法：复制本文件到工作目录，只修改下方 CONFIG 区，其余代码不动。
// 改动其余部分前先读 references/extendscript-gotchas.md。

// ==================== CONFIG（只改这里） ====================
var SRC  = "C:/Users/<你的用户名>/Desktop/SUBJECT/SUBJECT/";   // 源图文件夹（正斜杠结尾）
var OUTD = "C:/Users/<你的用户名>/Desktop/SUBJECT/";           // 输出目录（惯例=源文件夹上一级）
var DOCNAME = "MVSUBJECT";                              // 文档名前缀（也是清理残留的匹配串）

// 左侧多视图（正交视图，通常是透明抠图）
var FRONT_FILE = "zhengqian.png";   // 正前
var REAR_FILE  = "zhenghou.png";    // 正后
var SIDE_FILE  = "zhengce.png";     // 正侧（应与俯视朝向一致，通常车头朝左）
var TOP_FILE   = "zhengding.png";   // 俯视（竖版源图）
var TOP_ROT    = 90;                // +90=顺时针 / -90=逆时针，目标：转完车头朝向与侧视一致（预览后复核！）

// 右侧细节图 2x3（通常是黑底棚拍不透明图），顺序：整体、侧棚拍、特写x4
var RIGHT_GRID = [
    {f:"zhengti.png",  n:"R1 整体棚拍"},
    {f:"zhengce.png",  n:"R2 侧视棚拍"},
    {f:"chetou.png",   n:"R3 车头特写"},
    {f:"chewei.png",   n:"R4 车尾特写"},
    {f:"chelun.png",   n:"R5 轮毂细节"},
    {f:"logo.png",     n:"R6 前脸细节"}
];

var OUT_PSD = "多视图参考表_视频版_3840x2160.psd";
var OUT_PNG = "多视图参考表_视频版_3840x2160.png";
// ==================== CONFIG 结束 ====================

app.preferences.rulerUnits = Units.PIXELS;
app.preferences.typeUnits = TypeUnits.PIXELS;

var W = 3840, H = 2160;

// 清理上次运行残留
for (var d = app.documents.length - 1; d >= 0; d--) {
    if (app.documents[d].name.indexOf(DOCNAME) === 0) {
        app.documents[d].close(SaveOptions.DONOTSAVECHANGES);
    }
}

function sc(hexv){
    var c = new SolidColor();
    c.rgb.red   = parseInt(hexv.substr(1,2),16);
    c.rgb.green = parseInt(hexv.substr(3,2),16);
    c.rgb.blue  = parseInt(hexv.substr(5,2),16);
    return c;
}
function px(v){ try { return v.as('px'); } catch(e) { return Number(v); } }

var doc = app.documents.add(W, H, 72, DOCNAME + "Sheet", NewDocumentMode.RGB, DocumentFill.WHITE);

// 贴图：打开源图 -> 复制入画布 -> 按 bounds(内容边界,自动忽略透明边距) 缩放对位
function placeInto(fileName, box, opts){
    opts = opts || {};
    var sd = app.open(new File(SRC + fileName));
    var nl = sd.activeLayer.duplicate(doc, ElementPlacement.PLACEATBEGINNING);
    sd.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument = doc;
    nl.name = opts.name || fileName;
    var b = nl.bounds;
    var w = px(b[2]) - px(b[0]), h = px(b[3]) - px(b[1]);
    var s = Math.min(box.w / w, box.h / h) * 100;
    if (opts.capH) s = Math.min(s, opts.capH / h * 100);
    nl.resize(s, s, AnchorPosition.MIDDLECENTER);
    if (opts.rot) nl.rotate(opts.rot, AnchorPosition.MIDDLECENTER);
    b = nl.bounds;
    var l = px(b[0]), t = px(b[1]), r = px(b[2]), bo = px(b[3]);
    w = r - l; h = bo - t;
    var dx = box.x + box.w / 2 - (l + r) / 2;
    var dy = (opts.fit === "bottom") ? (box.y + box.h - bo) : (box.y + box.h / 2 - (t + bo) / 2);
    nl.translate(dx, dy);
    if (opts.group) nl.move(opts.group, ElementPlacement.INSIDE);
    return nl;
}

var gBg  = doc.layerSets.add(); gBg.name  = "背景 Background";
var gImg = doc.layerSets.add(); gImg.name = "图片 Images";

// 纯黑底
var base = gBg.artLayers.add();
base.kind = LayerKind.NORMAL;
base.name = "纯黑底 Pure Black";
doc.activeLayer = base;
doc.selection.select([[-2,-2],[W+2,-2],[W+2,H+2],[-2,H+2]]);
doc.selection.fill(sc("#000000"));
doc.selection.deselect();

// ===== 左侧：多视图 =====
// 上排：正前 | 正后，capH 500，底边对齐同一地平线
placeInto(FRONT_FILE, {x:80,   y:120, w:860, h:620}, {capH:500, fit:"bottom", name:"L1 正前", group:gImg});
placeInto(REAR_FILE,  {x:1020, y:120, w:860, h:620}, {capH:500, fit:"bottom", name:"L2 正后", group:gImg});
// 中排：正侧通栏
placeInto(SIDE_FILE,  {x:80, y:820, w:1800, h:430}, {name:"L3 正侧", group:gImg});
// 下排：俯视（旋转至车头朝向与侧视一致后，适配 1800x710）
var topL = placeInto(TOP_FILE, {x:0, y:0, w:1000, h:1000}, {rot: TOP_ROT, name:"L4 俯视", group:gImg});
var tb = topL.bounds;
var tw = px(tb[2]) - px(tb[0]), th = px(tb[3]) - px(tb[1]);
var ts = Math.min(1800 / tw, 710 / th) * 100;
topL.resize(ts, ts, AnchorPosition.MIDDLECENTER);
tb = topL.bounds;
topL.translate(80 + 1800/2 - (px(tb[0]) + px(tb[2]))/2,
               1330 + 710/2  - (px(tb[1]) + px(tb[3]))/2);

// ===== 右侧：细节图 2x3 =====
var gx0 = 1960, gW = 1800, gGap = 40;
var cw = (gW - gGap) / 2;
var chh = (1920 - 2*gGap) / 3;
for (var gi=0; gi<RIGHT_GRID.length && gi<6; gi++){
    var col = gi % 2, row = Math.floor(gi / 2);
    placeInto(RIGHT_GRID[gi].f,
        {x: gx0 + col*(cw+gGap), y: 120 + row*(chh+gGap), w: cw, h: chh},
        {name: RIGHT_GRID[gi].n, group: gImg});
}

// ===== 保存 =====
var outDir = new Folder(OUTD);
if(!outDir.exists) outDir.create();

var psdOpt = new PhotoshopSaveOptions();
psdOpt.layers = true; psdOpt.embedColorProfile = true;
doc.saveAs(new File(outDir.fsName + "/" + OUT_PSD), psdOpt, true);

var pngOpt = new PNGSaveOptions();
pngOpt.interlaced = false;
doc.saveAs(new File(outDir.fsName + "/" + OUT_PNG), pngOpt, true);

"SHEET_DONE|layers=" + doc.layers.length;
