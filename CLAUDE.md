# CLAUDE.md

This is the **generated novel collections directory**.

## What's Here

Each subdirectory contains one generated novel:
- `outline.json` — structured outline (title, genre, volumes, cliffhangers)
- `stats.json` — generation metrics
- `第N卷/第NNN章_<slug>.md` — chapter markdown files

## Web Reader

This directory includes a clean, responsive web reader:

```bash
# Start the server (runs on port 8000 by default)
python3 app.py

# Or specify a port
PORT=3000 python3 app.py
```

Then open **http://localhost:8000** in a browser. The reader features:

- Left sidebar: collapsible volume/chapter tree, world-setting metadata
- Clean reading area with serif font, proper paragraph indentation
- Bottom nav: prev/next chapter buttons, current position, font-size controls
- Responsive: hamburger sidebar on mobile
- Automatic dark/light mode (follows system preference)
- Font size is saved in `localStorage`
- Keyboard navigation: ← and → arrow keys for prev/next

## Adding Novels

Drop a new novel directory (with the `第N卷` chapter layout) into this folder.
The reader will auto-detect it on next server start or page refresh.
