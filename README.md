# @pixieditor/core

A TypeScript WebGL visual editor library built on [PixiJS](https://pixijs.com).
Drop it into any web app to get a full-featured design editor with drag, resize, snap, layers, undo/redo, and extensible format controls.

---

## Features

| Feature | Details |
|---|---|
| **Rendering** | WebGL via PixiJS — smooth 60fps, GPU-accelerated |
| **Elements** | `box` (nestable), `image`, `text` |
| **Free positioning** | Toggle any element to escape its parent and pin to the root canvas |
| **Snap system** | Grid · Canvas edges & center · Element edges & centers · Smart guides |
| **Formats / styling** | Background, color, padding, border, radius, shadow, opacity, circle, font, text-align, size, rotation |
| **Text editing** | DOM overlay synced to canvas position, full cursor support |
| **Bubble toolbar** | Floating formatting bar on text selection |
| **Layers panel** | Reorder (drag), visibility, lock, up/down/top/bottom buttons |
| **Properties panel** | All format controls with live update |
| **History** | Snapshot-based undo/redo (committed on action completion) |
| **Menu bar** | Built-in File / Edit / View + consumer-defined items & export formats |
| **Theming** | CSS variable–based, fully overridable |
| **TypeScript** | 100% typed — full IntelliSense on `EditorAPI` |

---

## Installation

```bash
npm install @pixieditor/core pixi.js
```

`pixi.js` is a peer dependency — you control the version.

---

## Quick start

```ts
import { createEditor } from '@pixieditor/core';

const api = createEditor({
  container: document.getElementById('editor')!,
  document: { width: 1200, height: 800, name: 'My Design' },
  onReady: (api) => {
    // Add a box programmatically
    const id = api.addElement('box', null, {
      x: 100, y: 100, width: 300, height: 200,
      backgroundColor: '#6366f1',
    });
    api.selectElement(id);
  },
});
```

The container must have an explicit `width` and `height` (via CSS or inline style).

---

## Next.js integration

PixiJS requires DOM APIs — never import it on the server.

```tsx
// app/editor/page.tsx (or pages/editor.tsx)
import dynamic from 'next/dynamic';

const PixiEditorWrapper = dynamic(
  () => import('@/components/PixiEditorWrapper'),
  { ssr: false }
);

export default function EditorPage() {
  return <PixiEditorWrapper style={{ width: '100vw', height: '100vh' }} />;
}
```

See [`examples/nextjs/`](./examples/nextjs/) for a complete reference with `useEditorAPI` hook,
custom top bar, save/restore from localStorage, and full TypeScript types.

---

## EditorAPI reference

```ts
interface EditorAPI {
  // Document
  getDocument(): DocumentState;

  // Selection
  getSelection(): SelectionState;
  selectElement(id: string, additive?: boolean): void;
  clearSelection(): void;

  // Elements
  addElement(type: ElementType, parentId?: string | null, style?: Partial<ElementStyle>): string;
  removeElement(id: string): void;
  updateStyle(id: string, patch: Partial<ElementStyle>): void;
  updateContent(id: string, content: string): void;   // text elements
  updateSrc(id: string, src: string): void;            // image elements
  setFree(id: string, free: boolean): void;

  // Layers
  moveLayer(id: string, direction: 'up' | 'down' | 'top' | 'bottom'): void;
  reorderLayer(id: string, targetId: string, position: 'before' | 'after'): void;

  // History
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;

  // Snap
  setSnapConfig(patch: Partial<SnapConfig>): void;
  getSnapConfig(): SnapConfig;

  // Events
  on(event: EditorEventName, handler: (payload: any) => void): void;
  off(event: EditorEventName, handler: (payload: any) => void): void;

  // Lifecycle
  destroy(): void;
}
```

---

## EditorConfig

```ts
interface EditorConfig {
  container: HTMLElement;

  document?: {
    name?: string;
    width?: number;        // default 1200
    height?: number;       // default 800
    backgroundColor?: string;
  };

  snap?: Partial<SnapConfig>;

  theme?: {
    panelBackground?: string;   // default '#1e1e2e'
    panelBorder?: string;       // default '#2d2d3d'
    accent?: string;            // default '#6366f1'
    text?: string;
    textMuted?: string;
    inputBackground?: string;
    fontFamily?: string;
  };

  panel?: {
    leftWidth?: number;    // px
    rightWidth?: number;   // px
  };

  // Custom menu items grouped under a named menu
  menuItems?: CustomMenuItem[];

  // Additional items in the File > Export menu
  exportFormats?: ExportFormat[];

  onReady?: (api: EditorAPI) => void;
}
```

---

## Custom menu items

```ts
const api = createEditor({
  container,
  menuItems: [
    {
      id: 'export-png',
      label: 'Export as PNG',
      group: 'Export',                    // groups into a "Export" top-level menu
      shortcut: '⌘⇧E',
      callback: async (api) => {
        const doc = api.getDocument();
        // … render to canvas, download …
      },
    },
  ],
  exportFormats: [
    {
      id: 'png',
      label: 'PNG Image',
      handler: async (doc) => {
        // Must return Blob | string
        return new Blob([JSON.stringify(doc)]);
      },
    },
  ],
});
```

---

## Tailwind-style sizing

Element `width` and `height` accept:

| Value | Resolves to |
|---|---|
| `200` / `'200px'` | 200px absolute |
| `'full'` | 100% of parent |
| `'1/2'` | 50% of parent |
| `'3/5'` | 60% of parent |
| `'50%'` | 50% of parent |
| `'auto'` | 0 (auto-size by content) |
| `'1.5rem'` | 24px |

---

## Events

```ts
api.on('document:change', ({ document }) => { /* full DocumentState */ });
api.on('selection:change', ({ selection }) => { /* { ids, bounds } */ });
api.on('element:add',    ({ element }) => {});
api.on('element:remove', ({ id }) => {});
api.on('element:update', ({ element }) => {});
api.on('history:change', ({ canUndo, canRedo }) => {});
api.on('text:edit:start', ({ id }) => {});
api.on('text:edit:end',   ({ id, content }) => {});
```

---

## Snap configuration

```ts
api.setSnapConfig({
  enabled: true,
  grid: true,
  gridSize: 20,
  gridColor: '#e2e8f0',
  elements: true,      // snap to other elements
  canvas: true,        // snap to canvas edges & center
  smartGuides: true,   // distribution alignment guides
  threshold: 8,        // snap pull distance in px
});
```

---

## Architecture

```
src/
├── types/             Pure TypeScript interfaces and type aliases
├── core/
│   ├── EventEmitter   Typed Observer bus (all subsystems communicate here)
│   └── Editor         Composition root — wires all subsystems, exposes EditorAPI facade
├── model/
│   └── DocumentModel  Single source of truth — element tree, mutations, snapshots
├── layout/
│   └── LayoutResolver Tailwind-style size → px resolver
├── history/
│   ├── HistoryManager Command pattern undo/redo stack
│   └── commands/      AddElement · Remove · Style · Move · Resize · Free · Layer
├── snap/
│   ├── SnapEngine     Composes all snap strategies
│   └── strategies/    Grid · Canvas · Element · SmartGuide (Strategy pattern)
├── format/
│   ├── FormatRegistry Stores IFormat instances by id/group/type
│   └── formats/       One file per format (backgroundColor, fontSize, shadow …)
├── renderer/
│   └── PixiRenderer   WebGL rendering via PixiJS (IRenderer interface)
├── interaction/
│   └── InteractionManager  Mediator — pointer events → Commands → Renderer
├── panels/
│   ├── LeftPanel      Element palette + format controls
│   ├── RightPanel     Properties tab + Layers tab
│   ├── BubbleToolbar  Floating text formatting bar
│   └── PanelManager   Layout shell, theming, drag-drop zone
└── menu/
    └── MenuManager    Top menubar, built-in + consumer items
```

**Design patterns used:**
- **Observer** — `EventEmitter` decouples all subsystems
- **Command** — every mutation is a reversible `ICommand`
- **Strategy** — snap strategies are interchangeable and composable
- **Facade** — `EditorAPI` hides all internal complexity
- **Repository** — `DocumentModel` is the single document store
- **Mediator** — `InteractionManager` coordinates between PixiJS events and commands

---

## Building

```bash
npm install
npm run build       # outputs to dist/
npm run typecheck   # tsc --noEmit
```

---

## License

MIT
