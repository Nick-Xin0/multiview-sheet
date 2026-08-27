// 【示例文件】带文字的设计版多视图表（真实项目产物，CONFIG 在中部，路径为原作者本机路径，仅供借鉴排版技法）
// 设计版特点：标题栏/编号标签/特征细节清单/细节卡片底条。纯黑底同样适配黑底棚拍图。
// ---- ZCode 多视图参考表生成器 (图生视频用) ----
// 输入：主体多视图图片文件夹；输出：3840x2160 16:9 深色模型参考表
// 纵向布局：头部(90-230) / Hero+俯视+特征(260-1250) / 三视图(1330-1690) / 细节卡片(1770-2150)

app.preferences.rulerUnits = Units.PIXELS;
app.preferences.typeUnits = TypeUnits.PIXELS;

var SRC  = "C:/Users/<你的用户名>/Desktop/1211/1211/";
var OUTD = "C:/Users/<你的用户名>/Desktop/1211/";
var W = 3840, H = 2160;
var GOLD = "#D9A441";

// 清理上次运行残留
for (var d = app.documents.length - 1; d >= 0; d--) {
    if (app.documents[d].name.indexOf("MultiView") === 0) {
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

var doc = app.documents.add(W, H, 72, "MultiViewSheet", NewDocumentMode.RGB, DocumentFill.WHITE);

// ---------- 字体 ----------
function pickFont(psNames){
    try{
        for (var i=0;i<app.fonts.length;i++){
            for(var j=0;j<psNames.length;j++){
                if (app.fonts[i].postScriptName === psNames[j]) return psNames[j];
            }
        }
    }catch(e){}
    return null;
}
var F_REG  = pickFont(["MicrosoftYaHei","MicrosoftYaHeiUI"]);
var F_BOLD = pickFont(["MicrosoftYaHei-Bold","MicrosoftYaHeiUI-Bold"]);
if(!F_REG)  F_REG  = F_BOLD || "";
if(!F_BOLD) F_BOLD = F_REG || "";

// ---------- 基础绘制 ----------
function pixLayer(parent,nm){
    var l = parent.artLayers.add();
    l.kind = LayerKind.NORMAL;
    l.name = nm;
    return l;
}
function rectFill(layer,x,y,w,h,hexv,opac){
    doc.activeLayer = layer;
    doc.selection.select([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
    doc.selection.fill(sc(hexv));
    doc.selection.deselect();
    layer.opacity = opac;
}
function rectStroke(layer,x,y,w,h,sw,hexv,opac){
    doc.activeLayer = layer;
    doc.selection.select([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
    doc.selection.stroke(sc(hexv), sw);
    doc.selection.deselect();
    layer.opacity = opac;
}
function ellSel(x,y,w,h){
    var d1=new ActionDescriptor(), r1=new ActionReference();
    r1.putProperty(charIDToTypeID("Chnl"), charIDToTypeID("fsel"));
    d1.putReference(charIDToTypeID("null"), r1);
    var d2=new ActionDescriptor();
    d2.putUnitDouble(charIDToTypeID("Top "), charIDToTypeID("#Pxl"), y);
    d2.putUnitDouble(charIDToTypeID("Left"), charIDToTypeID("#Pxl"), x);
    d2.putUnitDouble(charIDToTypeID("Btom"), charIDToTypeID("#Pxl"), y+h);
    d2.putUnitDouble(charIDToTypeID("Rght"), charIDToTypeID("#Pxl"), x+w);
    d1.putObject(charIDToTypeID("T   "), charIDToTypeID("Elps"), d2);
    d1.putBoolean(charIDToTypeID("AntA"), true);
    executeAction(charIDToTypeID("setd"), d1, DialogModes.NO);
}
// 去除文档透明边缘（等价 图像 > 修整 > 透明像素，作用于当前文档）
function trimDocTransparent(){
    var d = new ActionDescriptor();
    d.putEnumerated(charIDToTypeID("By"), charIDToTypeID("TrmT"), charIDToTypeID("Trns"));
    executeAction(charIDToTypeID("Trm "), d, DialogModes.NO);
}
function addText(parent,nm,str,size,x,yBaseline,hexv,opac,bold,trk,just){
    var l = parent.artLayers.add();
    l.kind = LayerKind.TEXT;
    l.name = nm;
    var ti = l.textItem;
    ti.kind = TextType.POINTTEXT;
    ti.contents = str;
    try{ ti.font = bold ? F_BOLD : F_REG; }catch(e){}
    try{ ti.tracking = trk||0; }catch(e){}
    ti.size = new UnitValue(size,"px");
    ti.color = sc(hexv);
    ti.justification = (just==="RIGHT") ? Justification.RIGHT
                     : (just==="LEFT")  ? Justification.LEFT
                     : Justification.CENTER;
    ti.position = [UnitValue(x,"px"), UnitValue(yBaseline,"px")];
    l.opacity = opac;
    return l;
}

// ---------- 贴图：打开源图 -> 复制入画布 -> (去透明边) -> 缩放对位 ----------
function placeInto(fileName, box, opts){
    opts = opts || {};
    var sd = app.open(new File(SRC + fileName));
    var nl = sd.activeLayer.duplicate(doc, ElementPlacement.PLACEATBEGINNING);
    sd.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument = doc;
    nl.name = opts.name || fileName;
    // 说明：layer.bounds 即非透明内容边界，缩放定位自动忽略透明边距，无需 Trim
    var b = nl.bounds;
    var w = px(b[2]) - px(b[0]), h = px(b[3]) - px(b[1]);
    var s = Math.min(box.w / w, box.h / h) * 100;
    if (opts.capH) s = Math.min(s, opts.capH / h * 100);
    nl.resize(s, s, AnchorPosition.MIDDLECENTER);
    b = nl.bounds;
    var l = px(b[0]), t = px(b[1]), r = px(b[2]), bo = px(b[3]);
    w = r - l; h = bo - t;
    var dx = box.x + box.w / 2 - (l + r) / 2;
    var dy = (opts.fit === "bottom") ? (box.y + box.h - bo) : (box.y + box.h / 2 - (t + bo) / 2);
    nl.translate(dx, dy);
    if (opts.group) nl.move(opts.group, ElementPlacement.INSIDE);
    return nl;
}

// ---------- 分组（后建的在上层）：背景 < 图片 < 版面框线 < 文字 ----------
var gBg  = doc.layerSets.add(); gBg.name  = "背景 Background";
var gImg = doc.layerSets.add(); gImg.name = "图片 Images";
var gLay = doc.layerSets.add(); gLay.name = "版面 Layout";
var gTxt = doc.layerSets.add(); gTxt.name = "文字 Text";

// ---------- 背景 ----------
rectFill(pixLayer(gBg,"底色 Base"),-2,-2,W+4,H+4,"#0B0D12",100);
var glow = pixLayer(gBg,"氛围光 Glow");
doc.activeLayer = glow;
ellSel(300, 750, 1800, 1800);
doc.selection.fill(sc("#131C2C"));
doc.selection.deselect();
glow.opacity = 55;
var glow2 = pixLayer(gBg,"氛围光2 Glow2");
doc.activeLayer = glow2;
ellSel(2900, -300, 1400, 1000);
doc.selection.fill(sc("#1A2130"));
doc.selection.deselect();
glow2.opacity = 45;
var grid = pixLayer(gBg,"网格 Grid");
for (var gx=240; gx<W; gx+=240) rectFill(grid,gx,0,1,H,"#FFFFFF",3);
for (var gy=240; gy<H; gy+=240) rectFill(grid,0,gy,W,1,"#FFFFFF",3);

// ---------- 头部 (90-230) ----------
rectFill(pixLayer(gLay,"标题竖条 Bar"),100,104,14,64,GOLD,100);
addText(gTxt,"主标题","金色经典赛车 · 多视图参考表",54,140,156,"#F4F7FB",100,true,60,"LEFT");
addText(gTxt,"副标题","MULTI-VIEW REFERENCE SHEET · 图生视频主体一致性参考 · 3840 × 2160",24,142,206,"#8E99AA",85,false,140,"LEFT");
addText(gTxt,"来源","TOTAL 10 VIEWS · 4K",22,3560,150,"#7C8798",80,false,140);
rectFill(pixLayer(gLay,"头部分隔线"),100,236,3640,2,"#FFFFFF",10);

// ---------- Band A (260-1250)：Hero + 俯视 + 特征清单 ----------
var heroBox = {x:100, y:260, w:1900, h:950};
placeInto("zhengti.png", heroBox, {name:"01 整体·Hero", group:gImg});
rectStroke(pixLayer(gLay,"Hero边框"),heroBox.x,heroBox.y,heroBox.w,heroBox.h,2,"#FFFFFF",12);
addText(gTxt,"01标签","01 · 整体造型 OVERALL · 3/4 HERO",26,heroBox.x+heroBox.w/2,1252,"#C7D0DC",90,true,120);

placeInto("zhengding_tou.png", {x:2050, y:260, w:630, h:950}, {trim:true, capH:900, name:"02 俯视·Top", group:gImg});
addText(gTxt,"02标签","02 · 俯视 TOP",26,2365,1252,"#C7D0DC",90,true,120);

addText(gTxt,"特征标题","特征细节 KEY DETAILS",28,2740,320,GOLD,100,true,120,"LEFT");
var feats = ["香槟金金属漆车身","圆形大灯 · 点亮状态","黑色网格式前格栅","墨绿多辐轮毂 · 红色快拆锁","CLASSIC 白字复古轮胎","尾部双圆灯 · 中置双排气","车顶双驼峰整流罩"];
for (var fi=0; fi<feats.length; fi++){
    var fy = 408 + fi*82;
    var dot = pixLayer(gLay,"特征点"+fi);
    doc.activeLayer = dot;
    ellSel(2740, fy-13, 26, 26);
    doc.selection.fill(sc(GOLD));
    doc.selection.deselect();
    addText(gTxt,"特征"+fi,feats[fi],26,2790,fy+9,"#C7D0DC",88,false,40,"LEFT");
}

rectFill(pixLayer(gLay,"分隔线1"),100,1300,3640,2,"#FFFFFF",9);

// ---------- Band B (1330-1690)：三视图等高、底线对齐 ----------
var trioY = 1340, trioH = 310;
var trios = [
    {f:"zhengqian_bai.png", n:"03 正前·FRONT", label:"03 · 正前视图 FRONT"},
    {f:"zhengqian_ce.png",  n:"04 正侧·SIDE",  label:"04 · 正侧视图 SIDE"},
    {f:"zhengqian_hou.png", n:"05 正后·REAR",  label:"05 · 正后视图 REAR"}
];
var t3w = (3640 - 2*60) / 3;
for (var t3=0; t3<3; t3++){
    var bx = 100 + t3*(t3w+60);
    placeInto(trios[t3].f, {x:bx, y:trioY, w:t3w, h:trioH}, {trim:true, capH:260, fit:"bottom", name:trios[t3].n, group:gImg});
    addText(gTxt,"三视标签"+t3,trios[t3].label,25,bx+t3w/2,trioY+trioH+52,"#C7D0DC",85,true,120);
}

rectFill(pixLayer(gLay,"分隔线2"),100,1770,3640,2,"#FFFFFF",9);

// ---------- Band C (1810-2160)：细节卡片 ----------
var cw = 650, ch = 380, cy0 = 1776;
var cgap = (3640 - 5*cw) / 4;
var cards = [
    {f:"chetou.png",  label:"06 · 车头特写"},
    {f:"cherwei.png", label:"07 · 车尾特写"},
    {f:"chelun.png",  label:"08 · 轮毂细节"},
    {f:"logo.png",    label:"09 · 灯组前脸"},
    {f:"zhengce.png", label:"10 · 侧视棚拍"}
];
for (var ci=0; ci<5; ci++){
    var cx0 = 100 + ci*(cw+cgap);
    placeInto(cards[ci].f, {x:cx0, y:cy0, w:cw, h:ch}, {name:"卡"+cards[ci].label, group:gImg});
    rectStroke(pixLayer(gLay,"卡框"+ci),cx0,cy0,cw,ch,2,"#FFFFFF",10);
    rectFill(pixLayer(gLay,"卡标签底"+ci),cx0,cy0+ch-46,cw,46,"#000000",60);
    addText(gTxt,"卡标签"+ci,cards[ci].label,22,cx0+cw/2,cy0+ch-13,"#E6EBF2",92,false,110);
}

// ---------- 保存 ----------
var outDir = new Folder(OUTD);
if(!outDir.exists) outDir.create();

var psdOpt = new PhotoshopSaveOptions();
psdOpt.layers = true; psdOpt.embedColorProfile = true;
doc.saveAs(new File(outDir.fsName + "/多视图参考表_3840x2160.psd"), psdOpt, true);

var pngOpt = new PNGSaveOptions();
pngOpt.interlaced = false;
doc.saveAs(new File(outDir.fsName + "/多视图参考表_3840x2160.png"), pngOpt, true);

"MULTIVIEW_DONE|layers=" + doc.layers.length;
