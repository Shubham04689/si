# Strategic Map Application: UI Design & Components Documentation

This document outlines the User Interface (UI) design principles, visual aesthetics, layout strategies, and specific React components that power the Strategic Map Explorer application.

## 1. Core Component Architecture

The application is structured into a central orchestration layer (`App.jsx`) and several focused sub-components.

- **`App.jsx`**:
  The root component. It manages the global state (the active graph data), layout interactions (modal/panel visibility), and handles data manipulations (Builder Mode actions). It overlays a persistent glassmorphism header containing action buttons (AI Generate, Edit Mode, Export).
- **`DataLoader.jsx`**:
  The entry point when no map is loaded. It provides a drag-and-drop / file upload interface for a custom JSON schema and an option to create a "Blank Map" for Builder mode.

- **`GraphEngine.jsx`**:
  The core visualization component utilizing `react-force-graph-2d`. It is responsible for rendering the network graph on an HTML5 Canvas.
  - Controls physics simulations (negative charge to avoid overlap).
  - Handles custom node and link drawing logic (hollow rings, center halos, node text sizes).
  - Manages zoom and camera animations when the focus changes.
- **`IntelligencePanel.jsx`**:
  A slide-over right-side panel that displays rich contextual data about the currently selected node. It features reading views and editing forms (Builder Mode).

- **`AiCommandCenter.jsx`**:
  A full-screen, blurred modal where users enter a research prompt to automatically generate massive strategic maps via LLM integration.

- **`AiSettings.jsx`**:
  A settings modal for configuring the model endpoint (useful for local models like Ollama) and API keys.

---

## 2. Global UI Design Principles & Aesthetics

The design system adopts a **"Dark Premium / Glassmorphism"** theme, typical of high-end intelligence or cyber-analytics dashboards (e.g., Palantir, WEF Strategic Intelligence).

### A. Color Palette

- **Background ($background):** `#0a0f1c` (Deep blue-black, reducing eye strain and increasing contrast for glowing elements).
- **Surface / Layers:** `bg-gray-900/50` to `bg-gray-900/95` combined with `backdrop-blur-xl` properties. This creates depth and hierarchy.
- **Accents (Neon & Jewel Tones):**
  - **Purple (#a855f7 / #c084fc):** Used for AI-related actions (AI Generate, AI Suggestions) and History states within the graph.
  - **Amber / Gold (#d4af37 / #f59e0b):** Denotes Builder Mode ("Add Planet"), Center Nodes, and warnings.
  - **Blue (#3b82f6 / #60a5fa):** Primary highlight for link creation, the "Key Insight" block, and general hover states on the graph canvas.
  - **Emerald (#10b981):** Highlights quantitative metrics and positive interactions (e.g., "Connect").

### B. Typography

- **Primary Font:** `sans-serif` (Often pointing to modern geometrics like `Inter`, `Roboto`, or `Outfit`).
- **Font Weights:** Heavy use of `font-light` for large headers to give a sophisticated editorial feel, combined with `font-medium` or `font-semibold` for smaller, uppercase contextual labels (e.g., `text-xs uppercase tracking-widest`).

### C. Visual Effects

- **Glassmorphism:** Achieved via Tailwind utilities (`bg-gray-950/80 backdrop-blur-md`). Used heavily in the headers, floating panels, and modals.
- **Glow & Drop Shadows:**
  - Outer glows on buttons (`shadow-purple-500/20`).
  - Drop shadows on canvas nodes during hover (`ctx.shadowBlur = 15; ctx.shadowColor = '#60a5fa'`).
- **Micro-animations:**
  - Pulsing loader states (`animate-pulse`).
  - Bouncing icons during AI synthesis (`animate-bounce`).
  - Smooth side-panel transitions (`transition-transform duration-500 translate-x-0`).

---

## 3. Detailed Component breakdown

### IntelligencePanel (The Info Sidebar)

_Purpose:_ Displays node details and provides editing capabilities.

- UI Elements:
  - **Header:** Node type Pill (Macro Trend vs Strategic Issue) + Node Title.
  - **Key Insight Block:** A highlighted accent box (`bg-blue-900/10` with a solid blue left-border) to emphasize the core takeaway.
  - **Metrics Grid:** A 2-column grid displaying quantitative data.
  - **Related Concepts (Pills):** Sub-topics rendered as purple-tinted rounded badges.
  - **Builder Controls:** Split buttons to "Add Planet/Satellite" or "Link Existing", revealing detailed forms.
  - **AI Suggestions:** An interactive block that suggests edge creations automatically.

### GraphEngine (The Visualization)

_Purpose:_ Interactive network layout.

- Drawing Logic:
  - **Center Node:** Solid dark-gold fill (`#806433`) with a bright gold stroke (`#d4af37`) and an outer halo. Size 18.
  - **History Node:** Transparent fill, purple stroke (`#a855f7`), size 6.
  - **Macro / Trend Nodes:** Transparent/hollow rings (`size=4`), white stroke.
  - **Satellite Nodes:** Tiny rings (`size=2`).
  - **Hover States:** Dimming unconnected nodes while brightening the selected node and its direct neighbors with a vivid blue glow outline.
  - **Links:** Subdued/thin opacity lines, which become brighter and thicker when hovering their associated nodes.

### AiCommandCenter (The Generation Modal)

_Purpose:_ Creating new maps.

- UI Elements:
  - Decorative background blurs (purple/blue rounded absolute divs with `blur-[150px]`).
  - A large dark text area with borders that dynamically transition to purple on focus.
  - A prominent "Generate" button that disables and triggers an animated "Synthesizing Network" skeleton state while waiting for the LLM.

### Interactive "Edit/Builder" Mode

The UI intelligently handles two distinct states:

1. **Explorer Mode (Default):** Read-only view intended for consuming the map data. Actions involve panning, zooming, opening panels, exporting, and viewing relationships.
2. **Builder Mode (`isEditMode = true` toggled from the App header):** Converts elements in the `IntelligencePanel` into active text inputs/textareas, reveals the form elements to create nodes and links, and turns on AI relationship suggestions. Note the stylistic shift: The "Edit Mode" button illuminates as Amber to loudly indicate the state change.
