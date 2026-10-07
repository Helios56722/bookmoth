from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "phone-photo-2026-10-07.png"
FONT = Path(r"C:\Windows\Fonts\segoeui.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\segoeuib.ttf")


def main() -> None:
    random.seed(1107)
    canvas = Image.new("RGB", (1080, 1440), "#42372f")
    noise = Image.effect_noise(canvas.size, 10).convert("L")
    warm = Image.new("RGB", canvas.size, "#6a5646")
    canvas = Image.blend(canvas, Image.composite(warm, canvas, noise), 0.18)

    paper = Image.new("RGBA", (850, 1160), "#f6f0df")
    draw = ImageDraw.Draw(paper)
    title = ImageFont.truetype(str(FONT_BOLD), 54)
    body = ImageFont.truetype(str(FONT), 34)
    small = ImageFont.truetype(str(FONT_BOLD), 31)

    draw.text((70, 72), "Water Cycle Review", font=title, fill="#173a56")
    draw.line((70, 145, 780, 145), fill="#d2923f", width=5)
    facts = [
        "1. Evaporation changes liquid water",
        "   into water vapor.",
        "2. Condensation forms clouds when",
        "   water vapor cools.",
        "3. Precipitation returns water to",
        "   Earth's surface.",
        "4. Collection stores water in rivers,",
        "   lakes, soil, and oceans.",
        "5. The Sun supplies energy for",
        "   evaporation.",
    ]
    y = 205
    for line in facts:
        draw.text((74, y), line, font=body, fill="#283038")
        y += 73 if line.startswith(tuple("12345")) else 55
    draw.rounded_rectangle((64, 910, 788, 1060), radius=18, fill="#e9dfc7", outline="#c6ad7e", width=3)
    draw.text((92, 938), "Study goal", font=small, fill="#173a56")
    draw.text((92, 989), "Explain the sequence and the Sun's role.", font=body, fill="#283038")

    paper = paper.rotate(4.2, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=(0, 0, 0, 0))
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_layer = Image.new("RGBA", paper.size, (0, 0, 0, 105)).filter(ImageFilter.GaussianBlur(22))
    shadow.alpha_composite(shadow_layer, (134, 135))
    photo = canvas.convert("RGBA")
    photo.alpha_composite(shadow)
    photo.alpha_composite(paper, (112, 102))

    glare = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    glare_draw = ImageDraw.Draw(glare)
    glare_draw.ellipse((660, 170, 1040, 830), fill=(255, 245, 220, 22))
    glare = glare.filter(ImageFilter.GaussianBlur(38))
    photo = Image.alpha_composite(photo, glare).convert("RGB").filter(ImageFilter.GaussianBlur(0.35))
    photo.save(OUTPUT, quality=94)
    print(OUTPUT)


if __name__ == "__main__":
    main()
