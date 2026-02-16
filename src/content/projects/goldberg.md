---
title: "Goldberg"
date: 2026-02-08
description: "An isometric pixel art personal website built with Astro. Features a day/night cycle, interactive buildings, and real-time Seattle weather."
tech: ["Astro", "TypeScript", "Canvas", "Pixel Art"]
github: "https://github.com/andye132/andye132.github.io"
---

Built this site as a creative, developer-friendly home on the web.

## Features

- Isometric pixel art village with 10 hand-crafted building sprites
- Real-time day/night cycle synced to Seattle time
- Dynamic weather pulled from Open-Meteo API
- Interactive sun — click and drag to change the time of day
- Shooting stars, birds, and jumping fish for ambiance
- Per-pixel directional lighting on all sprites
- Fully static, deployed to GitHub Pages

## Tech

The entire interactive village runs in a single HTML file with a `<canvas>` element at 640x360, scaled up with `image-rendering: pixelated`. Sprites are RLE-encoded into the HTML to avoid extra network requests.
