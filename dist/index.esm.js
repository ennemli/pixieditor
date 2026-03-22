import * as PIXI from 'pixi.js';

/**
 * Typed event emitter — the internal bus used by all subsystems.
 * Follows the Observer pattern.
 */
class EventEmitter {
    constructor() {
        this._listeners = new Map();
    }
    on(event, handler) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(handler);
    }
    off(event, handler) {
        this._listeners.get(event)?.delete(handler);
    }
    emit(event, payload) {
        this._listeners.get(event)?.forEach(h => h(payload));
    }
    removeAllListeners(event) {
        if (event) {
            this._listeners.delete(event);
        }
        else {
            this._listeners.clear();
        }
    }
}

let _counter = 0;
function generateId(prefix = 'el') {
    _counter += 1;
    return `${prefix}_${Date.now().toString(36)}_${_counter.toString(36)}`;
}

const DEFAULT_STYLE = {
    width: 200,
    height: 100,
    x: 0,
    y: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    backgroundColor: 'transparent',
    backgroundImage: '',
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    border: { width: 0, color: '#000000', style: 'solid' },
    borderRadiusTopLeft: 0,
    borderRadiusTopRight: 0,
    borderRadiusBottomRight: 0,
    borderRadiusBottomLeft: 0,
    isCircle: false,
    flexDirection: 'column',
    flexWrap: 'nowrap',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 0,
    color: '#000000',
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Inter, sans-serif',
    textAlign: 'left',
    lineHeight: 1.5,
    letterSpacing: 0,
    textDecoration: 'none',
    fontStyle: 'normal',
    textTransform: 'none',
    objectFit: 'cover',
    opacity: 1,
    shadow: null,
    zIndex: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
};
function mergeStyle(base, patch) {
    return { ...base, ...patch };
}

function deepClone(obj) {
    // structuredClone is available in modern browsers/Node 17+
    if (typeof structuredClone === 'function')
        return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
}

/**
 * DocumentModel owns all element data and enforces tree invariants.
 * It is the single source of truth — the renderer and panels only READ from it.
 *
 * Design: Repository + in-memory store with an immutable snapshot API.
 */
class DocumentModel {
    constructor(initial) {
        this._state = {
            id: generateId('doc'),
            name: initial?.name ?? 'Untitled',
            width: initial?.width ?? 1200,
            height: initial?.height ?? 800,
            backgroundColor: initial?.backgroundColor ?? '#ffffff',
            backgroundImage: initial?.backgroundImage ?? '',
            children: [],
            elements: {},
        };
    }
    // ─── Snapshot ───────────────────────────────────────────────────────────
    getSnapshot() {
        return deepClone(this._state);
    }
    loadSnapshot(snap) {
        this._state = deepClone(snap);
    }
    // ─── Element Queries ────────────────────────────────────────────────────
    getElement(id) {
        return this._state.elements[id];
    }
    getElementOrThrow(id) {
        const el = this._state.elements[id];
        if (!el)
            throw new Error(`Element "${id}" not found`);
        return el;
    }
    getAllElements() {
        return Object.values(this._state.elements);
    }
    getChildren(parentId) {
        const ids = parentId === null
            ? this._state.children
            : this._state.elements[parentId]?.children ?? [];
        return ids.map(id => this._state.elements[id]).filter(Boolean);
    }
    getRootChildren() {
        return this.getChildren(null);
    }
    /** Walk the full subtree in DFS order */
    walkSubtree(rootId, cb) {
        const ids = rootId === null ? this._state.children
            : this._state.elements[rootId]?.children ?? [];
        for (const id of ids) {
            const el = this._state.elements[id];
            if (!el)
                continue;
            cb(el);
            if (el.type === 'box')
                this.walkSubtree(id, cb);
        }
    }
    /** Returns all ancestors from immediate parent up to root */
    getAncestors(id) {
        const result = [];
        let current = this._state.elements[id];
        while (current?.parentId) {
            const parent = this._state.elements[current.parentId];
            if (!parent)
                break;
            result.push(parent);
            current = parent;
        }
        return result;
    }
    getDocument() {
        return this._state;
    }
    // ─── Element Mutations ──────────────────────────────────────────────────
    addElement(type, parentId, stylePatch = {}, extraProps = {}) {
        const id = generateId(type);
        const style = mergeStyle({ ...DEFAULT_STYLE, ...this._defaultStyleFor(type) }, stylePatch);
        let el;
        switch (type) {
            case 'box':
                el = {
                    id, type, name: 'Box', style,
                    free: false, parentId,
                    locked: false, visible: true,
                    children: [],
                    ...extraProps,
                };
                break;
            case 'image':
                el = {
                    id, type, name: 'Image', style,
                    free: false, parentId,
                    locked: false, visible: true,
                    src: extraProps.src ?? '',
                    alt: extraProps.alt ?? '',
                    ...extraProps,
                };
                break;
            case 'text':
                el = {
                    id, type, name: 'Text', style,
                    free: false, parentId,
                    locked: false, visible: true,
                    content: extraProps.content ?? 'Text',
                    ...extraProps,
                };
                break;
        }
        this._state.elements[id] = el;
        this._appendToParent(id, parentId);
        return el;
    }
    removeElement(id) {
        const el = this._state.elements[id];
        if (!el)
            return;
        // Remove from parent's children list
        this._removeFromParent(id, el.parentId);
        // Recursively remove subtree
        if (el.type === 'box') {
            for (const childId of [...el.children]) {
                this.removeElement(childId);
            }
        }
        delete this._state.elements[id];
    }
    updateStyle(id, patch) {
        const el = this._state.elements[id];
        if (!el)
            return;
        el.style = { ...el.style, ...patch };
    }
    updateContent(id, content) {
        const el = this._state.elements[id];
        if (el?.type === 'text')
            el.content = content;
    }
    updateSrc(id, src) {
        const el = this._state.elements[id];
        if (el?.type === 'image')
            el.src = src;
    }
    updateName(id, name) {
        const el = this._state.elements[id];
        if (el)
            el.name = name;
    }
    setLocked(id, locked) {
        const el = this._state.elements[id];
        if (el)
            el.locked = locked;
    }
    setVisible(id, visible) {
        const el = this._state.elements[id];
        if (el)
            el.visible = visible;
    }
    /**
     * Make element free: reparent it to root and record absolute position.
     * Position is passed in (caller must resolve world coordinates first).
     */
    setFree(id, free, worldPos) {
        const el = this._state.elements[id];
        if (!el)
            return;
        if (free && !el.free) {
            // Remove from current parent, attach to root
            this._removeFromParent(id, el.parentId);
            el.parentId = null;
            el.free = true;
            if (worldPos) {
                el.style.x = worldPos.x;
                el.style.y = worldPos.y;
            }
            this._appendToParent(id, null);
        }
        else if (!free && el.free) {
            // Move back under a target parent (default: root keeping position)
            el.free = false;
            // parentId stays null (root) unless caller changes it
        }
    }
    /**
     * Reparent an element under a new parent.
     * If newParentId is null, element goes to root.
     */
    reparent(id, newParentId) {
        const el = this._state.elements[id];
        if (!el)
            return;
        this._removeFromParent(id, el.parentId);
        el.parentId = newParentId;
        this._appendToParent(id, newParentId);
    }
    // ─── Layer Order ────────────────────────────────────────────────────────
    moveLayer(id, direction) {
        const el = this._state.elements[id];
        if (!el)
            return;
        const siblings = el.parentId === null
            ? this._state.children
            : this._state.elements[el.parentId].children;
        const idx = siblings.indexOf(id);
        if (idx === -1)
            return;
        siblings.splice(idx, 1);
        switch (direction) {
            case 'up':
                siblings.splice(Math.min(idx + 1, siblings.length), 0, id);
                break;
            case 'down':
                siblings.splice(Math.max(idx - 1, 0), 0, id);
                break;
            case 'top':
                siblings.push(id);
                break;
            case 'bottom':
                siblings.unshift(id);
                break;
        }
    }
    reorderLayer(id, targetId, position) {
        const el = this._state.elements[id];
        const target = this._state.elements[targetId];
        if (!el || !target)
            return;
        const siblings = el.parentId === null
            ? this._state.children
            : this._state.elements[el.parentId].children;
        const fromIdx = siblings.indexOf(id);
        if (fromIdx === -1)
            return;
        siblings.splice(fromIdx, 1);
        const toIdx = siblings.indexOf(targetId);
        const insertAt = position === 'before' ? toIdx : toIdx + 1;
        siblings.splice(Math.max(0, insertAt), 0, id);
    }
    // ─── Document Properties ────────────────────────────────────────────────
    setDocumentSize(width, height) {
        this._state.width = width;
        this._state.height = height;
    }
    setDocumentBackground(color) {
        this._state.backgroundColor = color;
    }
    setDocumentBackgroundImage(url) {
        this._state.backgroundImage = url;
    }
    // ─── Private helpers ────────────────────────────────────────────────────
    _appendToParent(id, parentId) {
        if (parentId === null) {
            this._state.children.push(id);
        }
        else {
            const parent = this._state.elements[parentId];
            if (parent?.type === 'box')
                parent.children.push(id);
        }
    }
    _removeFromParent(id, parentId) {
        if (parentId === null) {
            const idx = this._state.children.indexOf(id);
            if (idx !== -1)
                this._state.children.splice(idx, 1);
        }
        else {
            const parent = this._state.elements[parentId];
            if (parent?.type === 'box') {
                const idx = parent.children.indexOf(id);
                if (idx !== -1)
                    parent.children.splice(idx, 1);
            }
        }
    }
    _defaultStyleFor(type) {
        switch (type) {
            case 'box': return { backgroundColor: '#f0f0f0', width: 200, height: 150 };
            case 'image': return { width: 200, height: 150, objectFit: 'cover' };
            case 'text': return { width: 150, height: 40, backgroundColor: 'transparent', fontSize: 16 };
        }
    }
}

/**
 * HistoryManager implements the Command pattern for undo/redo.
 * Snapshots are pushed on action completion (mouseup, blur, etc.),
 * not on every incremental change.
 */
class HistoryManager {
    constructor(emitter, maxSize = 100) {
        this._stack = [];
        this._cursor = -1;
        this._emitter = emitter;
        this._maxSize = maxSize;
    }
    execute(command) {
        // Truncate any redo future
        this._stack.splice(this._cursor + 1);
        command.execute();
        this._stack.push(command);
        if (this._stack.length > this._maxSize) {
            this._stack.shift();
        }
        else {
            this._cursor = this._stack.length - 1;
        }
        this._notify();
    }
    undo() {
        if (!this.canUndo())
            return;
        this._stack[this._cursor].undo();
        this._cursor--;
        this._notify();
    }
    redo() {
        if (!this.canRedo())
            return;
        this._cursor++;
        this._stack[this._cursor].execute();
        this._notify();
    }
    canUndo() { return this._cursor >= 0; }
    canRedo() { return this._cursor < this._stack.length - 1; }
    clear() {
        this._stack.length = 0;
        this._cursor = -1;
        this._notify();
    }
    _notify() {
        this._emitter.emit('history:change', {
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
        });
    }
}

class GridSnapStrategy {
    snap(rect, ctx) {
        const g = ctx.gridSize;
        const snappedX = Math.round(rect.x / g) * g;
        const snappedY = Math.round(rect.y / g) * g;
        return { deltaX: snappedX - rect.x, deltaY: snappedY - rect.y, guides: [] };
    }
}

class CanvasSnapStrategy {
    snap(rect, ctx) {
        const { canvasWidth: cw, canvasHeight: ch, threshold: t } = ctx;
        let dx = 0, dy = 0;
        const guides = [];
        const hTargets = [0, cw / 2 - rect.width / 2, cw - rect.width];
        const hGuidePos = [0, cw / 2, cw];
        for (let i = 0; i < hTargets.length; i++) {
            if (Math.abs(rect.x - hTargets[i]) < t) {
                dx = hTargets[i] - rect.x;
                guides.push({ orientation: 'vertical', position: hGuidePos[i], start: 0, end: ch });
                break;
            }
        }
        const vTargets = [0, ch / 2 - rect.height / 2, ch - rect.height];
        const vGuidePos = [0, ch / 2, ch];
        for (let i = 0; i < vTargets.length; i++) {
            if (Math.abs(rect.y - vTargets[i]) < t) {
                dy = vTargets[i] - rect.y;
                guides.push({ orientation: 'horizontal', position: vGuidePos[i], start: 0, end: cw });
                break;
            }
        }
        return { deltaX: dx, deltaY: dy, guides };
    }
}

