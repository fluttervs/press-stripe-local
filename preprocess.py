#!/usr/bin/env python3
"""
Preprocesses the press.stripe.com mirror for GitHub Pages static hosting.
Run from the repo root.  Output goes to ./dist/
"""
import os
import re
import shutil

REPO_NAME = "press-stripe-local"
GH_USER  = "fluttervs"
# Full absolute base — required because the whitelist code does new URL(r)
# on every dynamic import string; a root-relative path throws TypeError there.
BASE = f"https://{GH_USER}.github.io/{REPO_NAME}"

DOMAINS = [
    "b.stripecdn.com",
    "images.ctfassets.net",
    "images.stripeassets.com",
    "assets.stripeassets.com",
    "q.stripe.com",
    "www.googletagmanager.com",
]

TEXT_EXTS = {".html", ".js", ".mjs", ".css", ".json", ".svg"}

SKIP_DIRS = {".git", "dist", "__pycache__", "node_modules", ".github"}


def rewrite(content: str, ext: str) -> str:
    # Rewrite all CDN domain URLs to root-relative paths
    for d in DOMAINS:
        content = content.replace(f"https://{d}/", f"{BASE}/{d}/")
        content = content.replace(f"http://{d}/",  f"{BASE}/{d}/")

    # Patch the module-import domain whitelist so github.io is allowed
    content = content.replace(
        'Object.freeze(["stripecdn.com"])',
        'Object.freeze(["stripecdn.com","github.io"])',
    )

    # Strip query params from image extension URLs (e.g. ?w=1920 or ?w=${a})
    # These appear in the Three.js canvas controller texture loader
    if ext in (".js", ".mjs", ".html"):
        content = re.sub(
            r'(\.(?:png|jpg|jpeg|webp|gif))\?[^"\'`\s\)\\]+',
            r'\1',
            content,
        )

    return content


def process(src_root: str, dist_root: str) -> None:
    if os.path.exists(dist_root):
        shutil.rmtree(dist_root)
    os.makedirs(dist_root)

    for root, dirs, files in os.walk(src_root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

        for fname in files:
            src_path = os.path.join(root, fname)
            rel      = os.path.relpath(src_path, src_root)
            dst_path = os.path.join(dist_root, rel)

            os.makedirs(os.path.dirname(dst_path), exist_ok=True)

            ext = os.path.splitext(fname)[1].lower()
            if ext in TEXT_EXTS:
                with open(src_path, "rb") as f:
                    raw = f.read()
                content = rewrite(raw.decode("utf-8", errors="replace"), ext)
                with open(dst_path, "wb") as f:
                    f.write(content.encode("utf-8"))
            else:
                shutil.copy2(src_path, dst_path)

    # Also write a root index.html so the site opens without a path
    main_html = os.path.join(src_root, "press.stripe.com", "poor-charlies-almanack.html")
    if os.path.isfile(main_html):
        with open(main_html, "rb") as f:
            content = rewrite(f.read().decode("utf-8", errors="replace"), ".html")
        with open(os.path.join(dist_root, "index.html"), "wb") as f:
            f.write(content.encode("utf-8"))
        print("  created dist/index.html")

    print(f"Done → {dist_root}")


if __name__ == "__main__":
    repo = os.path.dirname(os.path.abspath(__file__))
    process(repo, os.path.join(repo, "dist"))
