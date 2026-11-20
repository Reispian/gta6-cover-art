// Vice Sunset Studio — the cover renderer.
// Draws the multi-panel GTA-style poster onto any canvas at any size: a sunset (or neon / noir / gold)
// background with a sun and a skyline, three photo panels with white borders, and a bold display caption.
// Everything here is original: no Rockstar logo, artwork or font. The display face is Anton (SIL OFL),
// shipped under app/fonts/.
//
// The state this draws:
//   panels: [{ img, zoom, ox, oy }] — one entry per panel; img is an HTMLImageElement or null,
//           zoom a scale factor (>= 1), ox/oy the photo's offset as a fraction of the panel size.
//   title, subtitle: the caption lines.
//   titleColor: the caption fill colour.
//   titlePos: 'bottom' or 'top'.
//   grade: 'sunset' | 'neon' | 'noir' | 'gold'.

export const GRADES = {
  sunset: {
    sky: ['#1b1035', '#4a1d5e', '#a83a6b', '#ff7a3d'],
    sun: '#ffd166',
    sunCore: '#fff3c4',
    panelTop: 'rgba(255, 190, 90, 0.10)',
    panelBottom: 'rgba(255, 60, 140, 0.22)',
    accent: '#ffd166',
    skyline: 'rgba(24, 8, 40, 0.55)',
  },
  neon: {
    sky: ['#0b1035', '#1b2a6b', '#7a2a9e', '#ff2a7a'],
    sun: '#37f5e6',
    sunCore: '#d8fff9',
    panelTop: 'rgba(55, 245, 230, 0.10)',
    panelBottom: 'rgba(255, 42, 122, 0.24)',
    accent: '#37f5e6',
    skyline: 'rgba(8, 10, 40, 0.55)',
  },
  noir: {
    sky: ['#101014', '#23232e', '#3d3d4d', '#6b6b7d'],
    sun: '#e8e8f0',
    sunCore: '#ffffff',
    panelTop: 'rgba(255, 255, 255, 0.08)',
    panelBottom: 'rgba(0, 0, 0, 0.28)',
    accent: '#ffffff',
    skyline: 'rgba(5, 5, 10, 0.6)',
  },
  gold: {
    sky: ['#241505', '#5e3a10', '#b06a1e', '#ffb347'],
    sun: '#fff3c4',
    sunCore: '#fffbe8',
    panelTop: 'rgba(255, 220, 130, 0.12)',
    panelBottom: 'rgba(180, 90, 10, 0.24)',
    accent: '#ffe08a',
    skyline: 'rgba(40, 20, 4, 0.55)',
  },
};

export const GRADE_NAMES = ['sunset', 'neon', 'noir', 'gold'];