/**
 * Resolves Tailwind-style size values to pixel numbers.
 *
 * Supported formats:
 *  - number            → absolute pixels (100)
 *  - 'full'            → parentSize
 *  - 'auto'            → 0 (caller handles auto sizing)
 *  - 'screen'          → viewportSize
 *  - '1/2','3/5','2/3' → fraction of parentSize
 *  - '50%'             → fraction of parentSize
 *  - '100px'           → absolute pixels
 *  - '1.5rem'          → 1.5 * 16 = 24px
 */
class LayoutResolver {
    constructor() {
        this._baseFontSize = 16;
    }
    resolveSize(value, parentSize, viewportSize = 0) {
        if (typeof value === 'number')
            return value;
        const v = value.trim().toLowerCase();
        if (v === 'full')
            return parentSize;
        if (v === 'auto')
            return 0;
        if (v === 'screen')
            return viewportSize;
        if (v === '0')
            return 0;
        // Fraction: '1/2', '3/5', '2/3'
        const fractionMatch = v.match(/^(\d+)\/(\d+)$/);
        if (fractionMatch) {
            return (parseInt(fractionMatch[1]) / parseInt(fractionMatch[2])) * parentSize;
        }
        // Percentage: '50%'
        if (v.endsWith('%')) {
            return (parseFloat(v) / 100) * parentSize;
        }
        // px
        if (v.endsWith('px'))
            return parseFloat(v);
        // rem
        if (v.endsWith('rem'))
            return parseFloat(v) * this._baseFontSize;
        // em (treat as rem for simplicity)
        if (v.endsWith('em'))
            return parseFloat(v) * this._baseFontSize;
        // Bare number string
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
    }
    /**
     * Resolve both width and height in a single call.
     */
    resolveDimensions(width, height, parentWidth, parentHeight) {
        return {
            width: this.resolveSize(width, parentWidth),
            height: this.resolveSize(height, parentHeight),
        };
    }
    /**
     * Compute resolved border radius respecting the isCircle flag.
     */
    resolveBorderRadius(style, resolvedWidth, resolvedHeight) {
        if (style.isCircle) {
            const r = Math.min(resolvedWidth, resolvedHeight) / 2;
            return { topLeft: r, topRight: r, bottomRight: r, bottomLeft: r };
        }
        return {
            topLeft: style.borderRadiusTopLeft,
            topRight: style.borderRadiusTopRight,
            bottomRight: style.borderRadiusBottomRight,
            bottomLeft: style.borderRadiusBottomLeft,
        };
    }
}
const layoutResolver = new LayoutResolver();

class ElementSnapStrategy {
    snap(rect, ctx) {
        const { document: doc, movingIds, threshold: t } = ctx;
        let dx = 0, dy = 0;
        const guides = [];
        const rx1 = rect.x, rx2 = rect.x + rect.width, rcx = rect.x + rect.width / 2;
        const ry1 = rect.y, ry2 = rect.y + rect.height, rcy = rect.y + rect.height / 2;
        for (const el of Object.values(doc.elements)) {
            if (movingIds.has(el.id) || !el.visible)
                continue;
            const w = layoutResolver.resolveSize(el.style.width, doc.width);
            const h = layoutResolver.resolveSize(el.style.height, doc.height);
            const ex1 = el.style.x, ex2 = ex1 + w, ecx = ex1 + w / 2;
            const ey1 = el.style.y, ey2 = ey1 + h, ecy = ey1 + h / 2;
            for (const [from, to] of [[rx1, ex1], [rx1, ex2], [rx2, ex1], [rx2, ex2], [rcx, ecx]]) {
                if (Math.abs(from - to) < t) {
                    dx = to - from;
                    guides.push({ orientation: 'vertical', position: to, start: Math.min(ry1, ey1), end: Math.max(ry2, ey2) });
                    break;
                }
            }
            for (const [from, to] of [[ry1, ey1], [ry1, ey2], [ry2, ey1], [ry2, ey2], [rcy, ecy]]) {
                if (Math.abs(from - to) < t) {
                    dy = to - from;
                    guides.push({ orientation: 'horizontal', position: to, start: Math.min(rx1, ex1), end: Math.max(rx2, ex2) });
                    break;
                }
            }
        }
        return { deltaX: dx, deltaY: dy, guides };
    }
}

class SmartGuideStrategy {
    snap(rect, ctx) {
        const guides = [];
        const { document: doc, movingIds, threshold: t } = ctx;
        const others = Object.values(doc.elements).filter(el => !movingIds.has(el.id) && el.visible);
        if (others.length < 2)
            return { deltaX: 0, deltaY: 0, guides };
        let dx = 0, dy = 0;
        const rcx = rect.x + rect.width / 2;
        const rcy = rect.y + rect.height / 2;
        for (const el of others) {
            const w = layoutResolver.resolveSize(el.style.width, doc.width);
            const h = layoutResolver.resolveSize(el.style.height, doc.height);
            const cx = el.style.x + w / 2;
            const cy = el.style.y + h / 2;
            if (Math.abs(rcx - cx) < t) {
                dx = cx - rcx;
                guides.push({ orientation: 'vertical', position: cx, start: 0, end: ctx.canvasHeight });
                break;
            }
            if (Math.abs(rcy - cy) < t) {
                dy = cy - rcy;
                guides.push({ orientation: 'horizontal', position: cy, start: 0, end: ctx.canvasWidth });
                break;
            }
        }
        return { deltaX: dx, deltaY: dy, guides };
    }
}

class SnapEngine {
    constructor(config) {
        this._strategies = {
            grid: new GridSnapStrategy(),
            canvas: new CanvasSnapStrategy(),
            element: new ElementSnapStrategy(),
            smart: new SmartGuideStrategy(),
        };
        this._config = config;
    }
    setConfig(patch) { this._config = { ...this._config, ...patch }; }
    getConfig() { return this._config; }
    snap(proposedRect, movingIds, document) {
        if (!this._config.enabled)
            return { x: proposedRect.x, y: proposedRect.y, guides: [] };
        const ctx = {
            document, movingIds,
            canvasWidth: document.width,
            canvasHeight: document.height,
            gridSize: this._config.gridSize,
            threshold: this._config.threshold,
        };
        let dx = 0, dy = 0;
        const guides = [];
        const apply = (r) => {
            dx += r.deltaX;
            dy += r.deltaY;
            guides.push(...r.guides);
        };
        const adjusted = () => ({ ...proposedRect, x: proposedRect.x + dx, y: proposedRect.y + dy });
        if (this._config.grid)
            apply(this._strategies.grid.snap(proposedRect, ctx));
        if (this._config.canvas)
            apply(this._strategies.canvas.snap(adjusted(), ctx));
        if (this._config.elements)
            apply(this._strategies.element.snap(adjusted(), ctx));
        if (this._config.smartGuides)
            apply(this._strategies.smart.snap(adjusted(), ctx));
        return { x: proposedRect.x + dx, y: proposedRect.y + dy, guides };
    }
}

/**
 * FormatRegistry stores all registered IFormat instances.
 * Consumers register custom formats; built-in formats are pre-registered.
 */
class FormatRegistry {
    constructor() {
        this._formats = new Map();
    }
    register(format) {
        this._formats.set(format.id, format);
    }
    get(id) {
        return this._formats.get(id);
    }
    getAll() {
        return Array.from(this._formats.values());
    }
    getForElement(element) {
        return this.getAll().filter(f => f.appliesTo.includes(element.type));
    }
    getByGroup() {
        const groups = new Map();
        for (const f of this.getAll()) {
            if (!groups.has(f.group))
                groups.set(f.group, []);
            groups.get(f.group).push(f);
        }
        return groups;
    }
}

/** Parse any CSS color to [r, g, b, a] (0-255 for rgb, 0-1 for a) */
function parseColor(color) {
    if (!color || color === 'transparent')
        return [0, 0, 0, 0];
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            return [r, g, b, 1];
        }
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
        return [r, g, b, a];
    }
    const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgba)
        return [+rgba[1], +rgba[2], +rgba[3], rgba[4] !== undefined ? +rgba[4] : 1];
    return [0, 0, 0, 1];
}
function hexToNumber(hex) {
    const [r, g, b] = parseColor(hex);
    return (r << 16) | (g << 8) | b;
}

/**
 * PixiRenderer — the WebGL rendering engine.
 * Each element maps to a PIXI.Container. Free elements live on the rootStage,
 * nested elements inside their parent's childContainer.
 *
 * Implements IRenderer (Dependency Inversion Principle).
 */
