#!/usr/bin/env python3
"""Precompile all novels into a single static/data.json for GitHub Pages."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "docs"
VOLUME_RE = re.compile(r"^第(\d+)卷$")
CHAPTER_RE = re.compile(r"^第(\d+)章[_．.\-]?(.*)\.md$")


def main():
    novels = []
    for entry in sorted(ROOT.iterdir()):
        if not entry.is_dir() or entry.name.startswith(".") or entry.name == "static":
            continue

        outline = {}
        outline_path = entry / "outline.json"
        if outline_path.exists():
            outline = json.loads(outline_path.read_text(encoding="utf-8"))

        volumes = []
        vols_sorted = sorted(
            [p for p in entry.iterdir() if p.is_dir() and VOLUME_RE.match(p.name)],
            key=lambda p: int(VOLUME_RE.match(p.name).group(1)),
        )
        for vdir in vols_sorted:
            vol_num = int(VOLUME_RE.match(vdir.name).group(1))
            chapters = []
            chs_sorted = sorted(
                [p for p in vdir.iterdir() if p.suffix == ".md" and CHAPTER_RE.match(p.name)],
                key=lambda p: int(CHAPTER_RE.match(p.name).group(1)),
            )
            for cfile in chs_sorted:
                mc = CHAPTER_RE.match(cfile.name)
                content = cfile.read_text(encoding="utf-8")
                chapters.append({
                    "index": int(mc.group(1)),
                    "title": mc.group(2).strip(),
                    "content": content,
                })
            vol_outline = next(
                (v for v in outline.get("volumes", []) if v.get("volume") == vol_num), {}
            )
            volumes.append({
                "index": vol_num,
                "title": vol_outline.get("title", f"第{vol_num}卷"),
                "theme": vol_outline.get("theme", ""),
                "chapters": chapters,
            })

        novels.append({
            "name": entry.name,
            "title": outline.get("title", entry.name),
            "genre": outline.get("genre", ""),
            "worldSetting": outline.get("world_setting", ""),
            "volumes": volumes,
        })

    out = STATIC / "data.json"
    out.write_text(json.dumps(novels, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"✅ 编译完成: {len(novels)} 本小说 → static/data.json")
    print(f"   文件大小: {out.stat().st_size / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
