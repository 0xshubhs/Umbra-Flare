"""Renders Umbra's 480x480 submission logo.

The mark is an eclipse: a full ring (the auction, entirely public) with one
half occluded (the bids, which nobody sees). Drawn at 4x and downsampled so
the curves stay clean without needing an SVG rasteriser.
"""

from PIL import Image, ImageDraw, ImageFont

SIZE = 480
SS = 4  # supersampling factor
BG = "#0a0a0c"
ACCENT = "#FD5299"
TEXT = "#f2f2f4"

W = SIZE * SS
img = Image.new("RGB", (W, W), BG)
d = ImageDraw.Draw(img)

# --- Eclipse mark, sitting above the wordmark ---
cx, cy = W // 2, int(W * 0.42)
r = int(W * 0.20)
ring = int(W * 0.018)
box = [cx - r, cy - r, cx + r, cy + r]

# Right half solid: the occluded side.
d.pieslice(box, -90, 90, fill=ACCENT)
# Full ring outline: the auction itself, always visible.
d.ellipse(box, outline=ACCENT, width=ring)

# Inner disc, straddling the terminator so the mark reads at small sizes.
ir = int(r * 0.30)
d.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=BG)
d.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], outline=ACCENT, width=int(ring * 0.8))

# --- Wordmark ---
label = "UMBRA"
target_h = int(W * 0.085)
font = None
for path in (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
):
    try:
        size = target_h
        f = ImageFont.truetype(path, size)
        # Scale to the intended cap height.
        bbox = f.getbbox(label)
        if bbox[3] - bbox[1] > 0:
            size = int(size * target_h / (bbox[3] - bbox[1]))
            f = ImageFont.truetype(path, size)
        font = f
        break
    except OSError:
        continue

if font is not None:
    tracking = int(W * 0.022)
    widths = [font.getbbox(ch)[2] - font.getbbox(ch)[0] for ch in label]
    total = sum(widths) + tracking * (len(label) - 1)
    x = cx - total // 2
    y = int(W * 0.72)
    for ch, cw in zip(label, widths):
        chb = font.getbbox(ch)
        d.text((x - chb[0], y - chb[1]), ch, font=font, fill=TEXT)
        x += cw + tracking

img.resize((SIZE, SIZE), Image.LANCZOS).save("../public/logo.png", "PNG", optimize=True)
print("wrote logo.png")