class PixiRenderer {
    constructor() {
        this._doc = null;
        /** Map elementId → PIXI.Container */
        this._displayObjects = new Map();
        this._showGrid = false;
        this._gridSize = 20;
        this._gridColor = 0xdddddd;
        this._resizeObserver = null;
    }
    mount(container) {
        const appOptions = {
            width: container.clientWidth,
            height: container.clientHeight,
            backgroundColor: 0xf3f4f6,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        };
        const supportsAsyncInit = typeof PIXI.Application?.prototype?.init === 'function';
        if (supportsAsyncInit) {
            this._app = new PIXI.Application();
            return this._app.init(appOptions).then(() => {
                container.appendChild(this._getView());
                this._setupScene(container);
            });
        }
        this._app = new PIXI.Application(appOptions);
        container.appendChild(this._getView());
        this._setupScene(container);
    }
    _setupScene(container) {
        this._rootStage = new PIXI.Container();
        this._app.stage.addChild(this._rootStage);
        this._gridLayer = new PIXI.Graphics();
        this._rootStage.addChild(this._gridLayer);
        this._guideLayer = new PIXI.Graphics();
        this._selectionLayer = new PIXI.Graphics();
        this._app.stage.addChild(this._guideLayer);
        this._app.stage.addChild(this._selectionLayer);
        // Handle resize
        this._resizeObserver = new ResizeObserver(() => {
            this._app.renderer.resize(container.clientWidth, container.clientHeight);
            if (this._doc)
                this._drawGrid();
        });
        this._resizeObserver.observe(container);
    }
    _getView() {
        return (this._app.canvas ?? this._app.view);
    }
    render(doc) {
        this._doc = doc;
        // Position canvas content (centered)
        const offX = Math.max(0, (this._app.renderer.width / this._app.renderer.resolution - doc.width) / 2);
        const offY = Math.max(0, (this._app.renderer.height / this._app.renderer.resolution - doc.height) / 2);
        this._rootStage.position.set(offX, offY);
        // Draw document background
        this._drawDocBackground(doc);
        this._drawGrid();
        // Full re-render: remove all old display objects
        const toRemove = [...this._displayObjects.keys()];
        for (const id of toRemove)
            this.removeElement(id);
        // Render root children in order
        this._renderChildren(doc.children, null, doc);
    }
    updateElement(element) {
        if (!this._doc)
            return;
        const existing = this._displayObjects.get(element.id);
        if (existing) {
            this._syncElementDisplay(element, existing);
        }
        else {
            // New element — find parent container and add
            const parentContainer = this._getParentContainer(element);
            this._createDisplayObject(element, parentContainer, this._doc);
        }
    }
    removeElement(id) {
        const obj = this._displayObjects.get(id);
        if (obj) {
            obj.parent?.removeChild(obj);
            obj.destroy({ children: true });
            this._displayObjects.delete(id);
        }
    }
    setSelection(selection) {
        this._selectionLayer.clear();
        if (!selection.bounds || selection.ids.length === 0)
            return;
        const { x, y, width, height } = this._toScreenRect(selection.bounds);
        this._selectionLayer.lineStyle(2, 0x6366f1, 1);
        this._selectionLayer.drawRect(x, y, width, height);
        // Draw 8 resize handles
        const handles = this._getHandlePositions(x, y, width, height);
        for (const [hx, hy] of handles) {
            this._selectionLayer.beginFill(0xffffff);
            this._selectionLayer.lineStyle(2, 0x6366f1, 1);
            this._selectionLayer.drawRect(hx - 4, hy - 4, 8, 8);
            this._selectionLayer.endFill();
        }
    }
    setSnapGuides(guides) {
        this._guideLayer.clear();
        if (!this._doc)
            return;
        const offX = this._rootStage.x, offY = this._rootStage.y;
        for (const guide of guides) {
            this._guideLayer.lineStyle(1, 0x6366f1, 0.8);
            if (guide.orientation === 'vertical') {
                const x = guide.position + offX;
                this._guideLayer.moveTo(x, guide.start + offY);
                this._guideLayer.lineTo(x, guide.end + offY);
            }
            else {
                const y = guide.position + offY;
                this._guideLayer.moveTo(guide.start + offX, y);
                this._guideLayer.lineTo(guide.end + offX, y);
            }
        }
    }
    getWorldPosition(screenX, screenY) {
        const bounds = this._getView().getBoundingClientRect();
        const canvasX = (screenX - bounds.left) / (this._app.renderer.resolution || 1);
        const canvasY = (screenY - bounds.top) / (this._app.renderer.resolution || 1);
        return {
            x: canvasX - this._rootStage.x,
            y: canvasY - this._rootStage.y,
        };
    }
    getElementAt(worldX, worldY) {
        if (!this._doc)
            return null;
        // Check in reverse order (top-most first)
        const allIds = Object.keys(this._doc.elements).reverse();
        for (const id of allIds) {
            const el = this._doc.elements[id];
            if (!el?.visible)
                continue;
            const w = layoutResolver.resolveSize(el.style.width, this._doc.width);
            const h = layoutResolver.resolveSize(el.style.height, this._doc.height);
            if (el.free || el.parentId === null) {
                if (worldX >= el.style.x && worldX <= el.style.x + w &&
                    worldY >= el.style.y && worldY <= el.style.y + h) {
                    return id;
                }
            }
        }
        return null;
    }
    getCanvas() {
        return this._getView();
    }
    getStageOffset() {
        return { x: this._rootStage.x, y: this._rootStage.y };
    }
    showGrid(show, size = 20, color = '#dddddd') {
        this._showGrid = show;
        this._gridSize = size;
        this._gridColor = parseInt(color.replace('#', ''), 16);
        this._drawGrid();
    }
    destroy() {
        this._resizeObserver?.disconnect();
        this._resizeObserver = null;
        this._app?.destroy(true, { children: true });
    }
    _drawDocBackground(doc) {
        if (!this._docBg) {
            this._docBg = new PIXI.Graphics();
            this._rootStage.addChildAt(this._docBg, 0);
        }
        this._docBg.clear();
        this._docBg.beginFill(hexToNumber(doc.backgroundColor));
        this._docBg.drawRect(0, 0, doc.width, doc.height);
        this._docBg.endFill();
    }
    _drawGrid() {
        this._gridLayer.clear();
        if (!this._showGrid || !this._doc)
            return;
        const { width, height } = this._doc;
        this._gridLayer.lineStyle(1, this._gridColor, 0.5);
        for (let x = 0; x <= width; x += this._gridSize) {
            this._gridLayer.moveTo(x, 0);
            this._gridLayer.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += this._gridSize) {
            this._gridLayer.moveTo(0, y);
            this._gridLayer.lineTo(width, y);
        }
    }
    _renderChildren(ids, parentContainer, doc) {
        const container = parentContainer ?? this._rootStage;
        for (const id of ids) {
            const el = doc.elements[id];
            if (!el)
                continue;
            this._createDisplayObject(el, container, doc);
        }
    }
    _createDisplayObject(el, parentContainer, doc) {
        const container = new PIXI.Container();
        container.name = el.id;
        container.visible = el.visible;
        container.alpha = el.style.opacity;
        container.zIndex = el.style.zIndex;
        container.sortableChildren = true;
        // Position
        if (el.free) {
            container.position.set(el.style.x, el.style.y);
        }
        else {
            container.position.set(0, 0); // flex layout handled by parent
        }
        // Rotation
        container.angle = el.style.rotation;
        // Scale
        container.scale.set(el.style.scaleX, el.style.scaleY);
        const parentW = doc.width;
        const parentH = doc.height;
        const w = layoutResolver.resolveSize(el.style.width, parentW);
        const h = layoutResolver.resolveSize(el.style.height, parentH);
        // Draw element graphics
        const gfx = new PIXI.Graphics();
        container.addChild(gfx);
        this._drawElementGraphics(gfx, el, w, h);
        // Text overlay hint (actual editing is DOM)
        if (el.type === 'text') {
            const textObj = new PIXI.Text(el.content, {
                fontSize: el.style.fontSize,
                fill: el.style.color,
                fontFamily: el.style.fontFamily,
                fontWeight: el.style.fontWeight,
                align: el.style.textAlign,
                wordWrap: true,
                wordWrapWidth: w - el.style.paddingLeft - el.style.paddingRight,
                lineHeight: el.style.fontSize * el.style.lineHeight,
            });
            textObj.position.set(el.style.paddingLeft, el.style.paddingTop);
            container.addChild(textObj);
        }
        // Image
        if (el.type === 'image' && el.src) {
            PIXI.Texture.fromURL(el.src).then(tex => {
                const sprite = new PIXI.Sprite(tex);
                sprite.width = w;
                sprite.height = h;
                gfx.mask = (() => {
                    const m = new PIXI.Graphics();
                    m.beginFill(0xffffff);
                    m.drawRect(0, 0, w, h);
                    m.endFill();
                    container.addChild(m);
                    return m;
                })();
                container.addChildAt(sprite, 1);
            });
        }
        // Box children
        if (el.type === 'box') {
            const childContainer = new PIXI.Container();
            childContainer.position.set(el.style.paddingLeft, el.style.paddingTop);
            container.addChild(childContainer);
            this._renderChildren(el.children ?? [], childContainer, doc);
        }
        // Interactivity
        container.eventMode = 'static';
        container.cursor = 'pointer';
        container.hitArea = new PIXI.Rectangle(0, 0, w, h);
        parentContainer.addChild(container);
        this._displayObjects.set(el.id, container);
        return container;
    }
    _drawElementGraphics(gfx, el, w, h) {
        const s = el.style;
        const br = layoutResolver.resolveBorderRadius(s, w, h);
        // Background
        if (s.backgroundColor !== 'transparent' && s.backgroundColor) {
            const [r, g, b, a] = parseColor(s.backgroundColor);
            gfx.beginFill((r << 16) | (g << 8) | b, a);
        }
        else {
            gfx.beginFill(0x000000, 0);
        }
        // Border
        if (s.border.width > 0 && s.border.style !== 'none') {
            gfx.lineStyle(s.border.width, hexToNumber(s.border.color), 1);
        }
        // Draw shape
        const allSame = br.topLeft === br.topRight && br.topRight === br.bottomRight && br.bottomRight === br.bottomLeft;
        if (s.isCircle || (allSame && br.topLeft > 0)) {
            if (s.isCircle) {
                gfx.drawCircle(w / 2, h / 2, Math.min(w, h) / 2);
            }
            else {
                gfx.drawRoundedRect(0, 0, w, h, br.topLeft);
            }
        }
        else if (!allSame) {
            // Approximate different corners with a path
            gfx.drawRoundedRect(0, 0, w, h, Math.max(br.topLeft, br.topRight, br.bottomRight, br.bottomLeft));
        }
        else {
            gfx.drawRect(0, 0, w, h);
        }
        gfx.endFill();
    }
    _syncElementDisplay(el, container) {
        // For now, full redraw of this element's graphics
        // In production you'd diff and patch
        const parent = container.parent;
        const idx = parent?.getChildIndex(container) ?? 0;
        this.removeElement(el.id);
        if (parent && this._doc) {
            const newContainer = this._createDisplayObject(el, parent, this._doc);
            parent.setChildIndex(newContainer, Math.min(idx, parent.children.length - 1));
        }
    }
    _getParentContainer(el) {
        if (el.parentId === null || el.free)
            return this._rootStage;
        const parentObj = this._displayObjects.get(el.parentId);
        // Find the childContainer inside the parent box
        if (parentObj) {
            const childContainer = parentObj.children.find(c => c instanceof PIXI.Container && c !== parentObj.children[0]);
            return childContainer ?? parentObj;
        }
        return this._rootStage;
    }
    _toScreenRect(rect) {
        return {
            x: rect.x + this._rootStage.x,
            y: rect.y + this._rootStage.y,
            width: rect.width,
            height: rect.height,
        };
    }
    _getHandlePositions(x, y, w, h) {
        const cx = x + w / 2, cy = y + h / 2;
        return [
            [x, y], [cx, y], [x + w, y],
            [x, cy], [x + w, cy],
            [x, y + h], [cx, y + h], [x + w, y + h],
        ];
    }
}

