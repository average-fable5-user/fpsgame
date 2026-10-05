"""
Build a single, sendable Windows executable:  python desktop/build.py
Output: dist/FPS-kinda-weird.exe

Needs: pip install pywebview pyinstaller pillow
The target PC needs the Microsoft Edge WebView2 runtime (preinstalled on Windows 10/11).
"""
import os
import shutil
import sys

import PyInstaller.__main__

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
NAME = "FPS-kinda-weird"

# what the game needs at runtime (everything else in the repo is tooling)
GAME_FILES = ["index.html", "style.css", "config.js", "core.js", "game.js", "favicon.ico",
              "forest.glb", "tank_t-55a.glb", "soldier_character.glb", "fps_ak_animated.glb", "animated_pistol.glb",
              "sniper_animated.glb", "ar-15.glb", "glock_gun_3d_model_free_download.glb", "a-10_thunderbolt_ii.glb", "b2_spirit.glb"]
GAME_DIRS = ["vendor"]


def make_icon(path):
    from PIL import Image, ImageDraw
    img = Image.new("RGBA", (256, 256), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.regular_polygon((128, 128, 120), 6, rotation=30, fill=(7, 11, 16, 255), outline=(79, 195, 255, 255), width=10)
    d.ellipse((70, 70, 186, 186), outline=(79, 195, 255, 255), width=10)
    for box in [(122, 40, 134, 100), (122, 156, 134, 216), (40, 122, 100, 134), (156, 122, 216, 134)]:
        d.rectangle(box, fill=(230, 238, 245, 255))
    d.ellipse((120, 120, 136, 136), fill=(255, 60, 40, 255))
    img.save(path, sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])


def main():
    missing = [f for f in GAME_FILES + GAME_DIRS if not os.path.exists(os.path.join(ROOT, f))]
    if missing:
        sys.exit("missing game files: " + ", ".join(missing))
    icon = os.path.join(HERE, "icon.ico")
    if not os.path.exists(icon):
        make_icon(icon)
    sep = os.pathsep
    data = [f"{os.path.join(ROOT, f)}{sep}game" for f in GAME_FILES] + [f"{os.path.join(ROOT, d)}{sep}game/{d}" for d in GAME_DIRS]
    work = os.path.join(ROOT, "build")
    PyInstaller.__main__.run([
        os.path.join(HERE, "app.py"), "--name", NAME, "--onefile", "--windowed", "--noconfirm", "--clean",
        "--icon", icon, "--distpath", os.path.join(ROOT, "dist"), "--workpath", work, "--specpath", work,
        "--collect-all", "webview",
        *sum((["--add-data", x] for x in data), []),
    ])
    print("\nbuilt:", os.path.join(ROOT, "dist", NAME + ".exe"))


if __name__ == "__main__":
    main()
