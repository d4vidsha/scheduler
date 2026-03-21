# The Design System: High-End Editorial Scheduling

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Sanctuary."** Inspired by the intentionality of premium analog stationery and the focused clarity of *Things 3*, this system rejects the cluttered "dashboard" aesthetic of traditional productivity tools. Instead, it treats the desktop interface as a spacious, high-end editorial layout.

We break the "template" look by prioritizing **intentional asymmetry** and **tonal depth**. Rather than boxing content into rigid grids with harsh lines, we use generous whitespace (white-as-structure) and sophisticated typographic scales to guide the eye. The interface shouldn't feel like a piece of software; it should feel like a calm, well-organized desk where only the most important task is in focus.

---

## 2. Colors: The Tonal Landscape
The palette is rooted in a "High-Neutral" base, punctuated by a singular, authoritative indigo. We move away from flat UI by utilizing Material Design-inspired surface tiers to create physical presence.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section off areas of the app. Layout boundaries must be defined exclusively through background color shifts. 
*   **Example:** A sidebar using `surface-container-low` (#f0f4fc) sitting directly against a main content area of `surface` (#f7f9ff).

### Surface Hierarchy & Nesting
Treat the UI as a series of nested physical layers. Use the following tokens to create "elevated" depth without shadows:
*   **Base Layer:** `surface` (#f7f9ff)
*   **Secondary Content:** `surface-container-low` (#f0f4fc)
*   **Interactive Containers:** `surface-container` (#eaeef6)
*   **High-Priority Focus:** `surface-container-lowest` (#ffffff) — Use this for the active task or the current day's schedule to make it "pop" forward.

### The Glass & Gradient Rule
To ensure the app feels premium and custom:
*   **Glassmorphism:** For floating modals or "Now Playing" style task overlays, use `surface-container-lowest` at 80% opacity with a `20px` backdrop-blur.
*   **Signature Textures:** Main CTAs (like "Add New Task") should not be flat. Use a subtle linear gradient from `primary` (#004fa8) to `primary-container` (#0366d6) to provide a "tactile" soul.

---

## 3. Typography: Editorial Authority
We utilize **Inter** (as the web-equivalent to San Francisco) to create an information hierarchy that feels like a high-end magazine.

*   **Display & Headlines:** Use `display-md` (2.75rem) for "Today" or "Upcoming" headers. Set these with tight letter-spacing (-0.02em) to feel authoritative.
*   **Titles:** Use `title-lg` (1.375rem) for task group headers.
*   **Body:** `body-md` (0.875rem) is the workhorse. Ensure a line-height of 1.5 to maintain the "sanctuary" feel.
*   **Monospace Accents:** Use `ui-monospace` exclusively for time-stamps, dates, and keyboard shortcuts to provide a technical, "tool-like" contrast to the editorial headers.

---

## 4. Elevation & Depth: Tonal Layering
Traditional dropshadows are often a "lazy" way to create depth. In this system, we prioritize **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` (#ffffff) card on top of a `surface-container-low` (#f0f4fc) background. The 3% difference in luminance creates a soft, natural lift that is easier on the eyes than a shadow.
*   **Ambient Shadows:** If a card must "float" (e.g., a dragged task), use a shadow tinted with `on-surface` (#171c22): `box-shadow: 0 12px 32px rgba(23, 28, 34, 0.06);`. It should feel like a soft glow of light, not a dark smudge.
*   **Ghost Borders:** If a border is required for accessibility (e.g., input focus), use `outline-variant` (#c2c6d6) at 20% opacity. Never use 100% opaque borders.

---

## 5. Components

### Buttons & CTAs
*   **Primary:** Gradient of `primary` to `primary-container`. Corner radius: `md` (0.75rem).
*   **Tertiary (Ghost):** No background or border. Use `primary` text weight 600. On hover, apply a `surface-container` background.

### Task Cards & Lists
*   **Strict Rule:** No dividers. Separate tasks using `3.5` (1.2rem) of vertical whitespace. 
*   **Interaction:** On hover, the background of a task item should transition to `surface-container-highest` (#dee3eb) with a corner radius of `sm` (0.25rem).

### Inputs & Scheduling Fields
*   **Styling:** Minimalist. No bottom line or box. Use a `surface-container-low` background that expands slightly on focus.
*   **Labels:** Use `label-md` in `on-surface-variant` (#424753), positioned 8px above the input.

### The "Pulse" Indicator
A unique component for this app: A 4px glowing dot using the `primary` color to indicate the current time on the calendar view, utilizing a soft `primary_fixed_dim` outer glow.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins. If the left sidebar is 240px, let the right margin be 80px to create a dynamic, editorial feel.
*   **Do** use `9999px` (Full) rounding for tags and status indicators to contrast with the `0.75rem` (MD) rounding of cards.
*   **Do** prioritize the "Active State" by shifting its background to the brightest possible white (`surface-container-lowest`).

### Don't
*   **Don't** use pure black (#000000) for text. Use `on-surface` (#171c22) to maintain a soft, premium ink-on-paper look.
*   **Don't** use lines to separate calendar hours. Use subtle shifts between `surface` and `surface-container-low` to create the grid.
*   **Don't** crowd the screen. If a view feels busy, increase the spacing scale by one increment (e.g., move from `4` to `5`).