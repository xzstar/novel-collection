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
  readerEmpty: document.getElementById("readerEmpty"),
  readerNav: document.getElementById("readerNav"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  chapterIndicator: document.getElementById("chapterIndicator"),
  menuToggle: document.getElementById("menuToggle"),
  sidebar: document.getElementById("sidebar"),
  overlay: document.getElementById("overlay"),
  fontMinus: document.getElementById("fontMinus"),
  fontPlus: document.getElementById("fontPlus"),
};

async function init() {
  const savedSize = localStorage.getItem("fontSize");
  if (savedSize) state.fontSize = parseInt(savedSize, 10);

  await loadNovels();

  el.novelSelect.addEventListener("change", (e) => {
    if (e.target.value) selectNovel(e.target.value);
  });
  el.prevBtn.addEventListener("click", goPrev);
  el.nextBtn.addEventListener("click", goNext);
  el.fontMinus.addEventListener("click", () => adjustFont(-1));
  el.fontPlus.addEventListener("click", () => adjustFont(1));
  el.menuToggle.addEventListener("click", toggleSidebar);
  el.overlay.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
    if (e.key === "ArrowLeft") goPrev();
    else if (e.key === "ArrowRight") goNext();
  });
}

async function loadNovels() {
  try {
    const res = await fetch("/api/novels");
    state.novels = await res.json();
  } catch (e) {
    el.catalog.innerHTML = '<div class="catalog-empty">加载失败</div>';
    return;
  }
  for (const n of state.novels) {
    const opt = document.createElement("option");
    opt.value = n.name;
    opt.textContent = n.chapters ? `${n.title}（${n.chapters}章）` : n.title;
    el.novelSelect.appendChild(opt);
  }
  if (state.novels.length === 1) {
    el.novelSelect.value = state.novels[0].name;
    await selectNovel(state.novels[0].name);
    if (state.current.volumes[0].chapters[0]) {
      await openChapter(state.current.volumes[0].index, state.current.volumes[0].chapters[0].index);
    }
  }
}

async function selectNovel(name) {
  const res = await fetch(`/api/novels/${encodeURIComponent(name)}`);
  const data = await res.json();
  if (data.error) {
    el.catalog.innerHTML = `<div class="catalog-empty">${data.error}</div>`;
    return;
  }
  state.current = data;
  state.currentVol = null;
  state.currentCh = null;
  renderMeta(data);
  renderCatalog(data);
  showEmpty();
}

function renderMeta(data) {
  el.novelMeta.innerHTML = "";
  if (data.genre) {
    const tag = document.createElement("span");
    tag.className = "genre-tag";
    tag.textContent = data.genre;
    el.novelMeta.appendChild(tag);
  }
  if (data.world_setting) {
    const p = document.createElement("div");
    p.className = "world-setting";
    p.textContent = data.world_setting;
    el.novelMeta.appendChild(p);
  }
  el.novelMeta.classList.add("has-meta");
}

function renderCatalog(data) {
  el.catalog.innerHTML = "";
  data.volumes.forEach((vol, vIdx) => {
    const vdiv = document.createElement("div");
    vdiv.className = "volume";
    if (vIdx !== 0) vdiv.classList.add("collapsed");

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

async function openChapter(vol, ch) {
  state.currentVol = vol;
  state.currentCh = ch;
  const name = state.current.name;
  const res = await fetch(
    `/api/novels/${encodeURIComponent(name)}/chapter?v=${vol}&c=${ch}`
  );
  const data = await res.json();
  if (data.error) return;

  renderChapter(data, vol, ch);

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
  if (window.innerWidth <= 768) closeSidebar();
}

function renderChapter(data, vol, ch) {
  const lines = (data.content || "").split("\n");
  let h1 = "";
  let locator = "";
  const bodyLines = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("# ") && !h1) {
      h1 = t.slice(2).trim();
    } else if (/^第\d+卷\s*第\d+章/.test(t) && !locator) {
      locator = t;
    } else if (t) {
      bodyLines.push(t);
    }
  }
  el.chapter.innerHTML = `
    <div class="chapter-inner">
      <h1>${escapeHtml(h1 || `第${ch}章`)}</h1>
      <div class="chapter-locator">${escapeHtml(locator || `第${vol}卷 第${ch}章`)}</div>
      <div class="chapter-body">${bodyLines.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}</div>
    </div>
  `;
  applyFontSize();
  el.chapter.hidden = false;
  el.readerEmpty.hidden = true;
  el.readerNav.hidden = false;
  el.chapter.scrollTop = 0;
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

function showEmpty() {
  el.chapter.hidden = true;
  el.readerNav.hidden = true;
  el.readerEmpty.hidden = false;
}

function toggleSidebar() {
  const open = el.sidebar.classList.toggle("open");
  el.overlay.classList.toggle("show", open);
  el.overlay.hidden = !open;
}

function closeSidebar() {
  el.sidebar.classList.remove("open");
  el.overlay.classList.remove("show");
  el.overlay.hidden = true;
}

init();
