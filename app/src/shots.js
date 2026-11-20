// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos loaded;
// ?shot=cover shows the cover alone at the requested export size. Query parameters:
//   photoA, photoB, photoC — sample names (pier, boulevard)
//   title, subtitle — the caption lines
//   grade — sunset, neon, noir, gold
//   size — 1080x1080, 1080x1350 or 1920x1080
// window.__shotReady is set once the scene is painted, and window.__vice.exportPNG is the
// app's own export, so a cover screenshot is the PNG the app wrote.
export async function runShot(shot, query, vice) {
  const grade = query.get('grade') || 'sunset';
  const size = query.get('size') || '1080x1080';
  const [w, h] = size.split('x').map(Number);
  const title = query.get('title') ?? 'Vice Sunset';
  const subtitle = query.get('subtitle') ?? 'A Leonida Story';
  const photos = [
    query.get('photoA') || 'pier',
    query.get('photoB') || 'boulevard',
    query.get('photoC') || 'pier',
  ];
  const imgs = [];
  for (const name of photos) {
    imgs.push(await vice.loadSample(name));
  }
  vice.applyScene({
    title, subtitle, grade, size: { w, h },
    // The third panel is a wide, short strip: zoom in a touch and shift the photo down
    // so a face is framed instead of cut at the chin.
    panels: imgs.map((img, i) => ({ img, zoom: i === 2 ? 1.1 : 1, ox: 0, oy: i === 2 ? 0.08 : 0 })),
  });
  if (shot === 'cover') document.body.classList.add('shot-cover');
  // Wait for the display font so the caption is drawn in Anton, not the fallback.
  if (document.fonts) {
    try { await document.fonts.load('100px Anton'); } catch { /* fallback font */ }
    await document.fonts.ready;
    vice.redraw();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