// Panel rectangles, in fractions of the canvas width/height, for each aspect and caption position.
// Panel 0 is the hero; panels 1 and 2 are the smaller ones. `rot` is a slight tilt in radians.
function layoutFor(w, h, titlePos) {
  const aspect = w / h;
  const bottom = titlePos !== 'top';
  if (aspect > 1.25) {
    // Landscape 1920 x 1080.
    return {
      panels: bottom
        ? [
            { x: 0.03, y: 0.06, w: 0.54, h: 0.68, rot: -0.015 },
            { x: 0.59, y: 0.06, w: 0.38, h: 0.325, rot: 0 },
            { x: 0.59, y: 0.405, w: 0.38, h: 0.325, rot: 0 },
          ]
        : [
            { x: 0.03, y: 0.17, w: 0.54, h: 0.65, rot: -0.015 },
            { x: 0.59, y: 0.17, w: 0.38, h: 0.31, rot: 0 },
            { x: 0.59, y: 0.5, w: 0.38, h: 0.31, rot: 0 },
          ],
      title: bottom
        ? { x: 0.03, y: 0.78, w: 0.94, h: 0.17 }
        : { x: 0.03, y: 0.02, w: 0.94, h: 0.13 },
    };
  }
  if (aspect < 0.8) {
    // Portrait 1080 x 1350.
    return {
      panels: bottom
        ? [
            { x: 0.04, y: 0.03, w: 0.92, h: 0.5, rot: -0.012 },
            { x: 0.04, y: 0.55, w: 0.45, h: 0.2, rot: 0 },
            { x: 0.51, y: 0.55, w: 0.45, h: 0.2, rot: 0 },
          ]
        : [
            { x: 0.04, y: 0.15, w: 0.92, h: 0.48, rot: -0.012 },
            { x: 0.04, y: 0.65, w: 0.45, h: 0.18, rot: 0 },
            { x: 0.51, y: 0.65, w: 0.45, h: 0.18, rot: 0 },
          ],
      title: bottom
        ? { x: 0.04, y: 0.78, w: 0.92, h: 0.17 }
        : { x: 0.04, y: 0.02, w: 0.92, h: 0.11 },
    };
  }
  // Square 1080 x 1080.
  return {
    panels: bottom
      ? [
          { x: 0.045, y: 0.045, w: 0.585, h: 0.585, rot: -0.018 },
          { x: 0.66, y: 0.045, w: 0.295, h: 0.28, rot: 0 },
          { x: 0.66, y: 0.345, w: 0.295, h: 0.28, rot: 0 },
        ]
      : [
          { x: 0.045, y: 0.17, w: 0.585, h: 0.55, rot: -0.018 },
          { x: 0.66, y: 0.17, w: 0.295, h: 0.26, rot: 0 },
          { x: 0.66, y: 0.45, w: 0.295, h: 0.26, rot: 0 },
        ],
    title: bottom
      ? { x: 0.04, y: 0.66, w: 0.92, h: 0.29 }
      : { x: 0.04, y: 0.02, w: 0.92, h: 0.13 },
  };
}

// A fixed skyline silhouette: the same buildings every time, so exports are deterministic.
const SKYLINE = [0.5, 0.8, 0.62, 1, 0.72, 0.9, 0.58, 0.78, 1, 0.66, 0.85, 0.6, 0.95, 0.7, 0.82, 0.55];

function drawBackground(ctx, w, h, grade) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  grade.sky.forEach((color, i) => sky.addColorStop(i / (grade.sky.length - 1), color));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // The setting sun, low over the skyline.
  const sunR = Math.min(w, h) * 0.17;
  const sunX = w * 0.76;
  const sunY = h * 0.3;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.4);
  glow.addColorStop(0, grade.sunCore);
  glow.addColorStop(0.35, grade.sun);
  glow.addColorStop(1, 'rgba(255, 120, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - sunR * 2.4, sunY - sunR * 2.4, sunR * 4.8, sunR * 4.8);
  ctx.fillStyle = grade.sunCore;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Diagonal light beams across the sky.
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const bx = w * (0.1 + i * 0.28);
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx + w * 0.12, 0);
    ctx.lineTo(bx + w * 0.02, h * 0.6);
    ctx.lineTo(bx - w * 0.1, h * 0.6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // The skyline along the foot.
  const baseY = h * 0.985;
  const maxH = h * 0.09;
  let bx = 0;
  const step = w / SKYLINE.length;
  ctx.fillStyle = grade.skyline;
  SKYLINE.forEach((t, i) => {
    const bw = step * (0.72 + (i % 3) * 0.1);
    const bh = maxH * t;
    ctx.fillRect(bx, baseY - bh, bw, bh);
    bx += step;
  });
  // A few lit windows, placed by index so the picture never changes.
  ctx.fillStyle = 'rgba(255, 210, 110, 0.85)';
  SKYLINE.forEach((t, i) => {
    if (i % 3 !== 0) return;
    const wx = i * step + step * 0.3;
    const wy = baseY - maxH * t + maxH * 0.2;
    ctx.fillRect(wx, wy, Math.max(2, w * 0.004), Math.max(2, h * 0.006));
  });
}

