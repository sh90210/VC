# Draws the app icons (a soccer ball on a blue tile). Run: python3 scripts/make_icons.py
import math
from PIL import Image, ImageDraw

INK, COBALT, SUN = (26, 23, 68), (63, 81, 245), (255, 212, 59)

def ball(draw, cx, cy, R):
    draw.ellipse([cx - R, cy - R, cx + R, cy + R], fill="white")
    def pent(x, y, r, rot):
        return [(x + r * math.cos(math.radians(rot + 72 * i)), y + r * math.sin(math.radians(rot + 72 * i))) for i in range(5)]
    for i in range(5):
        deg = -90 + 72 * i
        ax, ay = cx + 0.15 / 0.44 * R * math.cos(math.radians(deg)), cy + 0.15 / 0.44 * R * math.sin(math.radians(deg))
        bx, by = cx + 0.33 / 0.44 * R * math.cos(math.radians(deg)), cy + 0.33 / 0.44 * R * math.sin(math.radians(deg))
        draw.line([ax, ay, bx, by], fill=INK, width=max(2, int(R * 0.07)))
    draw.polygon(pent(cx, cy, 0.15 / 0.44 * R, -90), fill=INK)
    # outer patches, clipped to the ball by drawing them on a mask
    size = int(R * 2 + 4)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    c = size / 2
    for i in range(5):
        deg = -90 + 72 * i
        px, py = c + 0.43 / 0.44 * R * math.cos(math.radians(deg)), c + 0.43 / 0.44 * R * math.sin(math.radians(deg))
        ld.polygon(pent(px, py, 0.11 / 0.44 * R, deg + 180), fill=INK)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([2, 2, size - 2, size - 2], fill=255)
    layer.putalpha(Image.composite(layer.getchannel("A"), Image.new("L", (size, size), 0), mask))
    draw._image.paste(layer, (int(cx - c), int(cy - c)), layer)
    draw.ellipse([cx - R, cy - R, cx + R, cy + R], outline=INK, width=max(3, int(R * 0.09)))

def make(size, ball_ratio, rounded, path):
    S = 1024
    img = Image.new("RGBA", (S, S), COBALT if not rounded else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=COBALT)
    ball(d, S / 2, S / 2, S * ball_ratio / 2)
    img.resize((size, size), Image.LANCZOS).save(path)

make(192, 0.62, True, "icons/icon-192.png")
make(512, 0.62, True, "icons/icon-512.png")
make(512, 0.46, False, "icons/icon-maskable-512.png")   # full-bleed, ball inside the safe zone
make(180, 0.62, False, "icons/apple-touch-icon.png")

# Matching SVG icon for browser tabs
def pts(x, y, r, rot):
    return " ".join(f"{x + r * math.cos(math.radians(rot + 72 * i)):.1f},{y + r * math.sin(math.radians(rot + 72 * i)):.1f}" for i in range(5))
spokes = patches = ""
for i in range(5):
    deg = -90 + 72 * i
    spokes += f'<line x1="{50 + 15 * math.cos(math.radians(deg)):.1f}" y1="{50 + 15 * math.sin(math.radians(deg)):.1f}" x2="{50 + 33 * math.cos(math.radians(deg)):.1f}" y2="{50 + 33 * math.sin(math.radians(deg)):.1f}"/>'
    px, py = 50 + 43 * math.cos(math.radians(deg)), 50 + 43 * math.sin(math.radians(deg))
    patches += f'<polygon points="{pts(px, py, 11, deg + 180)}" fill="#1a1744"/>'
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#3f51f5"/><g transform="translate(50 50) scale(.78) translate(-50 -50)"><defs><clipPath id="c"><circle cx="50" cy="50" r="44"/></clipPath></defs><circle cx="50" cy="50" r="44" fill="#fff"/><g clip-path="url(#c)">{patches}</g><g stroke="#1a1744" stroke-width="3" stroke-linecap="round">{spokes}</g><polygon points="{pts(50, 50, 15, -90)}" fill="#1a1744"/><circle cx="50" cy="50" r="44" fill="none" stroke="#1a1744" stroke-width="4"/></g></svg>
'''
open("icons/icon.svg", "w").write(svg)
print("icons done")
