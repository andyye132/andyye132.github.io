#!/usr/bin/env node
/**
 * sync-blogs.mjs
 * Reads RTF files from public/Pages/Creative/Blog Archive/blogs/,
 * strips RTF formatting, and generates markdown content collection entries.
 *
 * Naming convention:
 *   RTF:   MM_DD_YYYY_Title_Words.rtf
 *   Image: Title_Words.png (or .jpg/.jpeg)
 *
 * Drop a new RTF + image into the Blog Archive folder and rebuild — it auto-appears.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const BLOG_SRC = join(ROOT, 'public/Pages/Creative/Blog Archive/blogs');
const CONTENT_DIR = join(ROOT, 'src/content/blog');
const IMG_DIR = join(ROOT, 'public/blog-images');

if (!existsSync(BLOG_SRC)) {
  console.log('No Blog Archive folder found, skipping sync.');
  process.exit(0);
}
if (!existsSync(IMG_DIR)) mkdirSync(IMG_DIR, { recursive: true });
if (!existsSync(CONTENT_DIR)) mkdirSync(CONTENT_DIR, { recursive: true });

// ── Tag map (slug → tags) ────────────────────────────────────────
const TAG_MAP = {
  'robbery':    ['psychology', 'learning'],
  'bad-advice': ['psychology', 'narcissism'],
  'be-cocky':   ['psychology', 'motivation'],
  'minifigure': ['psychology', 'identity'],
  'meaning':    ['philosophy', 'existentialism'],
  'on-media':   ['psychology', 'media'],
  'on-music':   ['music', 'psychology'],
};

// ── RTF → plain text ──────────────────────────────────────────────
function stripRtf(raw) {
  let text = raw;

  // Remove outermost braces
  if (text.startsWith('{')) text = text.slice(1);
  if (text.endsWith('}')) text = text.slice(0, -1);

  // Remove header groups (font table, color table, etc.)
  text = text.replace(/\{\\fonttbl[^}]*(\{[^}]*\})*[^}]*\}/g, '');
  text = text.replace(/\{\\colortbl[^}]*\}/g, '');
  text = text.replace(/\{\\\*\\expandedcolortbl[^}]*\}/g, '');

  // Hex-encoded special characters (Windows-1252)
  text = text.replace(/\\'92/g, '\u2019');
  text = text.replace(/\\'93/g, '\u201C');
  text = text.replace(/\\'94/g, '\u201D');
  text = text.replace(/\\'96/g, '\u2013');
  text = text.replace(/\\'97/g, '\u2014');
  text = text.replace(/\\'a0/g, ' ');
  text = text.replace(/\\'85/g, '\u2026');
  text = text.replace(/\\'[0-9a-fA-F]{2}/g, '');

  // RTF line break: backslash followed by newline
  text = text.replace(/\\\r?\n/g, '\n');

  // \pard (paragraph reset) → newline
  text = text.replace(/\\pard[^\\\n{}]*/g, '\n');

  // Detect RTF italic blocks (\i ... \i0) BEFORE stripping control words.
  // Short italic runs → *italic*, long ones → blockquote.
  text = text.replace(/\\i(?=[^a-zA-Z0-9])\s?([\s\S]*?)\\i0(?=[^a-zA-Z])\s?/g, (_, inner) => {
    let clean = inner.replace(/\\[a-zA-Z]+[-]?[0-9]* ?/g, '').replace(/[{}]/g, '').trim();
    if (!clean) return '';
    if (clean.length > 80) {
      // Long italic block → blockquote; split by quoted phrases or sentences
      let lines;
      // If it looks like a list of quoted phrases: "...", "...", "..."
      if (/^[""\u201C]/.test(clean) && (clean.match(/[""\u201C\u201D]/g) || []).length >= 4) {
        lines = clean.split(/(?<=[""\u201D]),\s*/).map(l => l.trim()).filter(Boolean);
      } else {
        lines = clean.split(/(?<=[.!?])\s+/).filter(l => l.trim());
      }
      return '\n\n' + lines.map(l => '> ' + l).join('\n') + '\n\n';
    }
    return '*' + clean + '*';
  });

  // Remove all other RTF control words (\word, \word123, \word-1)
  text = text.replace(/\\[a-zA-Z]+[-]?[0-9]* ?/g, '');

  // Remove remaining braces
  text = text.replace(/[{}]/g, '');

  // Handle (Italics) / (End italics) text markers → blockquote
  text = text.replace(/\(Italics?\)\s*\n*([\s\S]*?)\n*\s*\(End italics?\)/gi, (_, content) => {
    const lines = content.trim().split('\n').filter(l => l.trim());
    return '\n\n' + lines.map(l => '> ' + l.trim()).join('\n') + '\n\n';
  });

  // Clean up whitespace per line
  text = text.split('\n').map(l => l.trimEnd()).join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  // Enforce visible line breaks: every single newline becomes a paragraph break
  // so there's clear spacing between lines.
  text = text.split('\n\n').map(para => {
    // Don't touch blockquote paragraphs (lines starting with >)
    if (para.trim().startsWith('>')) return para;
    return para.replace(/\n/g, '\n\n');
  }).join('\n\n');
  // Collapse any 3+ newlines back to exactly 2
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

