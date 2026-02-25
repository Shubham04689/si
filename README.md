# Strategic Intelligence Map

A dynamic, immersive knowledge graph and strategic intelligence application built with React, Vite, and Tailwind CSS. It leverages force-directed physics graphs and hierarchical mind map layouts to visualize, analyze, and expand complex topics.

## 🚀 Features

### Interactive Topological Graph (Home)

- **Deep Space Aesthetics:** An immersive deep space gradient background with orbital ring guides, frosted glassmorphism UI components, and glowing active interactions.
- **Dynamic Physics Engine:** Nodes are rendered using `react-force-graph`, allowing them to organically orbit and connect based on defined gravity constraints.
- **Chronological Timelines:** Nodes are dynamically color-coded based on their execution timeline, transitioning from warm reds (oldest) to vibrant blues (newest).
- **Advanced Viewport Controls:** Explicit zoom controls, zoom-to-fit framing, and a "Zoom Lock" to prevent auto-panning while editing data deeply.

### AI Engine Integration

- **Auto-Fill Intelligence:** Harness a local or remote AI model (e.g., Llama 3 via Ollama) to automatically analyze a node and generate structured intelligence.
- **Extracted Context:** Automatically extracts an Executive Summary, Key Insights, Detailed Briefing Notes, Further Challenges, and Relevant Sub-Topics.
- **Contextual Connection Suggestions:** Replaces random link suggestions with strictly validated, AI-driven contextual correlations between unconnected nodes in the graph based on topological relevance.

### Structured Mind Map (History)

- **Bilateral Hierarchy Layout:** Seamlessly translate geometric physics forces into a strict, perfectly balanced horizontal D3 Mind Map.
- **Intelligent Routing:** Beautifully curved Bézier links map the pure hierarchy, while dashed cross-links representing complex external relations float in the background.
- **Interactivity:** Includes drag-to-pad panning, interactive node links jumping back to the interactive space view, and a dedicated Dark Mode toggle.

### PDF Report Exporting

- **One-Click Briefings:** Convert your visual intelligence network into a formatted multi-page PDF document entirely client-side.
- Generates a Title Page, Executive Summary, Node-by-Node detailed breakdowns, and an organized Network Architecture association table using `jsPDF`.

## 🛠️ Technology Stack

- **Frontend:** React, Vite, TailwindCSS
- **Network Rendering:** `react-force-graph-2d` (Home Graph), `d3-hierarchy` / `d3-zoom` (History Graph)
- **Exporting:** `jspdf`, `jspdf-autotable`
- **Icons / Typography:** `lucide-react`
- **AI Integration:** Seamless connection to any standard completions API interface (local or remote).

## 📦 Getting Started

### Prerequisites

Node.js installed locally on your machine.

### Installation

1. Clone or download the source code locally.
2. Open your terminal in the root directory representing the project (`strategic-map/`).
3. Install standard frontend dependencies:
   ```bash
   npm install
   ```

### Running Locally

Launch the high-performance Vite server:

```bash
npm run dev
```

Navigate to `http://localhost:5173` in your browser to begin exploring the graph.

## ⚙️ Usage Workflow

1. **Initialize:** Click `Initialize Blank Topology` to start from scratch.
2. **Build Data:** Enable `Builder Mode` (Editing icon) to rapidly generate branches conceptually related to the central hub.
3. **Generate Intelligence:** Select a newly drafted node. In the Intelligence Panel, use the AI commands to auto-populate high-value strategies and summaries.
4. **Discover Connections:** Navigate to the `Network` tab and click `Suggest Co-Related Connections` to find missing paths between seemingly distant topics via AI analysis.
5. **Review:** Toggle over to the `History` mind map to read the active cluster sequentially.
6. **Export:** Export the final product as a comprehensive structured PDF report for distribution.
