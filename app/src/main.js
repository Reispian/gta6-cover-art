// Vice Sunset Studio — wires the editor: pick photos per panel, crop and position each by dragging,
// edit the caption, pick a colour grade, and export the cover as a PNG in the common post sizes.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, panelAt, GRADES } from './cover.js';
import { runShot } from './shots.js';

const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  landscape: { w: 1920, h: 1080, label: '1920 x 1080' },
};
const PANEL_NAMES = ['Hero panel', 'Panel 2', 'Panel 3'];

const canvas = document.getElementById('preview');
const status = document.getElementById('status');
const zoomInput = document.getElementById('zoom');
const zoomVal = document.getElementById('zoomVal');

const state = {
  panels: [
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
  ],
  title: 'Vice Sunset',
  subtitle: 'A Leonida Story',
  titleColor: '#ffffff',
  titlePos: 'bottom',
  grade: 'sunset',
  sizeKey: 'landscape',
};

let selected = 0;
let lastRects = [];

// Sizes the preview canvas to the chosen export aspect (long side 900 px) and redraws.
function redraw() {
  const size = SIZES[state.sizeKey];
  const long = 900;
  const scale = long / Math.max(size.w, size.h);
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  lastRects = drawCover(canvas, state);
  document.querySelectorAll('.panel-card').forEach((card, i) => {
    card.classList.toggle('selected', i === selected);
    card.querySelector('.panel-state').textContent = state.panels[i].img ? 'Photo loaded' : 'Empty — add a photo';
  });
  const panel = state.panels[selected];
  zoomInput.value = String(panel.zoom);
  zoomVal.textContent = `${panel.zoom.toFixed(2)}x`;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function setPanelPhoto(i, fileOrUrl) {
  const img = typeof fileOrUrl === 'string'
    ? await loadImage(fileOrUrl)
    : await loadImage(URL.createObjectURL(fileOrUrl));
  state.panels[i] = { img, zoom: 1, ox: 0, oy: 0 };
  selected = i;
  redraw();
  status.textContent = `${PANEL_NAMES[i]}: photo loaded. Drag it to position, scroll to zoom.`;
}

async function loadSamples() {
  const pier = await loadImage('samples/pier.jpg');
  const boulevard = await loadImage('samples/boulevard.jpg');
  state.panels[0] = { img: pier, zoom: 1, ox: 0, oy: 0 };
  state.panels[1] = { img: boulevard, zoom: 1, ox: 0, oy: 0 };
  state.panels[2] = { img: pier, zoom: 1.15, ox: 0, oy: -0.05 };
  redraw();
  status.textContent = 'Sample photos loaded. Replace any panel with your own photo.';
}

// Renders the cover at the exact export size and returns it as a PNG data URL.
async function exportPNG(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function downloadExport(w, h) {
  exportPNG(w, h).then((dataUrl) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `vice-sunset-cover-${w}x${h}.png`;
    a.click();
    status.textContent = `Saved vice-sunset-cover-${w}x${h}.png`;
  });
}

// ---- Panel cards: upload, and fill every panel with one photo. ----
document.querySelectorAll('.panel-card').forEach((card) => {
  const i = Number(card.dataset.panel);
  card.addEventListener('click', (e) => {
    if (e.target.closest('label, button, input')) return;
    selected = i;
    redraw();
  });
  card.querySelector('.photo-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { await setPanelPhoto(i, file); } catch { status.textContent = 'That file could not be read as a photo.'; }
    e.target.value = '';
  });
  card.querySelector('.fill-all').addEventListener('click', () => {
    const src = state.panels[i];
    if (!src.img) { status.textContent = `${PANEL_NAMES[i]} is empty — add a photo first.`; return; }
    state.panels = state.panels.map(() => ({ img: src.img, zoom: 1, ox: 0, oy: 0 }));
    redraw();
    status.textContent = 'The same photo now fills all three panels.';
  });
});

// ---- Crop and position: drag the photo on the preview, scroll to zoom. ----
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}
let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = panelAt(lastRects, p.x, p.y);
  if (hit >= 0) {
    selected = hit;
    dragging = { x: p.x, y: p.y };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = canvasPoint(e);
  const panel = state.panels[selected];
  const rect = lastRects[selected];
  if (!panel.img || !rect) return;
  panel.ox += (p.x - dragging.x) / rect.w;
  panel.oy += (p.y - dragging.y) / rect.h;
  dragging = p;
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[selected];
  if (!panel.img) return;
  panel.zoom = Math.min(3, Math.max(1, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
  redraw();
}, { passive: false });

// ---- Drag and drop a photo straight onto a panel. ----
canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', async (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const p = canvasPoint(e);
  const hit = panelAt(lastRects, p.x, p.y);
  try { await setPanelPhoto(hit >= 0 ? hit : selected, file); } catch { status.textContent = 'That file could not be read as a photo.'; }
});

// ---- Crop controls for the selected panel. ----
zoomInput.addEventListener('input', () => {
  const panel = state.panels[selected];
  panel.zoom = Number(zoomInput.value);
  redraw();
});
document.getElementById('resetPos').addEventListener('click', () => {
  const panel = state.panels[selected];
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  redraw();
  status.textContent = `${PANEL_NAMES[selected]}: crop reset.`;
});
document.getElementById('loadSamples').addEventListener('click', loadSamples);

// ---- Caption: title, subtitle, colour, position. ----
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
document.getElementById('titleColor').addEventListener('input', (e) => {
  state.titleColor = e.target.value;
  redraw();
});
document.querySelectorAll('.swatch').forEach((sw) => {
  sw.addEventListener('click', () => {
    state.titleColor = sw.dataset.color;
    document.getElementById('titleColor').value = sw.dataset.color;
    redraw();
  });
});
document.getElementById('titlePos').addEventListener('change', (e) => {
  state.titlePos = e.target.value;
  redraw();
});

// ---- Colour grade. ----
document.querySelectorAll('.grade-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.grade = btn.dataset.grade;
    document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('active', b === btn));
    redraw();
  });
});

// ---- Post size and export. ----
document.querySelectorAll('input[name="size"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.sizeKey = radio.value;
    redraw();
  });
});
document.querySelectorAll('.export-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const size = SIZES[btn.dataset.size];
    downloadExport(size.w, size.h);
  });
});

// ---- The handle the screenshot scenes (and tests) use. ----
window.__vice = {
  state,
  redraw,
  loadSample: (name) => loadImage(`samples/${name}.jpg`),
  applyScene: (scene) => {
    if (scene.panels) state.panels = scene.panels;
    if (scene.title !== undefined) { state.title = scene.title; titleInput.value = scene.title; }
    if (scene.subtitle !== undefined) { state.subtitle = scene.subtitle; subtitleInput.value = scene.subtitle; }
    if (scene.grade && GRADES[scene.grade]) {
      state.grade = scene.grade;
      document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('active', b.dataset.grade === scene.grade));
    }
    if (scene.size) {
      const key = Object.keys(SIZES).find((k) => SIZES[k].w === scene.size.w && SIZES[k].h === scene.size.h);
      if (key) {
        state.sizeKey = key;
        document.querySelector(`input[name="size"][value="${key}"]`).checked = true;
      }
    }
    redraw();
  },
  exportPNG,
};

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), window.__vice).catch((err) => {
    status.textContent = `Shot scene failed: ${err.message}`;
  });
} else {
  // The editor opens with the sample photos so the first paint already shows the poster.
  loadSamples().catch(() => redraw());
  if (document.fonts) document.fonts.ready.then(redraw);
}