// ── Discover RTF + image files ────────────────────────────────────
const allFiles = readdirSync(BLOG_SRC);
const rtfFiles = allFiles.filter(f => /\.rtf$/i.test(f));
const imgFiles = allFiles.filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f));

const posts = [];
for (const f of rtfFiles) {
  const match = f.match(/^(\d{1,2})_(\d{2})_(\d{4})_(.+)\.rtf$/i);
  if (!match) { console.warn(`  skip: ${f} (doesn't match MM_DD_YYYY_Title.rtf)`); continue; }

  const [, month, day, year, titlePart] = match;
  const dateStr = `${year}-${month.padStart(2, '0')}-${day}`;
  const slug = titlePart.toLowerCase().replace(/_/g, '-');
  const title = titlePart.replace(/_/g, ' ');

  // Parse RTF body
  const raw = readFileSync(join(BLOG_SRC, f), 'utf-8');
  let body = stripRtf(raw);

  // Remove leading "Title: ..." or "Working With: ..." lines
  body = body.replace(/^Title:[^\n]*\n*/i, '');
  body = body.replace(/^Working With:[^\n]*\n*/i, '');

  // Find matching image (same title part, any image extension)
  const img = imgFiles.find(i => {
    const base = i.substring(0, i.lastIndexOf('.'));
    return base === titlePart;
  });
  if (img) {
    copyFileSync(join(BLOG_SRC, img), join(IMG_DIR, img));
  }

  // Build description (first ~150 chars, strip <br> tags)
  const flat = body.replace(/<br>/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  const desc = flat.length > 150 ? flat.substring(0, 147) + '...' : flat;

  // Look up tags
  const tags = TAG_MAP[slug] || [];

  posts.push({ slug, title, dateStr, body, desc, image: img ? `/blog-images/${img}` : null, tags });
}

// Sort newest first
posts.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

// ── Generate markdown files ───────────────────────────────────────
for (const p of posts) {
  const tagStr = p.tags.map(t => `"${t}"`).join(', ');
  const lines = [
    '---',
    `title: "${p.title.replace(/"/g, '\\"')}"`,
    `date: ${p.dateStr}`,
    `description: >-`,
    `  ${p.desc.replace(/"/g, '\\"')}`,
    `tags: [${tagStr}]`,
  ];
  if (p.image) lines.push(`image: "${p.image}"`);
  lines.push('---', '', p.body, '');

  writeFileSync(join(CONTENT_DIR, `${p.slug}.md`), lines.join('\n'));
}

console.log(`Synced ${posts.length} blog posts from Blog Archive.`);