class MoveCommand {
    constructor(_model, _emitter, _id, _x, _y) {
        this._model = _model;
        this._emitter = _emitter;
        this._id = _id;
        this._x = _x;
        this._y = _y;
        this.description = 'Move element';
        this._prevX = 0;
        this._prevY = 0;
    }
    execute() {
        const el = this._model.getElement(this._id);
        if (!el)
            return;
        this._prevX = el.style.x;
        this._prevY = el.style.y;
        this._model.updateStyle(this._id, { x: this._x, y: this._y });
        this._emitter.emit('element:move', { id: this._id, x: this._x, y: this._y });
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
    undo() {
        this._model.updateStyle(this._id, { x: this._prevX, y: this._prevY });
        this._emitter.emit('element:move', { id: this._id, x: this._prevX, y: this._prevY });
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
}

class ResizeCommand {
    constructor(_model, _emitter, _id, _next) {
        this._model = _model;
        this._emitter = _emitter;
        this._id = _id;
        this._next = _next;
        this.description = 'Resize element';
        this._prev = { x: 0, y: 0, width: 0, height: 0 };
    }
    execute() {
        const el = this._model.getElement(this._id);
        if (!el)
            return;
        this._prev = {
            x: el.style.x,
            y: el.style.y,
            width: typeof el.style.width === 'number' ? el.style.width : 0,
            height: typeof el.style.height === 'number' ? el.style.height : 0,
        };
        this._model.updateStyle(this._id, this._next);
        this._emitter.emit('element:resize', { id: this._id, width: this._next.width, height: this._next.height });
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
    undo() {
        this._model.updateStyle(this._id, this._prev);
        this._emitter.emit('element:resize', { id: this._id, width: this._prev.width, height: this._prev.height });
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
}

class FreeCommand {
    constructor(_model, _emitter, _id, _free, _worldPos) {
        this._model = _model;
        this._emitter = _emitter;
        this._id = _id;
        this._free = _free;
        this._worldPos = _worldPos;
        this._prevParentId = null;
        this._prevFree = false;
        this._prevX = 0;
        this._prevY = 0;
        this.description = _free ? 'Make element free' : 'Unset free element';
    }
    execute() {
        const el = this._model.getElement(this._id);
        if (!el)
            return;
        this._prevParentId = el.parentId;
        this._prevFree = el.free;
        this._prevX = el.style.x;
        this._prevY = el.style.y;
        this._model.setFree(this._id, this._free, this._worldPos);
        const updated = this._model.getElement(this._id);
        this._emitter.emit('element:update', { element: updated });
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
    undo() {
        // Restore free state and position
        this._model.setFree(this._id, this._prevFree);
        this._model.updateStyle(this._id, { x: this._prevX, y: this._prevY });
        if (this._prevParentId) {
            this._model.reparent(this._id, this._prevParentId);
        }
        const updated = this._model.getElement(this._id);
        this._emitter.emit('element:update', { element: updated });
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
}

/**
 * InteractionManager is the Mediator between PixiJS pointer events
 * and the editor commands. It orchestrates drag, resize, select, and
 * text editing interactions.
 */
class InteractionManager {
    constructor(_renderer, _model, _history, _snap, _emitter) {
        this._renderer = _renderer;
        this._model = _model;
        this._history = _history;
        this._snap = _snap;
        this._emitter = _emitter;
        this._state = { mode: 'idle', selectedIds: [], hovered: null };
        // Drag state
        this._dragStartWorld = { x: 0, y: 0 };
        this._dragStartElementPositions = new Map();
        this._isDragging = false;
        this._dragThreshold = 4; // px
        // Resize state
        this._resizeHandle = null;
        this._resizeStartRect = { x: 0, y: 0, width: 0, height: 0 };
        this._resizeStartWorld = { x: 0, y: 0 };
        // Text edit state
        this._textEditOverlay = null;
        this._editingId = null;
        // ─── Event Handlers ───────────────────────────────────────────────────────
        this._onPointerDown = (e) => {
            if (this._editingId) {
                this._commitTextEdit();
                return;
            }
            const world = this._renderer.getWorldPosition(e.clientX, e.clientY);
            const hitId = this._hitTest(world);
            const handle = this._hitTestHandle(e.clientX, e.clientY);
            if (handle !== null && this._state.selectedIds.length > 0) {
                // Start resize
                this._startResize(handle, world);
                return;
            }
            if (hitId) {
                const el = this._model.getElement(hitId);
                if (el?.locked)
                    return;
                if (!this._state.selectedIds.includes(hitId)) {
                    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
                    if (!additive) {
                        this._state.selectedIds = [hitId];
                    }
                    else {
                        this._state.selectedIds = [...this._state.selectedIds, hitId];
                    }
                    this._emitSelection();
                }
                // Prepare drag
                this._dragStartWorld = world;
                this._dragStartElementPositions.clear();
                for (const id of this._state.selectedIds) {
                    const el2 = this._model.getElement(id);
                    if (el2)
                        this._dragStartElementPositions.set(id, { x: el2.style.x, y: el2.style.y });
                }
                this._state.mode = 'selecting'; // will switch to 'dragging' on threshold
                this._canvas.setPointerCapture(e.pointerId);
            }
            else {
                // Click on empty canvas
                if (!e.shiftKey)
                    this.clearSelection();
                this._renderer.setSelection({ ids: [], bounds: null });
            }
        };
        this._onPointerMove = (e) => {
            const world = this._renderer.getWorldPosition(e.clientX, e.clientY);
            if (this._state.mode === 'resizing') {
                this._doResize(world);
                return;
            }
            if (this._state.mode === 'selecting' || this._state.mode === 'dragging') {
                const dx = world.x - this._dragStartWorld.x;
                const dy = world.y - this._dragStartWorld.y;
                if (!this._isDragging && Math.hypot(dx, dy) > this._dragThreshold) {
                    this._isDragging = true;
                    this._state.mode = 'dragging';
                    // Make element free if not already
                    for (const id of this._state.selectedIds) {
                        const el = this._model.getElement(id);
                        if (el && !el.free) {
                            const worldPos = { x: el.style.x, y: el.style.y };
                            this._history.execute(new FreeCommand(this._model, this._emitter, id, true, worldPos));
                        }
                    }
                }
                if (this._isDragging) {
                    this._doDrag(dx, dy);
                }
            }
            // Hover
            const hovered = this._hitTest(world);
            if (hovered !== this._state.hovered) {
                this._state.hovered = hovered;
                this._canvas.style.cursor = hovered ? 'move' : 'default';
            }
        };
        this._onPointerUp = (e) => {
            if (this._state.mode === 'dragging' && this._isDragging) {
                this._commitDrag();
            }
            if (this._state.mode === 'resizing') {
                this._commitResize();
            }
            this._isDragging = false;
            this._state.mode = 'idle';
            this._renderer.setSnapGuides([]);
            if (e.type !== 'pointerleave')
                this._canvas.releasePointerCapture(e.pointerId);
        };
        this._onDblClick = (e) => {
            const world = this._renderer.getWorldPosition(e.clientX, e.clientY);
            const hitId = this._hitTest(world);
            if (!hitId)
                return;
            const el = this._model.getElement(hitId);
            if (el?.type === 'text')
                this._startTextEdit(hitId, e.clientX, e.clientY);
        };
        this._onKeyDown = (e) => {
            if (this._editingId)
                return;
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) ;
                else {
                    this._history.undo();
                }
            }
            if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                e.preventDefault();
                this._history.redo();
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && this._state.selectedIds.length > 0) {
                // Deletion handled by Editor
                this._emitter.emit('element:remove', { id: this._state.selectedIds[0] });
            }
            // Nudge with arrow keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                const step = e.shiftKey ? 10 : 1;
                const dMap = {
                    ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0]
                };
                const [dx, dy] = dMap[e.key];
                for (const id of this._state.selectedIds) {
                    const el = this._model.getElement(id);
                    if (el)
                        this._history.execute(new MoveCommand(this._model, this._emitter, id, el.style.x + dx, el.style.y + dy));
                }
            }
        };
    }
    mount(canvas) {
        this._canvas = canvas;
        canvas.addEventListener('pointerdown', this._onPointerDown);
        canvas.addEventListener('pointermove', this._onPointerMove);
        canvas.addEventListener('pointerup', this._onPointerUp);
        canvas.addEventListener('pointerleave', this._onPointerUp);
        canvas.addEventListener('dblclick', this._onDblClick);
        window.addEventListener('keydown', this._onKeyDown);
    }
    destroy() {
        this._canvas.removeEventListener('pointerdown', this._onPointerDown);
        this._canvas.removeEventListener('pointermove', this._onPointerMove);
        this._canvas.removeEventListener('pointerup', this._onPointerUp);
        this._canvas.removeEventListener('pointerleave', this._onPointerUp);
        this._canvas.removeEventListener('dblclick', this._onDblClick);
        window.removeEventListener('keydown', this._onKeyDown);
        this._removeTextOverlay();
    }
    getState() { return this._state; }
    selectIds(ids) {
        this._state.selectedIds = [...ids];
        this._emitSelection();
    }
    clearSelection() {
        this._state.selectedIds = [];
        this._emitSelection();
    }
    // ─── Drag ─────────────────────────────────────────────────────────────────
    _doDrag(dx, dy) {
        const doc = this._model.getDocument();
        for (const id of this._state.selectedIds) {
            const start = this._dragStartElementPositions.get(id);
            if (!start)
                continue;
            const el = this._model.getElement(id);
            if (!el)
                continue;
            const w = layoutResolver.resolveSize(el.style.width, doc.width);
            const h = layoutResolver.resolveSize(el.style.height, doc.height);
            const proposed = { x: start.x + dx, y: start.y + dy, width: w, height: h };
            const snapped = this._snap.snap(proposed, new Set(this._state.selectedIds), doc);
            // Live update (no history — history is committed on mouseup)
            this._model.updateStyle(id, { x: snapped.x, y: snapped.y });
            this._renderer.updateElement(this._model.getElement(id));
            this._renderer.setSnapGuides(snapped.guides);
        }
        this._updateSelectionBounds();
    }
    _commitDrag() {
        // Commit final positions to history
        for (const id of this._state.selectedIds) {
            const el = this._model.getElement(id);
            const start = this._dragStartElementPositions.get(id);
            if (el && start && (el.style.x !== start.x || el.style.y !== start.y)) {
                this._history.execute(new MoveCommand(this._model, this._emitter, id, el.style.x, el.style.y));
            }
        }
    }
    // ─── Resize ───────────────────────────────────────────────────────────────
    _startResize(handle, world) {
        this._state.mode = 'resizing';
        this._resizeHandle = handle;
        this._resizeStartWorld = world;
        if (this._state.selectedIds.length === 1) {
            const el = this._model.getElement(this._state.selectedIds[0]);
            if (el) {
                const doc = this._model.getDocument();
                this._resizeStartRect = {
                    x: el.style.x, y: el.style.y,
                    width: layoutResolver.resolveSize(el.style.width, doc.width),
                    height: layoutResolver.resolveSize(el.style.height, doc.height),
                };
            }
        }
    }
    _doResize(world) {
        if (this._resizeHandle === null || this._state.selectedIds.length !== 1)
            return;
        const id = this._state.selectedIds[0];
        const dx = world.x - this._resizeStartWorld.x;
        const dy = world.y - this._resizeStartWorld.y;
        const r = this._resizeStartRect;
        let { x, y, width, height } = r;
        const h = this._resizeHandle;
        // TL=0, T=1, TR=2, L=3, R=4, BL=5, B=6, BR=7
        if (h === 0 || h === 3 || h === 5) {
            x += dx;
            width -= dx;
        }
        if (h === 2 || h === 4 || h === 7) {
            width += dx;
        }
        if (h === 0 || h === 1 || h === 2) {
            y += dy;
            height -= dy;
        }
        if (h === 5 || h === 6 || h === 7) {
            height += dy;
        }
        width = Math.max(10, width);
        height = Math.max(10, height);
        this._model.updateStyle(id, { x, y, width, height });
        this._renderer.updateElement(this._model.getElement(id));
        this._updateSelectionBounds();
    }
    _commitResize() {
        if (this._state.selectedIds.length !== 1)
            return;
        const id = this._state.selectedIds[0];
        const el = this._model.getElement(id);
        if (!el)
            return;
        this._history.execute(new ResizeCommand(this._model, this._emitter, id, {
            x: el.style.x, y: el.style.y,
            width: typeof el.style.width === 'number' ? el.style.width : this._resizeStartRect.width,
            height: typeof el.style.height === 'number' ? el.style.height : this._resizeStartRect.height,
        }));
    }
    // ─── Text Edit ───────────────────────────────────────────────────────────
    _startTextEdit(id, screenX, screenY) {
        this._editingId = id;
        this._state.mode = 'textEdit';
        const el = this._model.getElement(id);
        if (!el || el.type !== 'text')
            return;
        this._renderer.getWorldPosition(screenX, screenY);
        const offset = this._renderer.getStageOffset();
        const doc = this._model.getDocument();
        const w = layoutResolver.resolveSize(el.style.width, doc.width);
        const h = layoutResolver.resolveSize(el.style.height, doc.height);
        const canvasBounds = this._canvas.getBoundingClientRect();
        const overlay = document.createElement('div');
        overlay.contentEditable = 'true';
        overlay.textContent = el.content;
        overlay.style.cssText = `
      position: fixed;
      left: ${canvasBounds.left + el.style.x + offset.x}px;
      top: ${canvasBounds.top + el.style.y + offset.y}px;
      width: ${w}px;
      min-height: ${h}px;
      font-size: ${el.style.fontSize}px;
      font-family: ${el.style.fontFamily};
      font-weight: ${el.style.fontWeight};
      color: ${el.style.color};
      text-align: ${el.style.textAlign};
      padding: ${el.style.paddingTop}px ${el.style.paddingRight}px ${el.style.paddingBottom}px ${el.style.paddingLeft}px;
      outline: 2px solid #6366f1;
      background: ${el.style.backgroundColor || 'transparent'};
      border: none;
      z-index: 9999;
      box-sizing: border-box;
      resize: none;
      overflow: hidden;
    `;
        overlay.addEventListener('blur', () => this._commitTextEdit());
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape')
                this._commitTextEdit();
        });
        document.body.appendChild(overlay);
        overlay.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(overlay);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        this._textEditOverlay = overlay;
        this._emitter.emit('text:edit:start', { id });
    }
    _commitTextEdit() {
        if (!this._editingId || !this._textEditOverlay)
            return;
        const content = this._textEditOverlay.textContent ?? '';
        this._model.updateContent(this._editingId, content);
        const el = this._model.getElement(this._editingId);
        if (el)
            this._renderer.updateElement(el);
        this._emitter.emit('text:edit:end', { id: this._editingId, content });
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
        this._removeTextOverlay();
        this._editingId = null;
        this._state.mode = 'idle';
    }
    _removeTextOverlay() {
        this._textEditOverlay?.remove();
        this._textEditOverlay = null;
    }
    // ─── Hit Testing ──────────────────────────────────────────────────────────
    _hitTest(world) {
        const doc = this._model.getDocument();
        // Walk in reverse order (top-most rendered last = highest zIndex)
        const allIds = [...doc.children].reverse();
        return this._hitTestIds(allIds, world);
    }
    _hitTestIds(ids, world) {
        const docState = this._model.getDocument();
        for (const id of ids) {
            const el = docState.elements[id];
            if (!el || !el.visible)
                continue;
            const w = layoutResolver.resolveSize(el.style.width, docState.width);
            const h = layoutResolver.resolveSize(el.style.height, docState.height);
            if (world.x >= el.style.x && world.x <= el.style.x + w &&
                world.y >= el.style.y && world.y <= el.style.y + h) {
                if (el.type === 'box' && el.children?.length > 0) {
                    // Check children first (deeper elements)
                    const childHit = this._hitTestIds([...el.children].reverse(), { x: world.x - el.style.x - el.style.paddingLeft, y: world.y - el.style.y - el.style.paddingTop });
                    if (childHit)
                        return childHit;
                }
                return id;
            }
        }
        return null;
    }
    _hitTestHandle(_sx, _sy) {
        // Simplified: actual implementation uses selection bounds + 8 handle rects
        return null;
    }
    // ─── Helpers ─────────────────────────────────────────────────────────────
    _updateSelectionBounds() {
        if (this._state.selectedIds.length === 0) {
            this._renderer.setSelection({ ids: [], bounds: null });
            return;
        }
        const doc = this._model.getDocument();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const id of this._state.selectedIds) {
            const el = doc.elements[id];
            if (!el)
                continue;
            const w = layoutResolver.resolveSize(el.style.width, doc.width);
            const h = layoutResolver.resolveSize(el.style.height, doc.height);
            minX = Math.min(minX, el.style.x);
            minY = Math.min(minY, el.style.y);
            maxX = Math.max(maxX, el.style.x + w);
            maxY = Math.max(maxY, el.style.y + h);
        }
        const selection = {
            ids: this._state.selectedIds,
            bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
        };
        this._renderer.setSelection(selection);
        this._emitter.emit('selection:change', { selection });
    }
    _emitSelection() {
        this._updateSelectionBounds();
    }
}

