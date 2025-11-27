# Modular Storytelling Deck

An immersive, single-page presentation framework for storytelling with text, data visuals, tables, and cards. Everything renders in the browser using vanilla ES modules and D3, so the deck can be served from any static host while still supporting animated charts, responsive typography, and looping video backgrounds.

## Highlights
- **Modular slides** – Every scene is defined in `js/slides/deck.js` using a single schema. Slides can mix multiple figures (text, charts, tables, cards, etc.) while keeping layout, typography, and reveal timing consistent.
- **Rich chart library** – The `js/charts` directory exposes lightweight builders for line, ridge, timeline, scatter, geo maps, Sankey, chord, and more. Each chart accepts declarative props so you never touch DOM glue code.
- **Animated backgrounds** – The background manager streams looping video layers per slide group so sections feel distinct while remaining performant.
- **Zero build step** – Dependencies (D3, d3-sankey, topojson) are loaded via CDN ES modules; the rest of the code is plain JavaScript/CSS.

## Getting Started

### Requirements
No build is required, but browsers block `import` statements when opening files via the `file://` protocol. Serve the repo from a local HTTP server, for example:

```bash
cd CCGL9074
python3 -m http.server 4173
# or: npx serve .
```

Then visit `http://localhost:4173` (or the port you selected). The deck auto-loads, warms the needed topojson files, and you can use the dot navigation to jump between slides.

### Deploying
Because the project is static, you can host it on GitHub Pages, Netlify, Vercel, or any CDN/Apache/Nginx bucket. Copy the repo contents as-is; ensure the `/media` videos remain alongside the HTML for the background manager to find them.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `index.html` | Entry point. Sets up the dot navigation and bootstraps the deck via `js/core/engine.js`. |
| `css/styles.css` | Global styles, type scale tokens, grid overlay, and chart-specific classes. |
| `js/deps.js` | Imports D3, d3-sankey, and topojson via CDN ES modules and exposes a `depsReady` promise. |
| `js/core/` | Rendering engine, layout helpers, background manager, topojson warming utilities. |
| `js/charts/` | Chart builders plus the `registry` that maps `figure.type` names to builders. |
| `js/slides/deck.js` | The actual content: theme tokens, media/background groups, and every slide definition. |
| `media/` | Video loops used for the background groups. You can drop additional footage here if you add new groups. |

## Slide Schema

Each slide entry in `js/slides/deck.js` follows the same structure:

```js
{
  id: 'scene-map',
  group: 'group-1',     // controls which background video to show
  nav: 'Map',           // label used by the dot navigation
  label: 'Optional caption displayed above the chart',
  figures: [
    {
      type: 'text',
      figSel: '#text-map',
      props: {
        kicker: 'Where are we focused?',
        title: 'Regional performance highlights',
        subtitle: 'Use rich text/markup for emphasis.',
        align: 'center',
        halign: 'center',
        sizes: { title: 'xs', subtitle: 'xs', body: 'xs' }
      }
    },
    {
      type: 'geo',
      figSel: '#map-canvas',
      props: { /* declarative chart configuration */ }
    }
  ],
  caption: 'Optional footer copy below the scene'
}
```

Multiple figures render in the order declared. The layout helpers automatically reserve vertical real estate for text, tables, or fully visual slides. When you only need text, simply provide a single `{ type: 'text' }` figure.

### Slide-Area Helpers
- `group`: Maps to a background group declared in `mediaGroups`. Switching groups swaps the looping video.
- `theme`: Optional per-slide CSS custom properties (e.g., change `--bg` or accent colors).
- `layout`: Override `textFrac`, `figFrac`, or `gapFrac` if a chart needs more/less space.

## Chart Builders

Charts live under `js/charts`, are registered once in `js/charts/registry.js`, and are referenced by name in `figures`. Patterns worth knowing:

- **Geo (`type: 'geo'`)** – Handles bubbles, flows, hexgrids, plumes, and choropleths through the `layers` prop.
- **Line/Timeline/Scatter/Ridge/Hist** – Standard D3-driven SVG charts. Provide data arrays and styling props; the builder takes care of scales, axes, and transitions.
- **Table/Cards/Credits/Text** – DOM-native builders for structured or typographic content. Tables automatically adjust height and show scrollbars when needed.
- **Custom charts** – Drop a new builder into `js/charts`, register it in `registry.js`, and reference it via `figure.type`.

All builders share a few conventions:
- `figSel` is the CSS selector (usually an id) where the figure mounts.
- `props.graphOpacity` lets you fade in charts in sync with scene chrome.
- Animations and tooltips are defined per chart to keep `deck.js` declarative.

## Background & Media

`js/core/background.js` defines a `BackgroundManager` that pre-registers each `mediaGroup`. A group looks like:

```js
{ id: 'group-1',
  media: { type: 'video', src: 'media/vid-overview c.mp4', muted: true, loop: true, autoplay: true, opacity: 1 },
  overlay: { opacity: 0.5 }
}
```

Assign the `group` id on any slide to cue that layer. Videos loop silently and resume playback when their group becomes active. You can point the `src` to hosted MP4s or swap in static images (`type: 'image'`).

## Styling & Theming

Global tokens are defined under `deck.themeVars`. These CSS custom properties drive the typography scale in `text.js`, chart colors, and the background gradient. Adjust them to rebrand the entire deck. For deep styling:

- Update `css/styles.css` to tweak layout, captions, dot navigation, or chart-specific classes.
- Override tokens per slide via `theme: { '--brand': '#f0f' }`.
- Use the `align` and `halign` props inside text figures to control horizontal placement.

## Editing Tips

- Topojson performance: `js/core/geoWarm.js` warms frequently used topojson assets. Add URLs there (and invoke `warmMany`) whenever a new geo asset is used to prevent jank when a slide scrolls into view.
- Keep IDs unique: every `figSel` should be unique within the deck to avoid DOM collisions when charts mount lazily.
- Reusability: Since each chart builder is a pure function, you can create helper functions in `deck.js` that return props (e.g., `const baseLineChart = (series) => ({ ... })`).

## Troubleshooting

- **Blank screen / console `CORS` errors** – Make sure you are serving the project over HTTP (see “Getting Started”).
- **Videos not autoloading** – Some browsers require user interaction before autoplaying. All background videos are muted and `playsInline`, but if you target desktop Safari consider adding fallback images.
- **New topojson never loads** – Confirm the URL is HTTPS and accessible from the browser. Use `warmMany([url])` near the top of `deck.js` or the specific slide module.

With this structure you can focus on storytelling: edit `deck.js` for content, tweak `css/styles.css` for look-and-feel, and extend `js/charts` when you need bespoke visuals. Enjoy building narrative decks on any topic!
