#!/usr/bin/env python3
"""Clean novel reader web app.

Serves novels stored as <novel>/第N卷/第NNN章_<slug>.md from the current
directory, plus a small JSON API consumed by the static frontend.
"""
import json
import os
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlparse, parse_qs

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"

VOLUME_RE = re.compile(r"^第(\d+)卷$")
CHAPTER_RE = re.compile(r"^第(\d+)章[_．.\-]?(.*)\.md$")

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
}


def safe_name(name):
    if not name or "/" in name or "\\" in name or name.startswith("."):
        return None
    return name


def read_text(path):
    return path.read_text(encoding="utf-8-sig")


def read_outline(novel_dir):
    p = novel_dir / "outline.json"
    if not p.exists():
        return {}
    try:
        return json.loads(read_text(p))
    except Exception:
        return {}


def count_chapters(novel_dir):
    n = 0
    for v in novel_dir.iterdir():
        if v.is_dir() and VOLUME_RE.match(v.name):
            n += sum(1 for f in v.iterdir() if f.suffix == ".md")
    return n


def list_novels():
    novels = []
    for entry in sorted(ROOT.iterdir()):
        if not entry.is_dir() or entry.name.startswith(".") or entry.name == "static":
            continue
        has_volumes = any(VOLUME_RE.match(p.name) for p in entry.iterdir())
        if not (entry / "outline.json").exists() and not has_volumes:
            continue
        outline = read_outline(entry)
        novels.append({
            "name": entry.name,
            "title": outline.get("title", entry.name),
            "genre": outline.get("genre", ""),
            "chapters": count_chapters(entry),
        })
    return novels


def novel_structure(name):
    novel_dir = ROOT / name
    if not novel_dir.is_dir():
        return {"error": "novel not found"}
    outline = read_outline(novel_dir)
    volumes = []
    vols_sorted = sorted(
        [p for p in novel_dir.iterdir() if p.is_dir() and VOLUME_RE.match(p.name)],
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
            chapters.append({
                "index": int(mc.group(1)),
                "title": mc.group(2).strip(),
                "file": cfile.name,
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
    return {
        "name": name,
        "title": outline.get("title", name),
        "genre": outline.get("genre", ""),
        "world_setting": outline.get("world_setting", ""),
        "volumes": volumes,
    }


def chapter_content(name, vol, ch):
    if not (vol.isdigit() and ch.isdigit()):
        return {"error": "invalid volume or chapter"}
    novel_dir = ROOT / name
    if not novel_dir.is_dir():
        return {"error": "novel not found"}
    vdir = novel_dir / f"第{int(vol)}卷"
    if not vdir.is_dir():
        return {"error": "volume not found"}
    prefix = f"第{int(ch):03d}章"
    for cfile in vdir.iterdir():
        if cfile.suffix == ".md" and cfile.name.startswith(prefix):
            return {"content": read_text(cfile), "file": cfile.name}
    return {"error": "chapter not found"}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _file(self, path, content_type=None):
        if not path.is_file():
            self.send_error(404)
            return
        if content_type is None:
            content_type = CONTENT_TYPES.get(path.suffix.lower(), "application/octet-stream")
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path in ("/", "/index.html"):
            return self._file(STATIC / "index.html", "text/html; charset=utf-8")

        if path.startswith("/api/"):
            return self._api(path, parsed)

        rel = path.lstrip("/")
        candidate = (STATIC / rel).resolve()
        if candidate.is_file() and STATIC in candidate.parents:
            return self._file(candidate)
        self.send_error(404)

    def _api(self, path, parsed):
        if path == "/api/novels":
            return self._json(list_novels())

        m = re.match(r"^/api/novels/([^/]+)/chapter$", path)
        if m:
            name = safe_name(unquote(m.group(1)))
            if not name:
                return self._json({"error": "invalid novel"}, 400)
            qs = parse_qs(parsed.query)
            vol = qs.get("v", [""])[0]
            ch = qs.get("c", [""])[0]
            return self._json(chapter_content(name, vol, ch))

        m = re.match(r"^/api/novels/([^/]+)$", path)
        if m:
            name = safe_name(unquote(m.group(1)))
            if not name:
                return self._json({"error": "invalid novel"}, 400)
            return self._json(novel_structure(name))

        self._json({"error": "not found"}, 404)


def main():
    port = int(os.environ.get("PORT", "8000"))
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"小说阅读服务已启动: http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")


if __name__ == "__main__":
    main()