class StyleCommand {
    constructor(_model, _emitter, _id, _patch) {
        this._model = _model;
        this._emitter = _emitter;
        this._id = _id;
        this._patch = _patch;
        this.description = 'Update style';
        this._before = {};
    }
    execute() {
        const el = this._model.getElement(this._id);
        if (!el)
            return;
        // Capture only the keys we're going to change
        const keys = Object.keys(this._patch);
        this._before = Object.fromEntries(keys.map(k => [k, el.style[k]]));
        this._model.updateStyle(this._id, this._patch);
        const updated = this._model.getElement(this._id);
        this._emitter.emit('element:update', { element: updated });
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
    undo() {
        this._model.updateStyle(this._id, this._before);
        const updated = this._model.getElement(this._id);
        this._emitter.emit('element:update', { element: updated });
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
}

/**
 * LeftPanel — draggable element palette + format controls.
 * DOM-based panel overlaid on the canvas.
 */
class LeftPanel {
    constructor(_formatRegistry, _model, _history, _emitter) {
        this._formatRegistry = _formatRegistry;
        this._model = _model;
        this._history = _history;
        this._emitter = _emitter;
        this._currentSelectedId = null;
    }
    mount(container, api) {
        this._root = document.createElement('div');
        this._root.className = 'pe-left-panel';
        this._root.style.cssText = `
      width: 220px; height: 100%; overflow-y: auto;
      background: var(--pe-panel-bg, #1e1e2e);
      border-right: 1px solid var(--pe-border, #333);
      display: flex; flex-direction: column;
      flex-shrink: 0;
    `;
        this._root.appendChild(this._buildElementsPalette(api));
        this._root.appendChild(this._buildFormatSection(api));
        container.appendChild(this._root);
        // Update format section when selection changes
        this._emitter.on('selection:change', ({ selection }) => {
            const id = selection.ids[0] ?? null;
            this._currentSelectedId = id;
            this._refreshFormats(api);
        });
        return this._root;
    }
    _buildElementsPalette(api) {
        const section = this._makeSection('Elements');
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 12px 12px';
        const elements = [
            { type: 'box', label: '□ Box', icon: '⬜' },
            { type: 'text', label: 'T Text', icon: 'T' },
            { type: 'image', label: '🖼 Image', icon: '🖼' },
        ];
        for (const el of elements) {
            const card = document.createElement('div');
            card.draggable = true;
            card.style.cssText = `
        padding: 12px 8px; border-radius: 8px; text-align: center;
        background: rgba(255,255,255,0.05); cursor: grab;
        font-size: 11px; color: var(--pe-text, #e2e8f0);
        border: 1px solid var(--pe-border, #333);
        transition: all 0.15s; user-select: none;
      `;
            card.innerHTML = `<div style="font-size:20px;margin-bottom:4px">${el.icon}</div>${el.label}`;
            card.addEventListener('mouseenter', () => card.style.background = 'rgba(99,102,241,0.15)');
            card.addEventListener('mouseleave', () => card.style.background = 'rgba(255,255,255,0.05)');
            // Drag to canvas
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer?.setData('text/plain', JSON.stringify({ type: el.type }));
                card.style.opacity = '0.5';
            });
            card.addEventListener('dragend', () => { card.style.opacity = '1'; });
            // Click to add at center
            card.addEventListener('click', () => {
                const doc = this._model.getDocument();
                const id = api.addElement(el.type, null, {
                    x: doc.width / 2 - 100,
                    y: doc.height / 2 - 50,
                    free: true,
                });
                api.selectElement(id);
            });
            grid.appendChild(card);
        }
        section.appendChild(grid);
        return section;
    }
    _buildFormatSection(api) {
        const section = this._makeSection('Formats');
        this._formatsContainer = document.createElement('div');
        this._formatsContainer.style.cssText = 'padding: 0 12px 12px;';
        const placeholder = document.createElement('p');
        placeholder.textContent = 'Select an element to see formats.';
        placeholder.style.cssText = 'font-size:11px;color:var(--pe-text-muted,#666);margin:8px 0;';
        this._formatsContainer.appendChild(placeholder);
        section.appendChild(this._formatsContainer);
        return section;
    }
    _refreshFormats(api) {
        this._formatsContainer.innerHTML = '';
        if (!this._currentSelectedId) {
            const p = document.createElement('p');
            p.textContent = 'Select an element to see formats.';
            p.style.cssText = 'font-size:11px;color:var(--pe-text-muted,#666);margin:8px 0;';
            this._formatsContainer.appendChild(p);
            return;
        }
        const el = this._model.getElement(this._currentSelectedId);
        if (!el)
            return;
        this._formatRegistry.getForElement(el);
        const byGroup = this._formatRegistry.getByGroup();
        for (const [group, groupFormats] of byGroup) {
            const applicable = groupFormats.filter(f => f.appliesTo.includes(el.type));
            if (applicable.length === 0)
                continue;
            const groupEl = document.createElement('div');
            groupEl.style.cssText = 'margin-bottom:12px;';
            const groupLabel = document.createElement('div');
            groupLabel.textContent = group;
            groupLabel.style.cssText = 'font-size:10px;font-weight:600;color:var(--pe-text-muted,#888);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;';
            groupEl.appendChild(groupLabel);
            for (const fmt of applicable) {
                const id = this._currentSelectedId;
                const control = fmt.renderControl(el, (value) => {
                    const patch = fmt.apply(el, value);
                    this._history.execute(new StyleCommand(this._model, this._emitter, id, patch));
                });
                control.style.marginBottom = '8px';
                groupEl.appendChild(control);
            }
            this._formatsContainer.appendChild(groupEl);
        }
    }
    _makeSection(title) {
        const section = document.createElement('div');
        const header = document.createElement('div');
        header.textContent = title;
        header.style.cssText = `
      font-size: 11px; font-weight: 600; padding: 12px 12px 8px;
      color: var(--pe-text-muted, #888); text-transform: uppercase;
      letter-spacing: 1px; border-bottom: 1px solid var(--pe-border, #333);
      margin-bottom: 8px;
    `;
        section.appendChild(header);
        return section;
    }
}

/**
 * RightPanel — two-tab panel: Properties + Layers.
 */
