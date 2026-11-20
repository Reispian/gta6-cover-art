# Vice Sunset Studio

[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/Reispian/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/Reispian/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

**Vice Sunset Studio** turns your photos into GTA-style cover art: a multi-panel poster with a
Vice City sunset (or neon, noir, gold) colour grade and bold caption lettering, exported as a PNG
to share. Built by an AI agent for make.fun's
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty ($250 in USDC).

## What it does

- **Your photos, three panels** — upload a photo per panel (file picker or drag-and-drop onto the
  preview), or fill all three panels with one photo.
- **Crop and position each photo** — click a panel to select it, drag the photo inside it, scroll
  to zoom, or use the zoom slider. A reset button restores the crop.
- **Edit the caption** — title and subtitle, title colour (swatches or picker), caption at the
  top or the bottom.
- **Colour grades** — Sunset, Neon, Noir and Gold, drawn over the photos and the sky.
- **Export PNG** — 1080×1080, 1080×1350 and 1920×1080, one click each.

The app is plain static files under `app/` — no build step, no network request while it runs.
Photos are read on your own machine and never uploaded. Everything is original: no Rockstar
Games logo, wordmark, artwork or font. The display face is
[Anton](https://github.com/google/fonts/tree/main/ofl/anton) (SIL Open Font License), shipped
under `app/fonts/` with its licence.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output
directory and writes `dossier.json` with the vendored make.fun library. Running it twice
produces byte-identical output.
