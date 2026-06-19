const state = {
  novels: [],
  current: null,
  currentVol: null,
  currentCh: null,
  fontSize: 17,
};

const el = {
  novelSelect: document.getElementById("novelSelect"),
  novelMeta: document.getElementById("novelMeta"),
  catalog: document.getElementById("catalog"),
  chapter: document.getElementById("chapter"),
  readerNav: document.getElementById("readerNav"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  chapterIndicator: document.getElementById("chapterIndicator"),
  chapterTitle: document.getElementById("chapterTitle"),
  menuBtn: document.getElementById("menuBtn"),
  sidebar: document.getElementById("sidebar"),
  overlay: document.getElementById("overlay"),
  fontMinus: document.getElementById("fontMinus"),
  fontPlus: document.getElementById("fontPlus"),
};

async function init() {
  const savedSize = localStorage.getItem("fontSize");
  if (savedSize) state.fontSize = parseInt(savedSize, 10);

  const res = await fetch("data.json");
  state.novels = await res.json();

  for (const n of state.novels) {
    const opt = document.createElement("option");
    opt.value = n.name;
    opt.textContent = n.title;
    el.novelSelect.appendChild(opt);
  }

  el.novelSelect.addEventListener("change", (e) => {
    if (e.target.value) selectNovel(e.target.value);
  });
  el.prevBtn.addEventListener("click", goPrev);
  el.nextBtn.addEventListener("click", goNext);
  el.fontMinus.addEventListener("click", () => adjustFont(-1));
  el.fontPlus.addEventListener("click", () => adjustFont(1));
  el.menuBtn.addEventListener("click", toggleSidebar);
  el.overlay.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
    if (e.key === "ArrowLeft") goPrev();
    else if (e.key === "ArrowRight") goNext();
  });

  if (state.novels.length >= 1) {
    el.novelSelect.value = state.novels[0].name;
    selectNovel(state.novels[0].name);
    if (state.current.volumes[0].chapters[0]) {
      openChapter(state.current.volumes[0].index, state.current.volumes[0].chapters[0].index);
    }
  }
}

function selectNovel(name) {
  state.current = state.novels.find((n) => n.name === name);
  state.currentVol = null;
  state.currentCh = null;
  renderMeta(state.current);
  renderCatalog(state.current);
}

function renderMeta(data) {
  el.novelMeta.innerHTML = "";
  if (data.genre) {
    const tag = document.createElement("span");
    tag.className = "genre-tag";
    tag.textContent = data.genre;
    el.novelMeta.appendChild(tag);
  }
  if (data.worldSetting) {
    const p = document.createElement("div");
    p.className = "world-setting";
    p.textContent = data.worldSetting;
    el.novelMeta.appendChild(p);
  }
  el.novelMeta.classList.add("has-meta");
}

function renderCatalog(data) {
  el.catalog.innerHTML = "";
  data.volumes.forEach((vol) => {
    const vdiv = document.createElement("div");
    vdiv.className = "volume collapsed";

    const head = document.createElement("div");
    head.className = "volume-head";
    head.innerHTML = `<span class="arrow">▼</span><span>第${vol.index}卷 · ${vol.title}</span>`;
    head.addEventListener("click", () => vdiv.classList.toggle("collapsed"));

    const list = document.createElement("ul");
    list.className = "chapter-list";
    vol.chapters.forEach((ch) => {
      const li = document.createElement("li");
      li.className = "chapter-item";
      li.textContent = `第${ch.index}章 ${ch.title}`;
      li.dataset.vol = vol.index;
      li.dataset.ch = ch.index;
      li.addEventListener("click", () => openChapter(vol.index, ch.index));
      list.appendChild(li);
    });

    vdiv.appendChild(head);
    vdiv.appendChild(list);
    el.catalog.appendChild(vdiv);
  });
}

function openChapter(vol, ch) {
  state.currentVol = vol;
  state.currentCh = ch;

  const volObj = state.current.volumes.find((v) => v.index === vol);
  const chObj = volObj.chapters.find((c) => c.index === ch);
  renderChapter(chObj.content, vol, ch, chObj.title);

  document.querySelectorAll(".chapter-item").forEach((it) =>
    it.classList.remove("active")
  );
  const active = document.querySelector(
    `.chapter-item[data-vol="${vol}"][data-ch="${ch}"]`
  );
  if (active) {
    active.classList.add("active");
    active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const volEl = active.closest(".volume");
    if (volEl) volEl.classList.remove("collapsed");
  }

  updateNav();
  closeSidebar();
}

function renderChapter(content, vol, ch, title) {
  const lines = content.split("\n");
  const bodyLines = [];
  for (const line of lines) {
    const t = line.trim();
    if (t && !t.startsWith("# ") && !/^第\d+卷\s*第\d+章/.test(t)) {
      bodyLines.push(t);
    }
  }
  el.chapter.innerHTML = `
    <h1>${escapeHtml(title || `第${ch}章`)}</h1>
    <div class="chapter-locator">第${vol}卷 第${ch}章</div>
    <div class="chapter-body">${bodyLines.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}</div>
  `;
  el.chapterTitle.textContent = title || `第${ch}章`;
  applyFontSize();
  document.getElementById("reader").scrollTop = 0;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function applyFontSize() {
  const body = el.chapter.querySelector(".chapter-body");
  if (body) body.style.fontSize = state.fontSize + "px";
}

function adjustFont(delta) {
  state.fontSize = Math.min(24, Math.max(13, state.fontSize + delta));
  localStorage.setItem("fontSize", String(state.fontSize));
  applyFontSize();
}

function currentVolMeta() {
  return state.current.volumes.find((v) => v.index === state.currentVol);
}

function updateNav() {
  const volMeta = currentVolMeta();
  if (!volMeta) return;
  const idx = volMeta.chapters.findIndex((c) => c.index === state.currentCh);
  el.prevBtn.disabled = !(idx > 0 || findAdjacentVol(-1));
  el.nextBtn.disabled =
    !(idx < volMeta.chapters.length - 1 || findAdjacentVol(1));
  el.chapterIndicator.textContent = `第${state.currentVol}卷 第${state.currentCh}章`;
}

function findAdjacentVol(direction) {
  const vols = state.current.volumes;
  const idx = vols.findIndex((v) => v.index === state.currentVol);
  let next = idx + direction;
  while (next >= 0 && next < vols.length) {
    if (vols[next].chapters.length > 0) return vols[next];
    next += direction;
  }
  return null;
}

function goPrev() {
  const volMeta = currentVolMeta();
  const idx = volMeta.chapters.findIndex((c) => c.index === state.currentCh);
  if (idx > 0) {
    openChapter(state.currentVol, volMeta.chapters[idx - 1].index);
  } else {
    const prev = findAdjacentVol(-1);
    if (prev)
      openChapter(prev.index, prev.chapters[prev.chapters.length - 1].index);
  }
}

function goNext() {
  const volMeta = currentVolMeta();
  const idx = volMeta.chapters.findIndex((c) => c.index === state.currentCh);
  if (idx < volMeta.chapters.length - 1) {
    openChapter(state.currentVol, volMeta.chapters[idx + 1].index);
  } else {
    const next = findAdjacentVol(1);
    if (next) openChapter(next.index, next.chapters[0].index);
  }
}

function toggleSidebar() {
  const open = el.sidebar.classList.toggle("open");
  el.overlay.classList.toggle("show", open);
}

function closeSidebar() {
  el.sidebar.classList.remove("open");
  el.overlay.classList.remove("show");
}

init();