function drawPhotoInto(ctx, img, rect, zoom, ox, oy) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * Math.max(1, zoom);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  let dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  let dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  if (dw > rect.w) dx = Math.max(rect.x + rect.w - dw, Math.min(rect.x, dx));
  else dx = rect.x + (rect.w - dw) / 2;
  if (dh > rect.h) dy = Math.max(rect.y + rect.h - dh, Math.min(rect.y, dy));
  else dy = rect.y + (rect.h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawPanel(ctx, panel, rect, grade, w, h) {
  const border = Math.max(3, Math.round(Math.min(w, h) * 0.008));
  ctx.save();
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.translate(cx, cy);
  ctx.rotate(rect.rot);
  ctx.translate(-cx, -cy);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = Math.min(w, h) * 0.02;
  ctx.shadowOffsetY = Math.min(w, h) * 0.008;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(rect.x - border, rect.y - border, rect.w + border * 2, rect.h + border * 2);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (panel.img) {
    drawPhotoInto(ctx, panel.img, rect, panel.zoom, panel.ox, panel.oy);
  } else {
    const empty = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    empty.addColorStop(0, '#3a2350');
    empty.addColorStop(1, '#1d1030');
    ctx.fillStyle = empty;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = `bold ${Math.round(rect.h * 0.09)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('DROP A PHOTO', cx, cy);
  }
  // The colour grade over the photo.
  const tint = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  tint.addColorStop(0, grade.panelTop);
  tint.addColorStop(1, grade.panelBottom);
  ctx.fillStyle = tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawCaption(ctx, zone, state, grade) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (!title && !subtitle) return;
  const cx = zone.x + zone.w / 2;
  let titleSize = zone.h * (subtitle ? 0.52 : 0.72);
  const setFont = (size) => {
    ctx.font = `${Math.round(size)}px Anton, "Arial Black", "Archivo Black", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.03)}px`; } catch { /* older canvas */ }
  };
  setFont(titleSize);
  if (title) {
    while (ctx.measureText(title).width > zone.w * 0.96 && titleSize > 10) {
      titleSize *= 0.94;
      setFont(titleSize);
    }
  }
  const titleY = zone.y + titleSize * (subtitle ? 0.72 : 0.62);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (title) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(20, 5, 35, 0.9)';
    ctx.lineWidth = Math.max(2, titleSize * 0.1);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = titleSize * 0.18;
    ctx.shadowOffsetY = titleSize * 0.04;
    ctx.strokeText(title, cx, titleY);
    ctx.fillStyle = state.titleColor || '#ffffff';
    ctx.fillText(title, cx, titleY);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (subtitle) {
    const subSize = Math.max(10, titleSize * 0.3);
    ctx.font = `bold ${Math.round(subSize)}px "Arial Black", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.4)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = grade.accent;
    ctx.fillText(subtitle, cx, titleY + subSize * 1.9);
  }
  ctx.restore();
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

// Draws the whole cover onto `canvas` (which must already be sized) from `state`.
// Returns the panel rectangles in canvas pixels, for hit-testing in the editor.
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = layoutFor(w, h, state.titlePos);
  const rects = layout.panels.map((p) => ({
    x: p.x * w, y: p.y * h, w: p.w * w, h: p.h * h, rot: p.rot,
  }));
  drawBackground(ctx, w, h, grade);
  state.panels.forEach((panel, i) => drawPanel(ctx, panel, rects[i], grade, w, h));
  // A soft vignette to hold the poster together.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(20, 0, 30, 0)');
  vig.addColorStop(1, 'rgba(20, 0, 30, 0.32)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  drawCaption(ctx, {
    x: layout.title.x * w, y: layout.title.y * h, w: layout.title.w * w, h: layout.title.h * h,
  }, state, grade);
  return rects;
}

// Which panel, if any, holds the point (x, y) in canvas pixels. Rotation is ignored: the tilt is tiny.
export function panelAt(rects, x, y) {
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}