class RightPanel {
    constructor(_model, _formatRegistry, _history, _emitter) {
        this._model = _model;
        this._formatRegistry = _formatRegistry;
        this._history = _history;
        this._emitter = _emitter;
        this._activeTab = 'properties';
        this._currentSelectedId = null;
    }
    mount(container, api) {
        this._root = document.createElement('div');
        this._root.style.cssText = 'width:260px;height:100%;background:var(--pe-panel-bg,#1e1e2e);border-left:1px solid var(--pe-border,#333);display:flex;flex-direction:column;flex-shrink:0;';
        // Tab bar
        const tabBar = document.createElement('div');
        tabBar.style.cssText = 'display:flex;border-bottom:1px solid var(--pe-border,#333);flex-shrink:0;';
        const makeTab = (label, key) => {
            const t = document.createElement('button');
            t.textContent = label;
            t.style.cssText = 'flex:1;padding:10px;border:none;background:none;cursor:pointer;font-size:12px;color:var(--pe-text-muted,#888);border-bottom:2px solid transparent;';
            t.addEventListener('click', () => {
                this._activeTab = key;
                this._propertiesPane.style.display = key === 'properties' ? 'block' : 'none';
                this._layersPane.style.display = key === 'layers' ? 'block' : 'none';
                propTab.style.cssText = propTab.style.cssText.replace(/border-bottom:[^;]+/, `border-bottom:2px solid ${key === 'properties' ? '#6366f1' : 'transparent'}`);
                layTab.style.cssText = layTab.style.cssText.replace(/border-bottom:[^;]+/, `border-bottom:2px solid ${key === 'layers' ? '#6366f1' : 'transparent'}`);
                propTab.style.color = key === 'properties' ? 'var(--pe-text,#e2e8f0)' : 'var(--pe-text-muted,#888)';
                layTab.style.color = key === 'layers' ? 'var(--pe-text,#e2e8f0)' : 'var(--pe-text-muted,#888)';
                if (key === 'layers')
                    this._refreshLayers(api);
            });
            return t;
        };
        const propTab = makeTab('Properties', 'properties');
        const layTab = makeTab('Layers', 'layers');
        propTab.style.color = 'var(--pe-text,#e2e8f0)';
        propTab.style.borderBottom = '2px solid #6366f1';
        tabBar.append(propTab, layTab);
        this._root.appendChild(tabBar);
        // Content panes
        this._propertiesPane = document.createElement('div');
        this._propertiesPane.style.cssText = 'flex:1;overflow-y:auto;display:block;';
        this._layersPane = document.createElement('div');
        this._layersPane.style.cssText = 'flex:1;overflow-y:auto;display:none;';
        this._root.append(this._propertiesPane, this._layersPane);
        container.appendChild(this._root);
        // Listeners
        this._emitter.on('selection:change', ({ selection }) => {
            this._currentSelectedId = selection.ids[0] ?? null;
            this._refreshProperties(api);
            if (this._activeTab === 'layers')
                this._refreshLayers(api);
        });
        this._emitter.on('document:change', () => {
            if (this._activeTab === 'layers')
                this._refreshLayers(api);
            if (this._currentSelectedId)
                this._refreshProperties(api);
        });
        return this._root;
    }
    _refreshProperties(api) {
        this._propertiesPane.innerHTML = '';
        if (!this._currentSelectedId) {
            const p = this._placeholder('Select an element to edit its properties.');
            this._propertiesPane.appendChild(p);
            return;
        }
        const el = this._model.getElement(this._currentSelectedId);
        if (!el)
            return;
        // Element info header
        const header = document.createElement('div');
        header.style.cssText = 'padding:12px;border-bottom:1px solid var(--pe-border,#333);';
        const nameInput = document.createElement('input');
        nameInput.value = el.name;
        nameInput.style.cssText = 'width:100%;padding:6px 8px;background:rgba(255,255,255,0.05);border:1px solid var(--pe-border,#333);border-radius:4px;color:var(--pe-text,#e2e8f0);font-size:12px;box-sizing:border-box;';
        nameInput.addEventListener('change', () => this._model.updateName(el.id, nameInput.value));
        const meta = document.createElement('div');
        meta.style.cssText = 'font-size:10px;color:var(--pe-text-muted,#666);margin-top:4px;display:flex;gap:8px;';
        meta.innerHTML = `<span>Type: ${el.type}</span><span>Free: ${el.free}</span>`;
        // Free toggle
        const freeToggle = document.createElement('label');
        freeToggle.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-top:6px;color:var(--pe-text,#e2e8f0);';
        const freeCheck = document.createElement('input');
        freeCheck.type = 'checkbox';
        freeCheck.checked = el.free;
        freeCheck.addEventListener('change', () => api.setFree(el.id, freeCheck.checked));
        freeToggle.append(freeCheck, document.createTextNode('Free position'));
        header.append(nameInput, meta, freeToggle);
        this._propertiesPane.appendChild(header);
        // Format controls by group
        const byGroup = this._formatRegistry.getByGroup();
        for (const [group, formats] of byGroup) {
            const applicable = formats.filter(f => f.appliesTo.includes(el.type));
            if (applicable.length === 0)
                continue;
            const section = this._makeSection(group);
            const id = this._currentSelectedId;
            for (const fmt of applicable) {
                const control = fmt.renderControl(el, (value) => {
                    const patch = fmt.apply(el, value);
                    this._history.execute(new StyleCommand(this._model, this._emitter, id, patch));
                });
                control.style.marginBottom = '8px';
                section.appendChild(control);
            }
            this._propertiesPane.appendChild(section);
        }
    }
    _refreshLayers(api) {
        this._layersPane.innerHTML = '';
        const doc = this._model.getDocument();
        const header = document.createElement('div');
        header.style.cssText = 'padding:12px;font-size:11px;font-weight:600;color:var(--pe-text-muted,#888);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--pe-border,#333);';
        header.textContent = `Layers (${Object.keys(doc.elements).length})`;
        this._layersPane.appendChild(header);
        const list = document.createElement('div');
        list.style.cssText = 'padding:8px 0;';
        // Render from top to bottom (reverse for visual top = first)
        const renderIds = (ids, depth) => {
            for (const id of [...ids].reverse()) {
                const el = doc.elements[id];
                if (!el)
                    continue;
                const row = this._makeLayerRow(el, depth, api, doc);
                list.appendChild(row);
                if (el.type === 'box' && el.children?.length > 0) {
                    renderIds(el.children, depth + 1);
                }
            }
        };
        renderIds(doc.children, 0);
        this._layersPane.appendChild(list);
    }
    _makeLayerRow(el, depth, api, doc) {
        const isSelected = el.id === this._currentSelectedId;
        const row = document.createElement('div');
        row.draggable = true;
        row.style.cssText = `
      display:flex;align-items:center;gap:6px;padding:6px 12px 6px ${12 + depth * 16}px;
      cursor:pointer;font-size:12px;
      background:${isSelected ? 'rgba(99,102,241,0.2)' : 'transparent'};
      color:var(--pe-text,#e2e8f0);
      border-left:${isSelected ? '2px solid #6366f1' : '2px solid transparent'};
    `;
        const icon = { box: '⬜', image: '🖼', text: 'T' }[el.type];
        const typeSpan = document.createElement('span');
        typeSpan.textContent = icon;
        typeSpan.style.cssText = 'font-size:12px;flex-shrink:0';
        const nameEl = document.createElement('span');
        nameEl.textContent = el.name;
        nameEl.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        // Visibility toggle
        const visBtn = document.createElement('button');
        visBtn.textContent = el.visible ? '👁' : '🚫';
        visBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:12px;padding:2px;';
        visBtn.title = el.visible ? 'Hide' : 'Show';
        visBtn.addEventListener('click', (e) => { e.stopPropagation(); this._model.setVisible(el.id, !el.visible); this._emitter.emit('document:change', { document: this._model.getSnapshot() }); });
        // Lock toggle
        const lockBtn = document.createElement('button');
        lockBtn.textContent = el.locked ? '🔒' : '🔓';
        lockBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:12px;padding:2px;';
        lockBtn.addEventListener('click', (e) => { e.stopPropagation(); this._model.setLocked(el.id, !el.locked); this._emitter.emit('document:change', { document: this._model.getSnapshot() }); });
        // Layer order buttons
        const upBtn = document.createElement('button');
        upBtn.textContent = '↑';
        upBtn.title = 'Move up';
        upBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:12px;padding:2px;color:var(--pe-text-muted,#888);';
        upBtn.addEventListener('click', (e) => { e.stopPropagation(); api.moveLayer(el.id, 'up'); });
        const downBtn = document.createElement('button');
        downBtn.textContent = '↓';
        downBtn.title = 'Move down';
        downBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:12px;padding:2px;color:var(--pe-text-muted,#888);';
        downBtn.addEventListener('click', (e) => { e.stopPropagation(); api.moveLayer(el.id, 'down'); });
        row.append(typeSpan, nameEl, visBtn, lockBtn, upBtn, downBtn);
        row.addEventListener('click', () => api.selectElement(el.id));
        // Drag-to-reorder
        row.addEventListener('dragstart', (e) => { e.dataTransfer?.setData('text/plain', JSON.stringify({ layerId: el.id })); });
        row.addEventListener('dragover', (e) => { e.preventDefault(); row.style.borderTop = '2px solid #6366f1'; });
        row.addEventListener('dragleave', () => { row.style.borderTop = ''; });
        row.addEventListener('drop', (e) => {
            e.preventDefault();
            row.style.borderTop = '';
            try {
                const data = JSON.parse(e.dataTransfer?.getData('text/plain') ?? '{}');
                if (data.layerId && data.layerId !== el.id) {
                    api.reorderLayer(data.layerId, el.id, 'before');
                }
            }
            catch { }
        });
        return row;
    }
    _makeSection(title) {
        const s = document.createElement('div');
        s.style.cssText = 'padding:12px;border-bottom:1px solid rgba(255,255,255,0.05);';
        const h = document.createElement('div');
        h.textContent = title;
        h.style.cssText = 'font-size:10px;font-weight:600;color:var(--pe-text-muted,#888);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;';
        s.appendChild(h);
        return s;
    }
    _placeholder(text) {
        const p = document.createElement('p');
        p.textContent = text;
        p.style.cssText = 'font-size:12px;color:var(--pe-text-muted,#666);padding:16px;text-align:center;';
        return p;
    }
}

/**
 * BubbleToolbar — floating toolbar that appears above text elements when selected.
 * Contains quick text formatting: bold, italic, underline, align, size, color.
 */
class BubbleToolbar {
    constructor(_model, _history, _emitter) {
        this._model = _model;
        this._history = _history;
        this._emitter = _emitter;
        this._root = null;
        this._currentId = null;
    }
    mount(container, api) {
        this._emitter.on('selection:change', ({ selection }) => {
            const id = selection.ids[0] ?? null;
            const el = id ? this._model.getElement(id) : null;
            this._currentId = id;
            if (el?.type === 'text' && selection.bounds) {
                this._show(container, api, el, selection.bounds);
            }
            else {
                this._hide();
            }
        });
    }
    _show(container, api, el, bounds) {
        this._hide();
        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
      position: absolute;
      left: ${bounds.x + bounds.width / 2}px;
      top: ${Math.max(8, bounds.y - 48)}px;
      transform: translateX(-50%);
      background: #1e1e2e;
      border: 1px solid #333;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 4px 6px;
      z-index: 10000;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    `;
        const addBtn = (label, title, action, active = false) => {
            const btn = document.createElement('button');
            btn.innerHTML = label;
            btn.title = title;
            btn.style.cssText = `
        background:${active ? 'rgba(99,102,241,0.3)' : 'none'};
        border:none;padding:5px 8px;color:#e2e8f0;cursor:pointer;
        font-size:13px;border-radius:4px;
      `;
            btn.addEventListener('click', action);
            toolbar.appendChild(btn);
        };
        const sep = () => { const d = document.createElement('div'); d.style.cssText = 'width:1px;height:16px;background:#333;margin:0 2px;'; toolbar.appendChild(d); };
        addBtn('<b>B</b>', 'Bold', () => this._updateStyle({ fontWeight: el.style.fontWeight === '700' ? '400' : '700' }), el.style.fontWeight === '700');
        addBtn('<i>I</i>', 'Italic', () => this._updateStyle({ fontStyle: el.style.fontStyle === 'italic' ? 'normal' : 'italic' }), el.style.fontStyle === 'italic');
        addBtn('<u>U</u>', 'Underline', () => this._updateStyle({ textDecoration: el.style.textDecoration === 'underline' ? 'none' : 'underline' }), el.style.textDecoration === 'underline');
        sep();
        addBtn('←', 'Align Left', () => this._updateStyle({ textAlign: 'left' }), el.style.textAlign === 'left');
        addBtn('↔', 'Center', () => this._updateStyle({ textAlign: 'center' }), el.style.textAlign === 'center');
        addBtn('→', 'Align Right', () => this._updateStyle({ textAlign: 'right' }), el.style.textAlign === 'right');
        sep();
        // Font size control
        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
        sizeInput.value = String(el.style.fontSize);
        sizeInput.min = '8';
        sizeInput.max = '200';
        sizeInput.style.cssText = 'width:44px;padding:3px 6px;background:rgba(255,255,255,0.05);border:1px solid #444;border-radius:4px;color:#e2e8f0;font-size:12px;';
        sizeInput.addEventListener('change', () => this._updateStyle({ fontSize: Number(sizeInput.value) }));
        toolbar.appendChild(sizeInput);
        sep();
        // Color
        const colorInp = document.createElement('input');
        colorInp.type = 'color';
        colorInp.value = el.style.color;
        colorInp.style.cssText = 'width:28px;height:28px;border:none;padding:0;cursor:pointer;border-radius:4px;background:none;';
        colorInp.addEventListener('input', () => this._updateStyle({ color: colorInp.value }));
        toolbar.appendChild(colorInp);
        this._root = toolbar;
        container.appendChild(toolbar);
    }
    _updateStyle(patch) {
        if (!this._currentId)
            return;
        this._history.execute(new StyleCommand(this._model, this._emitter, this._currentId, patch));
    }
    _hide() {
        this._root?.remove();
        this._root = null;
    }
}

/**
 * PanelManager orchestrates all DOM panels and applies theming.
 */
class PanelManager {
    constructor(_model, _formatRegistry, _history, _emitter, _menu, _config = {}) {
        this._model = _model;
        this._formatRegistry = _formatRegistry;
        this._history = _history;
        this._emitter = _emitter;
        this._menu = _menu;
        this._config = _config;
        this._left = new LeftPanel(_formatRegistry, _model, _history, _emitter);
        this._right = new RightPanel(_model, _formatRegistry, _history, _emitter);
        this._bubble = new BubbleToolbar(_model, _history, _emitter);
    }
    mount(container, api) {
        this._applyTheme(container, this._config.theme);
        // Shell layout
        this._shell = document.createElement('div');
        this._shell.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;font-family:var(--pe-font-family,Inter,system-ui,sans-serif);';
        // Menubar
        this._menu.mount(this._shell, api);
        // Main area (panels + canvas)
        const main = document.createElement('div');
        main.style.cssText = 'display:flex;flex:1;overflow:hidden;position:relative;';
        this._left.mount(main, api);
        // Canvas wrapper
        this._canvasWrap = document.createElement('div');
        this._canvasWrap.style.cssText = 'flex:1;position:relative;overflow:hidden;background:var(--pe-canvas-bg,#f0f0f0);';
        main.appendChild(this._canvasWrap);
        this._right.mount(main, api);
        this._shell.appendChild(main);
        container.appendChild(this._shell);
        // Bubble toolbar mounts on canvas wrap
        this._bubble.mount(this._canvasWrap, api);
        // Drop zone for dragging elements from palette
        this._canvasWrap.addEventListener('dragover', (e) => e.preventDefault());
        this._canvasWrap.addEventListener('drop', (e) => {
            e.preventDefault();
            try {
                const data = JSON.parse(e.dataTransfer?.getData('text/plain') ?? '{}');
                if (data.type) {
                    const rect = this._canvasWrap.getBoundingClientRect();
                    const id = api.addElement(data.type, null, {
                        x: e.clientX - rect.left - 100,
                        y: e.clientY - rect.top - 50,
                    });
                    api.selectElement(id);
                }
            }
            catch { }
        });
        this._emitter.emit('panel:ready', {});
        return { canvasContainer: this._canvasWrap };
    }
    _applyTheme(container, theme) {
        const t = theme ?? {};
        const vars = {
            '--pe-panel-bg': t.panelBackground ?? '#1e1e2e',
            '--pe-border': t.panelBorder ?? '#2d2d3d',
            '--pe-accent': t.accent ?? '#6366f1',
            '--pe-text': t.text ?? '#e2e8f0',
            '--pe-text-muted': t.textMuted ?? '#64748b',
            '--pe-input-bg': t.inputBackground ?? 'rgba(255,255,255,0.06)',
            '--pe-font-family': t.fontFamily ?? 'Inter, system-ui, sans-serif',
        };
        for (const [k, v] of Object.entries(vars)) {
            container.style.setProperty(k, v);
        }
    }
}

class MenuManager {
    constructor(customItems = [], exportFormats = []) {
        this._customItems = [...customItems];
        this._exportFormats = [...exportFormats];
    }
    mount(container, api) {
        this._bar = document.createElement('div');
        this._bar.style.cssText = 'display:flex;align-items:center;height:40px;background:var(--pe-panel-bg,#1e1e2e);border-bottom:1px solid var(--pe-border,#333);padding:0 12px;gap:4px;z-index:100;flex-shrink:0;';
        const logo = document.createElement('span');
        logo.textContent = '✦ PixiEditor';
        logo.style.cssText = 'font-size:13px;font-weight:600;color:#a5b4fc;margin-right:16px;';
        this._bar.appendChild(logo);
        this._addMenu('File', [
            { label: 'Export JSON', action: () => { const b = new Blob([JSON.stringify(api.getDocument(), null, 2)], { type: 'application/json' }); this._dl(b, 'document.json'); } },
            ...this._exportFormats.map(ef => ({ label: ef.label, action: async () => { const r = await ef.handler(api.getDocument()); this._dl(r instanceof Blob ? r : new Blob([r]), `document.${ef.id}`); } })),
        ]);
        this._addMenu('Edit', [
            { label: 'Undo  ⌘Z', action: () => api.undo() },
            { label: 'Redo  ⌘⇧Z', action: () => api.redo() },
        ]);
        const groups = new Map();
        for (const item of this._customItems) {
            if (!groups.has(item.group))
                groups.set(item.group, []);
            groups.get(item.group).push(item);
        }
        for (const [g, items] of groups)
            this._addMenu(g, items.map(i => ({ label: i.label, action: () => i.callback(api) })));
        container.appendChild(this._bar);
        return this._bar;
    }
    _addMenu(label, items) {
        const wrap = document.createElement('div');
        wrap.style.position = 'relative';
        const btn = this._mkBtn(label, () => { const open = dd.style.display === 'block'; this._closeAll(); dd.style.display = open ? 'none' : 'block'; });
        const dd = document.createElement('div');
        dd.className = 'pe-dropdown';
        dd.style.cssText = 'display:none;position:absolute;top:100%;left:0;background:var(--pe-panel-bg,#1e1e2e);border:1px solid var(--pe-border,#333);border-radius:6px;min-width:160px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.4);padding:4px 0;';
        for (const it of items) {
            const e = document.createElement('button');
            e.textContent = it.label;
            e.style.cssText = 'display:block;width:100%;text-align:left;padding:7px 14px;border:none;background:none;color:var(--pe-text,#e2e8f0);font-size:12px;cursor:pointer;';
            e.addEventListener('mouseenter', () => e.style.background = 'rgba(99,102,241,0.15)');
            e.addEventListener('mouseleave', () => e.style.background = 'none');
            e.addEventListener('click', () => { this._closeAll(); it.action(); });
            dd.appendChild(e);
        }
        wrap.append(btn, dd);
        this._bar.appendChild(wrap);
        document.addEventListener('click', ev => { if (!wrap.contains(ev.target))
            dd.style.display = 'none'; });
    }
    _mkBtn(label, onClick) {
        const b = document.createElement('button');
        b.textContent = label;
        b.style.cssText = 'background:none;border:none;padding:5px 10px;color:var(--pe-text,#e2e8f0);font-size:12px;cursor:pointer;border-radius:4px;';
        b.addEventListener('mouseenter', () => b.style.background = 'rgba(255,255,255,0.08)');
        b.addEventListener('mouseleave', () => b.style.background = 'none');
        b.addEventListener('click', onClick);
        return b;
    }
    _closeAll() { document.querySelectorAll('.pe-dropdown').forEach(d => d.style.display = 'none'); }
    _dl(blob, name) { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); }
}

function makeLabel(text) {
    const el = document.createElement('label');
    el.textContent = text;
    el.style.cssText = 'display:block;font-size:11px;color:var(--pe-text-muted,#888);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px';
    return el;
}
function makeRow() {
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;';
    return el;
}
function makeColorInput(label, value, onChange) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:2px';
    const lbl = makeLabel(label);
    const inp = document.createElement('input');
    inp.type = 'color';
    inp.value = value.startsWith('#') ? value : '#000000';
    inp.style.cssText = 'width:36px;height:28px;border:none;padding:0;cursor:pointer;border-radius:4px;background:none';
    inp.addEventListener('input', () => onChange(inp.value));
    wrap.append(lbl, inp);
    return wrap;
}
function makeNumberInput(label, value, min, onChange) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
    const lbl = makeLabel(label);
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.value = String(value);
    inp.min = String(min);
    inp.style.cssText = 'width:56px;padding:4px 6px;border:1px solid var(--pe-border,#ddd);border-radius:4px;font-size:12px;background:var(--pe-input-bg,#fff)';
    inp.addEventListener('change', () => onChange(Number(inp.value)));
    wrap.append(lbl, inp);
    return wrap;
}
function makeTextInput(label, placeholder, value, onChange) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:2px;flex:1';
    const lbl = makeLabel(label);
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = value;
    inp.placeholder = placeholder;
    inp.style.cssText = 'width:100%;padding:4px 6px;border:1px solid var(--pe-border,#ddd);border-radius:4px;font-size:12px;background:var(--pe-input-bg,#fff)';
    inp.addEventListener('change', () => onChange(inp.value));
    wrap.append(lbl, inp);
    return wrap;
}
function makeSlider(label, value, min, max, step, onChange) {
    const inp = document.createElement('input');
    inp.type = 'range';
    inp.min = String(min);
    inp.max = String(max);
    inp.step = String(step);
    inp.value = String(value);
    inp.style.cssText = 'width:100%;accent-color:var(--pe-accent,#6366f1)';
    inp.addEventListener('input', () => onChange(Number(inp.value)));
    return inp;
}
function makeToggle(label, value, onChange) {
    const wrap = document.createElement('label');
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;user-select:none';
    const inp = document.createElement('input');
    inp.type = 'checkbox';
    inp.checked = value;
    inp.addEventListener('change', () => onChange(inp.checked));
    wrap.append(inp, document.createTextNode(label));
    return wrap;
}
function makeSelect(label, options, value, onChange) {
    const sel = document.createElement('select');
    sel.style.cssText = 'padding:4px 6px;border:1px solid var(--pe-border,#ddd);border-radius:4px;font-size:12px;background:var(--pe-input-bg,#fff)';
    for (const opt of options) {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (opt.value === value)
            o.selected = true;
        sel.appendChild(o);
    }
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
}
function makeSegmented(options, value, onChange) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;border:1px solid var(--pe-border,#ddd);border-radius:4px;overflow:hidden';
    for (const opt of options) {
        const btn = document.createElement('button');
        btn.textContent = opt.label;
        btn.title = opt.value;
        btn.style.cssText = `flex:1;padding:4px;border:none;font-size:12px;cursor:pointer;background:${opt.value === value ? 'var(--pe-accent,#6366f1)' : 'var(--pe-input-bg,#fff)'};color:${opt.value === value ? '#fff' : 'inherit'}`;
        btn.addEventListener('click', () => onChange(opt.value));
        wrap.appendChild(btn);
    }
    return wrap;
}

class BackgroundColorFormat {
    constructor() {
        this.id = 'backgroundColor';
        this.name = 'Background Color';
        this.group = 'Background';
        this.appliesTo = ['box', 'text'];
    }
    getValue(el) { return el.style.backgroundColor; }
    apply(_, value) { return { backgroundColor: value }; }
    renderControl(el, onChange) {
        return makeColorInput(this.name, this.getValue(el), onChange);
    }
}

class BackgroundImageFormat {
    constructor() {
        this.id = 'backgroundImage';
        this.name = 'Background Image';
        this.group = 'Background';
        this.appliesTo = ['box'];
    }
    getValue(el) { return el.style.backgroundImage; }
    apply(_, value) { return { backgroundImage: value }; }
    renderControl(el, onChange) {
        return makeTextInput(this.name, 'Image URL', this.getValue(el), onChange);
    }
}

class ColorFormat {
    constructor() {
        this.id = 'color';
        this.name = 'Text Color';
        this.group = 'Typography';
        this.appliesTo = ['text', 'box'];
    }
    getValue(el) { return el.style.color; }
    apply(_, value) { return { color: value }; }
    renderControl(el, onChange) {
        return makeColorInput(this.name, this.getValue(el), onChange);
    }
}

class PaddingFormat {
    constructor() {
        this.id = 'padding';
        this.name = 'Padding';
        this.group = 'Spacing';
        this.appliesTo = ['box', 'text'];
    }
    getValue(el) {
        return { top: el.style.paddingTop, right: el.style.paddingRight, bottom: el.style.paddingBottom, left: el.style.paddingLeft };
    }
    apply(_, v) {
        return { paddingTop: v.top, paddingRight: v.right, paddingBottom: v.bottom, paddingLeft: v.left };
    }
    renderControl(el, onChange) {
        const cur = this.getValue(el);
        const wrap = document.createElement('div');
        wrap.appendChild(makeLabel(this.name));
        const row = makeRow();
        const update = (key) => (val) => onChange({ ...cur, [key]: val });
        ['top', 'right', 'bottom', 'left'].forEach(k => {
            row.appendChild(makeNumberInput(k, cur[k], 0, update(k)));
        });
        wrap.appendChild(row);
        return wrap;
    }
}

class BorderRadiusFormat {
    constructor() {
        this.id = 'borderRadius';
        this.name = 'Border Radius';
        this.group = 'Border';
        this.appliesTo = ['box', 'image', 'text'];
    }
    getValue(el) { return el.style.borderRadiusTopLeft; }
    apply(_, v) {
        return { borderRadiusTopLeft: v, borderRadiusTopRight: v, borderRadiusBottomRight: v, borderRadiusBottomLeft: v };
    }
    renderControl(el, onChange) {
        const wrap = document.createElement('div');
        wrap.appendChild(makeLabel(this.name));
        wrap.appendChild(makeNumberInput('radius', this.getValue(el), 0, onChange));
        return wrap;
    }
}

class CircleFormat {
    constructor() {
        this.id = 'isCircle';
        this.name = 'Circle';
        this.group = 'Shape';
        this.appliesTo = ['box', 'image'];
    }
    getValue(el) { return el.style.isCircle; }
    apply(_, v) { return { isCircle: v }; }
    renderControl(el, onChange) {
        return makeToggle(this.name, this.getValue(el), onChange);
    }
}

class OpacityFormat {
    constructor() {
        this.id = 'opacity';
        this.name = 'Opacity';
        this.group = 'Effects';
        this.appliesTo = ['box', 'image', 'text'];
    }
    getValue(el) { return el.style.opacity; }
    apply(_, v) { return { opacity: v }; }
    renderControl(el, onChange) {
        const wrap = document.createElement('div');
        wrap.appendChild(makeLabel(this.name));
        wrap.appendChild(makeSlider('opacity', this.getValue(el), 0, 1, 0.01, onChange));
        return wrap;
    }
}

class FontSizeFormat {
    constructor() {
        this.id = 'fontSize';
        this.name = 'Font Size';
        this.group = 'Typography';
        this.appliesTo = ['text'];
    }
    getValue(el) { return el.style.fontSize; }
    apply(_, v) { return { fontSize: v }; }
    renderControl(el, onChange) {
        const wrap = document.createElement('div');
        wrap.appendChild(makeLabel(this.name));
        wrap.appendChild(makeNumberInput('size', this.getValue(el), 1, onChange));
        return wrap;
    }
}

const FONTS = ['Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS', 'Impact'];
class FontFamilyFormat {
    constructor() {
        this.id = 'fontFamily';
        this.name = 'Font Family';
        this.group = 'Typography';
        this.appliesTo = ['text'];
    }
    getValue(el) { return el.style.fontFamily; }
    apply(_, v) { return { fontFamily: v }; }
    renderControl(el, onChange) {
        const wrap = document.createElement('div');
        wrap.appendChild(makeLabel(this.name));
        wrap.appendChild(makeSelect('fontFamily', FONTS.map(f => ({ value: f, label: f })), this.getValue(el), onChange));
        return wrap;
    }
}

const OPTIONS = [
    { value: 'left', label: '←' }, { value: 'center', label: '↔' },
    { value: 'right', label: '→' }, { value: 'justify', label: '≡' },
];
class TextAlignFormat {
    constructor() {
        this.id = 'textAlign';
        this.name = 'Text Align';
        this.group = 'Typography';
        this.appliesTo = ['text'];
    }
    getValue(el) { return el.style.textAlign; }
    apply(_, v) { return { textAlign: v }; }
    renderControl(el, onChange) {
        const wrap = document.createElement('div');
        wrap.appendChild(makeLabel(this.name));
        wrap.appendChild(makeSegmented(OPTIONS, this.getValue(el), onChange));
        return wrap;
    }
}

class BorderFormat {
    constructor() {
        this.id = 'border';
        this.name = 'Border';
        this.group = 'Border';
        this.appliesTo = ['box', 'image', 'text'];
    }
    getValue(el) { return el.style.border; }
    apply(_, v) { return { border: v }; }
    renderControl(el, onChange) {
        const cur = this.getValue(el);
        const wrap = document.createElement('div');
        wrap.appendChild(makeLabel(this.name));
        const row = makeRow();
        row.appendChild(makeNumberInput('width', cur.width, 0, w => onChange({ ...cur, width: w })));
        row.appendChild(makeColorInput('color', cur.color, c => onChange({ ...cur, color: c })));
        row.appendChild(makeSelect('style', [
            { value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }, { value: 'none', label: 'None' }
        ], cur.style, s => onChange({ ...cur, style: s })));
        wrap.appendChild(row);
        return wrap;
    }
}

const DEFAULT_SHADOW = { x: 0, y: 4, blur: 8, spread: 0, color: 'rgba(0,0,0,0.2)', inset: false };
class ShadowFormat {
    constructor() {
        this.id = 'shadow';
        this.name = 'Shadow';
        this.group = 'Effects';
        this.appliesTo = ['box', 'image', 'text'];
    }
    getValue(el) { return el.style.shadow; }
    apply(_, v) { return { shadow: v }; }
    renderControl(el, onChange) {
        const cur = this.getValue(el) ?? DEFAULT_SHADOW;
        const wrap = document.createElement('div');
        wrap.appendChild(makeLabel(this.name));
        wrap.appendChild(makeToggle('Enable', !!this.getValue(el), (on) => onChange(on ? { ...DEFAULT_SHADOW } : null)));
        const row = makeRow();
        ['x', 'y', 'blur', 'spread'].forEach(k => {
            row.appendChild(makeNumberInput(k, cur[k], -999, (v) => onChange({ ...cur, [k]: v })));
        });
        row.appendChild(makeColorInput('color', cur.color, c => onChange({ ...cur, color: c })));
        wrap.appendChild(row);
        return wrap;
    }
}

class SizeFormat {
    constructor() {
        this.id = 'size';
        this.name = 'Size';
        this.group = 'Layout';
        this.appliesTo = ['box', 'image', 'text'];
    }
    getValue(el) { return { width: el.style.width, height: el.style.height }; }
    apply(_, v) { return { width: v.width, height: v.height }; }
    renderControl(el, onChange) {
        const cur = this.getValue(el);
        const wrap = document.createElement('div');
        wrap.appendChild(makeLabel(this.name));
        const row = makeRow();
        row.appendChild(makeTextInput('W', 'width', String(cur.width), v => onChange({ ...cur, width: isNaN(Number(v)) ? v : Number(v) })));
        row.appendChild(makeTextInput('H', 'height', String(cur.height), v => onChange({ ...cur, height: isNaN(Number(v)) ? v : Number(v) })));
        wrap.appendChild(row);
        return wrap;
    }
}

class RotationFormat {
    constructor() {
        this.id = 'rotation';
        this.name = 'Rotation';
        this.group = 'Transform';
        this.appliesTo = ['box', 'image', 'text'];
    }
    getValue(el) { return el.style.rotation; }
    apply(_, v) { return { rotation: v }; }
    renderControl(el, onChange) {
        const wrap = document.createElement('div');
        wrap.appendChild(makeLabel(this.name));
        wrap.appendChild(makeNumberInput('deg', this.getValue(el), -360, onChange));
        return wrap;
    }
}

class AddElementCommand {
    constructor(_model, _emitter, _type, _parentId, _stylePatch, _extraProps = {}) {
        this._model = _model;
        this._emitter = _emitter;
        this._type = _type;
        this._parentId = _parentId;
        this._stylePatch = _stylePatch;
        this._extraProps = _extraProps;
        this._createdElement = null;
        this.description = `Add ${_type}`;
    }
    execute() {
        this._createdElement = this._model.addElement(this._type, this._parentId, this._stylePatch, this._extraProps);
        this._emitter.emit('element:add', { element: this._createdElement });
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
    undo() {
        if (!this._createdElement)
            return;
        this._model.removeElement(this._createdElement.id);
        this._emitter.emit('element:remove', { id: this._createdElement.id });
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
    get createdId() { return this._createdElement?.id ?? null; }
}

class RemoveElementCommand {
    constructor(_model, _emitter, _id) {
        this._model = _model;
        this._emitter = _emitter;
        this._id = _id;
        this.description = 'Remove element';
        this._snapshot = null;
    }
    execute() {
        this._snapshot = this._model.getSnapshot();
        this._model.removeElement(this._id);
        this._emitter.emit('element:remove', { id: this._id });
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
    undo() {
        if (!this._snapshot)
            return;
        this._model.loadSnapshot(this._snapshot);
        const el = this._model.getElement(this._id);
        this._emitter.emit('element:add', { element: el });
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
}

class LayerMoveCommand {
    constructor(_model, _emitter, _id, _direction) {
        this._model = _model;
        this._emitter = _emitter;
        this._id = _id;
        this._direction = _direction;
        this._snapshot = null;
        this.description = `Move layer ${_direction}`;
    }
    execute() {
        this._snapshot = this._model.getSnapshot();
        this._model.moveLayer(this._id, this._direction);
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
    undo() {
        if (!this._snapshot)
            return;
        this._model.loadSnapshot(this._snapshot);
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
}
class LayerReorderCommand {
    constructor(_model, _emitter, _id, _targetId, _position) {
        this._model = _model;
        this._emitter = _emitter;
        this._id = _id;
        this._targetId = _targetId;
        this._position = _position;
        this.description = 'Reorder layer';
        this._snapshot = null;
    }
    execute() {
        this._snapshot = this._model.getSnapshot();
        this._model.reorderLayer(this._id, this._targetId, this._position);
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
    undo() {
        if (!this._snapshot)
            return;
        this._model.loadSnapshot(this._snapshot);
        this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    }
}

const DEFAULT_SNAP_CONFIG = {
    enabled: true,
    grid: true,
    gridSize: 20,
    gridColor: '#e2e8f0',
    elements: true,
    canvas: true,
    smartGuides: true,
    threshold: 8,
};
/**
 * Editor — the top-level composition root.
 *
 * Responsibilities:
 *  - Wire all subsystems together
 *  - Expose a clean EditorAPI to consumers
 *  - Manage lifecycle (mount / destroy)
 *
 * All subsystems communicate only through EventEmitter (loose coupling).
 * Editor itself acts as a thin Facade over the subsystems.
 */
class Editor {
    constructor(_config) {
        this._config = _config;
        this._emitter = new EventEmitter();
        this._interactionMounted = false;
        // ── 1. Core model ──────────────────────────────────────────────────────
        this._model = new DocumentModel(_config.document);
        this._history = new HistoryManager(this._emitter);
        // ── 2. Snap engine ────────────────────────────────────────────────────
        this._snap = new SnapEngine({ ...DEFAULT_SNAP_CONFIG, ...(_config.snap ?? {}) });
        // ── 3. Format registry ───────────────────────────────────────────────
        this._formats = new FormatRegistry();
        this._registerBuiltinFormats();
        // ── 4. Renderer ───────────────────────────────────────────────────────
        this._renderer = new PixiRenderer();
        // ── 5. Interaction ────────────────────────────────────────────────────
        this._interaction = new InteractionManager(this._renderer, this._model, this._history, this._snap, this._emitter);
        // ── 6. Menus / Panels ─────────────────────────────────────────────────
        this._menu = new MenuManager(_config.menuItems, _config.exportFormats);
        this._panels = new PanelManager(this._model, this._formats, this._history, this._emitter, this._menu, _config.panel);
    }
    /**
     * Mount the editor into the given container and return the public API.
     */
    mount() {
        const container = this._config.container;
        container.style.cssText = `
      ${container.style.cssText}
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;
        // Build public API early so panels can reference it
        this._api = this._buildAPI();
        // Mount panels (returns the canvas container div)
        const { canvasContainer } = this._panels.mount(container, this._api);
        const finishMount = () => {
            // Mount interaction on the canvas element
            this._interaction.mount(this._renderer.getCanvas());
            this._interactionMounted = true;
            // Wire document changes → renderer re-render
            this._emitter.on('document:change', ({ document }) => {
                this._renderer.render(document);
            });
            this._emitter.on('element:update', ({ element }) => {
                this._renderer.updateElement(element);
            });
            this._emitter.on('element:remove', ({ id }) => {
                this._renderer.removeElement(id);
            });
            // Wire snap config → grid display
            this._emitter.on('snap:change', ({ config }) => {
                this._renderer.showGrid(config.grid, config.gridSize, config.gridColor);
            });
            // Initial render
            this._renderer.render(this._model.getDocument());
            if (this._snap.getConfig().grid) {
                const cfg = this._snap.getConfig();
                this._renderer.showGrid(cfg.grid, cfg.gridSize, cfg.gridColor);
            }
            // Notify consumer
            this._config.onReady?.(this._api);
        };
        // Mount renderer into canvas container (supports Pixi v7 sync and v8 async init)
        const mountResult = this._renderer.mount(canvasContainer);
        if (mountResult instanceof Promise) {
            mountResult.then(() => finishMount()).catch((err) => {
                console.error('[Editor] Failed to mount renderer:', err);
            });
        }
        else {
            finishMount();
        }
        return this._api;
    }
    // ─── Build the public EditorAPI facade ──────────────────────────────────
    _buildAPI() {
        const self = this;
        const api = {
            getDocument() {
                return self._model.getSnapshot();
            },
            getSelection() {
                const ids = self._interaction.getState().selectedIds;
                if (ids.length === 0)
                    return { ids: [], bounds: null };
                const doc = self._model.getDocument();
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const id of ids) {
                    const el = doc.elements[id];
                    if (!el)
                        continue;
                    const w = typeof el.style.width === 'number' ? el.style.width : 0;
                    const h = typeof el.style.height === 'number' ? el.style.height : 0;
                    minX = Math.min(minX, el.style.x);
                    minY = Math.min(minY, el.style.y);
                    maxX = Math.max(maxX, el.style.x + w);
                    maxY = Math.max(maxY, el.style.y + h);
                }
                return {
                    ids,
                    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
                };
            },
            selectElement(id, additive = false) {
                const ids = additive
                    ? [...self._interaction.getState().selectedIds, id]
                    : [id];
                self._interaction.selectIds(ids);
            },
            clearSelection() {
                self._interaction.clearSelection();
            },
            addElement(type, parentId = null, style = {}) {
                const cmd = new AddElementCommand(self._model, self._emitter, type, parentId, style);
                self._history.execute(cmd);
                return cmd.createdId;
            },
            removeElement(id) {
                self._history.execute(new RemoveElementCommand(self._model, self._emitter, id));
            },
            updateStyle(id, patch) {
                self._history.execute(new StyleCommand(self._model, self._emitter, id, patch));
            },
            updateContent(id, content) {
                self._model.updateContent(id, content);
                const el = self._model.getElement(id);
                if (el) {
                    self._emitter.emit('element:update', { element: el });
                    self._emitter.emit('document:change', { document: self._model.getSnapshot() });
                }
            },
            updateSrc(id, src) {
                self._model.updateSrc(id, src);
                const el = self._model.getElement(id);
                if (el) {
                    self._emitter.emit('element:update', { element: el });
                    self._emitter.emit('document:change', { document: self._model.getSnapshot() });
                }
            },
            setFree(id, free) {
                const el = self._model.getElement(id);
                if (!el)
                    return;
                const worldPos = free ? { x: el.style.x, y: el.style.y } : undefined;
                self._history.execute(new FreeCommand(self._model, self._emitter, id, free, worldPos));
            },
            moveLayer(id, direction) {
                self._history.execute(new LayerMoveCommand(self._model, self._emitter, id, direction));
            },
            reorderLayer(id, targetId, position) {
                self._history.execute(new LayerReorderCommand(self._model, self._emitter, id, targetId, position));
            },
            undo() { self._history.undo(); },
            redo() { self._history.redo(); },
            canUndo() { return self._history.canUndo(); },
            canRedo() { return self._history.canRedo(); },
            setSnapConfig(patch) {
                self._snap.setConfig(patch);
                self._emitter.emit('snap:change', { config: self._snap.getConfig() });
            },
            getSnapConfig() {
                return self._snap.getConfig();
            },
            destroy() {
                if (self._interactionMounted) {
                    self._interaction.destroy();
                    self._interactionMounted = false;
                }
                self._renderer.destroy();
                self._emitter.removeAllListeners();
                self._config.container.innerHTML = '';
            },
            on(event, handler) {
                self._emitter.on(event, handler);
            },
            off(event, handler) {
                self._emitter.off(event, handler);
            },
        };
        return api;
    }
    // ─── Register built-in formats ───────────────────────────────────────────
    _registerBuiltinFormats() {
        const formats = [
            new SizeFormat(),
            new BackgroundColorFormat(),
            new BackgroundImageFormat(),
            new ColorFormat(),
            new PaddingFormat(),
            new BorderRadiusFormat(),
            new CircleFormat(),
            new OpacityFormat(),
            new FontSizeFormat(),
            new FontFamilyFormat(),
            new TextAlignFormat(),
            new BorderFormat(),
            new ShadowFormat(),
            new RotationFormat(),
        ];
        for (const f of formats)
            this._formats.register(f);
    }
}

/**
 * @pixieditor/core — Public API
 *
 * Usage:
 *   import { createEditor } from '@pixieditor/core';
 *
 *   const api = createEditor({
 *     container: document.getElementById('editor'),
 *     onReady: (api) => console.log('Editor ready', api),
 *   });
 */
/**
 * Create and mount a PixiEditor instance.
 *
 * @param config - EditorConfig
 * @returns EditorAPI — the fully mounted editor API
 *
 * @example
 * ```ts
 * const api = createEditor({
 *   container: document.getElementById('editor')!,
 *   document: { width: 1200, height: 800, name: 'My Design' },
 *   snap: { enabled: true, grid: true, gridSize: 20 },
 *   theme: { accent: '#6366f1' },
 *   menuItems: [
 *     { id: 'my-export', label: 'Export PNG', group: 'Export', callback: (api) => { ... } }
 *   ],
 *   exportFormats: [
 *     { id: 'png', label: 'Export PNG', handler: async (doc) => { ... return blob; } }
 *   ],
 *   onReady: (api) => {
 *     api.addElement('box', null, { x: 100, y: 100, width: 200, height: 100, backgroundColor: '#6366f1' });
 *   },
 * });
 * ```
 */
function createEditor(config) {
    const editor = new Editor(config);
    return editor.mount();
}

export { DEFAULT_STYLE, Editor, FormatRegistry, LayoutResolver, createEditor, deepClone, generateId, layoutResolver };
//# sourceMappingURL=index.esm.js.map
