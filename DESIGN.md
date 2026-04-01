# Design System Specification: The Living Archive

## 1. Overview & Creative North Star
**Creative North Star: The Botanical Curator**
This design system rejects the "SaaS-default" aesthetic in favor of a high-end editorial experience. It balances the warmth of a boutique garden with the methodical precision of a modern laboratory. The layout should feel like a premium printed monograph: spacious, intentional, and authoritative. 

We break the "template" look by utilizing **intentional asymmetry**—offsetting text blocks and using generous, uneven margins—and **tonal depth**. Instead of rigid grids, we treat the screen as a series of layered organic materials. The goal is to move the user from "scrolling through an app" to "navigating a curated collection."

---

## 2. Colors & Surface Philosophy
Our palette is rooted in the earth but refined by the lab. It uses a "Low-Contrast, High-Sophistication" approach.

### The Palette (Material Design Tokens)
*   **Primary (Sage):** `#7A8C6A` — CTAs, active states, icon accents.
*   **Secondary (Bark):** `#5A5040` — Supplemental accents and tonal shifts.
*   **Surface (Parchment):** `#EAE5D2` — Base canvas for all interactions.
*   **Surface Container Low (Sand):** `#D6C9B8` — Section backgrounds and tonal shifts.
*   **Surface Container Highest (Olive):** `#AEBFA0` — Icon circles and subtle green accents.
*   **On-Surface (Olivewood):** `#252820` — High-legibility text, near-black with olive undertone.

### The "No-Line" Rule
**Strict Prohibition:** 1px solid borders are forbidden for sectioning. 
Structure must be defined solely through **Surface Nesting** or **Tonal Transitions**. To separate a sidebar from a main feed, transition from `surface` to `surface-container-low`. To highlight a featured module, use a `surface-bright` container on a `surface` background.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine papers.
*   **Base:** `surface` (#EAE5D2) — Parchment
*   **Sectioning:** `surface-container-low` (#D6C9B8) for large background shifts — Sand
*   **Floating Elements:** `surface-container-lowest` (#F5F1E6) for cards to create a "lifted" feel.

### The "Glass & Gradient" Rule
To add a "Laboratory" polish, use **Glassmorphism** for floating navigation or overlays. 
*   **Style:** `surface` color at 85% opacity with a `20px` backdrop-blur. 
*   **Signature Texture:** Apply a subtle radial gradient from `primary` (#625d3a) to `primary-container` (#7b7551) on Hero CTAs to give them a soft, velvet-like glow rather than a flat digital fill.

---

## 3. Typography
We pair the high-contrast, variable serif **Fraunces** (The Curator) with the functional precision of **Inter** (The Scientist).

*   **Display & Headlines (Fraunces):** Use these for storytelling and section headers. Set `headline-lg` and above with slightly tighter letter spacing (-2%) to mimic high-end editorial print.
*   **Body & Labels (Inter):** Use for all functional data. Inter provides the "Laboratory" feel—clean, traceable, and objective.
*   **Visual Hierarchy:** Always lead with a large `display-md` serif headline, followed by a wide `body-lg` sans-serif lead paragraph to create an "Article" feel.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than structural shadows.

*   **The Layering Principle:** Place a `surface-container-lowest` (White) card on a `surface-container-low` (Sand) background. This creates a natural, soft lift without a single drop shadow.
*   **Ambient Shadows:** If a card must float (e.g., a modal), use a "Botanical Shadow":
    *   `X: 0, Y: 12, Blur: 40, Spread: -4`
    *   Color: `on-surface` (#1c1c19) at **4% opacity**. It should be felt, not seen.
*   **The "Ghost Border":** For input fields or cards requiring definition, use the `outline-variant` token at **15% opacity**. A 100% opaque border is too "heavy" for this system.

---

## 5. Components

### Buttons: The Precision Pill
*   **Primary:** Pill-shaped (`rounded-full`). Background: `primary` (#625d3a). Text: `on-primary` (#ffffff).
*   **Secondary:** Pill-shaped. Background: `transparent`. Border: `outline-variant` at 20% opacity. 
*   **Interactions:** On hover, the primary button should shift to `primary-container` with a subtle `4px` vertical lift.

### Cards: The Specimen Tray
*   **Styling:** No borders. Use `surface-container-lowest` background. 
*   **Spacing:** Minimum `padding: 24 (6)` to ensure content has "breathing room."
*   **Content:** Avoid horizontal dividers. Use vertical spacing (`spacing-8`) to separate header from body.

### Inputs: The Lab Log
*   **Style:** Underlined or subtle `surface-variant` fill. No heavy boxes.
*   **Icons:** Use 1.5px stroke linear icons. They must be the same color as the text (`on-surface-variant`).

### Signature Component: The Specimen Header
A unique layout pattern: A large `display-sm` headline offset to the left, with a small `label-md` "Traceability Code" (e.g., SEED-0042) in a `secondary-container` pill floating to the top right.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace Asymmetry:** Align text to the left but allow imagery to bleed off the right edge of the grid.
*   **Use Generous White Space:** If you think there is enough space, add `spacing-4` more. 
*   **Type Contrast:** Mix large Serif headlines with very small, all-caps Sans-serif labels for a "technical" look.

### Don't:
*   **Don't use pure Black (#000):** Use `on-surface` (Ink) for all text to maintain warmth.
*   **Don't use Divider Lines:** Use background color shifts (`surface` to `surface-container-low`) to separate content sections.
*   **Don't use Rounded Corners < 1rem:** Except for small chips, keep the "softness" consistent with `rounded-md` (1.5rem) or `rounded-lg` (2rem).