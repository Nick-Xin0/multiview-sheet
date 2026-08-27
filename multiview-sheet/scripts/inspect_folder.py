# 素材盘点：列出图片尺寸/透明度分类；--contact 额外输出带文件名的联系表(中灰底,可辨别透明区)
# 用法: uv run --with pillow python inspect_folder.py <文件夹> [--contact out.jpg]
import argparse
import os

from PIL import Image, ImageDraw


def classify(im):
    if im.mode != "RGBA":
        return "OPAQUE(%s)" % im.mode
    a = im.getchannel("A")
    mn, _ = a.getextrema()
    if mn >= 250:
        return "OPAQUE"
    if mn == 0:
        return "TRANSPARENT"
    return "SEMI(alpha_min=%d)" % mn


def main():
    p = argparse.ArgumentParser()
    p.add_argument("folder")
    p.add_argument("--contact", metavar="OUT", help="同时输出联系表 jpg")
    args = p.parse_args()

    exts = (".png", ".jpg", ".jpeg", ".webp")
    files = sorted(f for f in os.listdir(args.folder) if f.lower().endswith(exts))
    for f in files:
        im = Image.open(os.path.join(args.folder, f))
        print("%s: %dx%d %s" % (f, im.size[0], im.size[1], classify(im)))

    if args.contact:
        cols, tw, th = 5, 480, 300
        rows = (len(files) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * tw, rows * (th + 24)), (15, 15, 15))
        dr = ImageDraw.Draw(sheet)
        for i, f in enumerate(files):
            im = Image.open(os.path.join(args.folder, f)).convert("RGBA")
            im.thumbnail((tw - 8, th - 8))
            cell = Image.new("RGBA", (tw, th), (96, 96, 96, 255))
            cell.paste(im, ((tw - im.width) // 2, (th - im.height) // 2), im)
            x, y = (i % cols) * tw, (i // cols) * (th + 24)
            sheet.paste(cell.convert("RGB"), (x, y))
            dr.rectangle([x, y + th, x + tw, y + th + 24], fill=(0, 0, 0))
            dr.text((x + 6, y + th + 6), f, fill=(255, 255, 0))
        sheet.save(args.contact, quality=85)
        print("contact sheet -> %s" % args.contact)


if __name__ == "__main__":
    main()
