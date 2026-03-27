# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Seedings Lab** — A landing page for a Chilean influencer seeding marketing service. Single-file HTML app using Tailwind CSS via CDN.

## Stack

- **Single file:** `code.html` — all HTML, CSS, and JS in one file
- **Tailwind CSS** via CDN (`cdn.tailwindcss.com?plugins=forms,container-queries`) with inline `tailwind.config` in a `<script id="tailwind-config">` block
- **Fonts:** Google Fonts — `Fraunces` (headlines/display) + `Inter` (body/labels)
- **Icons:** Material Symbols Outlined (Google CDN), weight 300, fill 0

No build step. Open `code.html` directly in a browser to preview.

## Design System

All design decisions are governed by [DESIGN.md](DESIGN.md). Read it before making any visual changes. Key rules:

### Color Tokens (Tailwind class names)
All colors are defined as custom tokens in `tailwind.config`. Use them as Tailwind classes — never hardcode hex values in markup.

| Token | Hex | Purpose |
|---|---|---|
| `primary` | `#8D8761` | Active states, CTAs, icons |
| `secondary` | `#705a46` | Supplemental accents |
| `surface` | `#fdf9f4` | Base canvas |
| `surface-container-low` | `#f7f3ee` | Section backgrounds |
| `surface-container-lowest` | `#ffffff` | Lifted cards |
| `on-surface` | `#1c1c19` | Body text (never use `#000`) |
| `on-surface-variant` | `#49473c` | Secondary text |
| `outline-variant` | `#cbc6b9` | Ghost borders (always at low opacity) |

### Critical Design Rules
- **No 1px solid borders** for sectioning — use tonal background shifts instead
- **No divider lines** between content sections
- **No pure black** — use `on-surface` (`#1c1c19`) for all text
- **Rounded corners** minimum `rounded-md` (1rem); `rounded-full` for pills/buttons
- **Buttons:** always `rounded-full` pill shape
- **Cards:** `surface-container-lowest` bg, no borders, minimum `p-6` padding
- **Ghost borders:** `border-outline-variant/10` to `border-outline-variant/30` opacity range
- **Botanical shadow:** `shadow` with `on-surface` at 4% opacity — felt, not seen

### Typography
- `font-['Fraunces']` or `font-headline` — all `h1`–`h3`, display text, large numbers
- `font-['Inter']` or `font-body` / `font-label` — all body copy, labels, captions
- Headline letter-spacing: `-tracking-tight` (-2%)
- Label pattern: `text-xs uppercase tracking-widest font-bold` for section eyebrows

### Signature Patterns
- **Specimen Header:** Large display headline left-aligned + small `label-md` code pill (`SEED-XXXX`) top-right in `secondary-container`
- **Pain point cards:** `aspect-square`, `border-b-4 border-primary/20`, number in Fraunces `opacity-40` → `opacity-100` on hover
- **Process steps:** Large faded number (`text-primary/10`) + icon circle (`bg-surface-container-highest`)
- **Glassmorphism nav:** `bg-[#fdf9f4]/85 backdrop-blur-md`

## Page Structure (sections in order)

1. **Nav** — fixed, glassmorphism, max-w-7xl
2. **Hero** — 2-col grid, asymmetric image (rotated card), floating social proof chip
3. **Pain Points** — `bg-surface-container-low`, 5-col grid of square cards
4. **Solution** — 2-col, image left + 3 feature rows with icon circles
5. **How it Works** — 4-col methodology steps
6. **Dashboard Mockup** — 5-col grid, inline SVG chart, stat cards
7. **Entregables** — 5-col deliverable cards
8. **Packages** — 3 pricing tiers, center card (`bg-primary`) is featured with `md:scale-105`
9. **FAQ** — `<details>`/`<summary>` accordion, max-w-800px centered
10. **CTA + Form** — full-width `bg-primary rounded-[3rem]`, 2-col with contact form
11. **Footer** — `bg-[#f7f3ee] rounded-t-[2rem]`
