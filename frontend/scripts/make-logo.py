"""Renders Umbra's logo assets.

The mark is an eclipse: a full ring (the auction, entirely public) with one
half occluded (the bids, which nobody sees). Everything is drawn at 4x and
downsampled so the curves stay clean without needing an SVG rasteriser.

Outputs:
  ../public/logo.png          480x480  submission / gallery logo
  ../app/icon.png             512x512  favicon — mark only, no wordmark,
                                       because "UMBRA" is illegible at 32px
  ../app/opengraph-image.png 1200x630  link previews
"""

from PIL import Image, ImageDraw, ImageFont

SS = 4  # supersampling factor
BG = "#0a0a0c"
ACCENT = "#FD5299"
TEXT = "#f2f2f4"
MUTED = "#8a8a92"

FONTS = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
)
FONTS_REG = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
)


def load_font(px, paths=FONTS):
    for path in paths:
        try:
            return ImageFont.truetype(path, px)
        except OSError:
            continue
    return None


def draw_mark(d, cx, cy, r, ring):
    """The eclipse: solid occluded half, full ring, inner disc on the terminator."""
    box = [cx - r, cy - r, cx + r, cy + r]
    d.pieslice(box, -90, 90, fill=ACCENT)
    d.ellipse(box, outline=ACCENT, width=ring)
    ir = int(r * 0.30)
    d.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=BG)
    d.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], outline=ACCENT, width=int(ring * 0.8))


def draw_tracked(d, label, font, cx, y, fill, tracking):
    """Letter-spaced centred text — PIL has no tracking, so place per glyph."""
    widths = [font.getbbox(ch)[2] - font.getbbox(ch)[0] for ch in label]
    total = sum(widths) + tracking * (len(label) - 1)
    x = cx - total // 2
    for ch, cw in zip(label, widths):
        b = font.getbbox(ch)
        d.text((x - b[0], y - b[1]), ch, font=font, fill=fill)
        x += cw + tracking


def fit(label, target_h, paths=FONTS):
    f = load_font(target_h, paths)
    if f is None:
        return None
    b = f.getbbox(label)
    if b[3] - b[1] > 0:
        f = load_font(int(target_h * target_h / (b[3] - b[1])), paths) or f
    return f


# ── 480x480 submission logo: mark + wordmark ────────────────────────────────
SIZE = 480
W = SIZE * SS
img = Image.new("RGB", (W, W), BG)
d = ImageDraw.Draw(img)
draw_mark(d, W // 2, int(W * 0.42), int(W * 0.20), int(W * 0.018))
f = fit("UMBRA", int(W * 0.085))
if f:
    draw_tracked(d, "UMBRA", f, W // 2, int(W * 0.72), TEXT, int(W * 0.022))
img.resize((SIZE, SIZE), Image.LANCZOS).save("../public/logo.png", "PNG", optimize=True)

# ── 512x512 favicon: mark only ──────────────────────────────────────────────
ISIZE = 512
W = ISIZE * SS
img = Image.new("RGB", (W, W), BG)
d = ImageDraw.Draw(img)
draw_mark(d, W // 2, W // 2, int(W * 0.34), int(W * 0.030))
img.resize((ISIZE, ISIZE), Image.LANCZOS).save("../app/icon.png", "PNG", optimize=True)

# ── 1200x630 open-graph card ────────────────────────────────────────────────
OW, OH = 1200, 630
W, H = OW * SS, OH * SS
img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# Faint grid, echoing the site's background.
step = int(W * 0.04)
for x in range(0, W, step):
    d.line([(x, 0), (x, H)], fill="#16121a", width=SS)
for y in range(0, H, step):
    d.line([(0, y), (W, y)], fill="#16121a", width=SS)

draw_mark(d, int(W * 0.20), H // 2, int(H * 0.22), int(H * 0.020))

f = fit("UMBRA", int(H * 0.13))
if f:
    draw_tracked(d, "UMBRA", f, int(W * 0.63), int(H * 0.30), TEXT, int(W * 0.010))
f2 = load_font(int(H * 0.052), FONTS_REG)
if f2:
    d.text((int(W * 0.375), int(H * 0.52)), "Sealed-bid Vickrey auctions on Flare", font=f2, fill=MUTED)
    d.text((int(W * 0.375), int(H * 0.60)), "Bids stay inside the enclave.", font=f2, fill=ACCENT)

img.resize((OW, OH), Image.LANCZOS).save("../app/opengraph-image.png", "PNG", optimize=True)

print("wrote logo.png, icon.png, opengraph-image.png")
