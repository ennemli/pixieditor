// ─────────────────────────────────────────────────────────────────────────────
// Core domain types for PixiEditor
// ─────────────────────────────────────────────────────────────────────────────

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Tailwind-style size: '1/2', 'full', 'auto', '3/5', 150, '150px', '50%' */
export type SizeValue = string | number;

/** Element kinds supported by the editor */
export type ElementType = 'box' | 'image' | 'text';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type FlexDirection = 'row' | 'column';
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
export type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
export type ObjectFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
export type CursorType = 'default' | 'move' | 'pointer' | 'text' | 'crosshair' | 'grab' | 'grabbing' | string;

// ---------------------------------------------------------------------------
// Style
// ---------------------------------------------------------------------------

export interface ShadowStyle {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
}

export interface BorderStyle {
  width: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted' | 'none';
}

export interface ElementStyle {
  // ── Dimensions ──────────────────────────────────────────────────────
  width: SizeValue;
  height: SizeValue;
  minWidth?: SizeValue;
  minHeight?: SizeValue;
  maxWidth?: SizeValue;
  maxHeight?: SizeValue;

  // ── Free position (used when element.free === true) ─────────────────
  x: number;
  y: number;

  // ── Spacing ─────────────────────────────────────────────────────────
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;

  // ── Background ──────────────────────────────────────────────────────
  backgroundColor: string;
  backgroundImage: string;           // URL
  backgroundSize: 'cover' | 'contain' | 'auto' | string;
  backgroundPosition: string;
  backgroundRepeat: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y';

  // ── Border ──────────────────────────────────────────────────────────
  border: BorderStyle;
  borderRadiusTopLeft: number;
  borderRadiusTopRight: number;
  borderRadiusBottomRight: number;
  borderRadiusBottomLeft: number;
  /** Circle format: overrides border-radius to 50% */
  isCircle: boolean;

  // ── Flex layout (box children) ───────────────────────────────────────
  flexDirection: FlexDirection;
  flexWrap: FlexWrap;
  alignItems: AlignItems;
  justifyContent: JustifyContent;
  gap: number;

  // ── Text ────────────────────────────────────────────────────────────
  color: string;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  textAlign: TextAlign;
  lineHeight: number;
  letterSpacing: number;
  textDecoration: 'none' | 'underline' | 'line-through';
  fontStyle: 'normal' | 'italic';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';

  // ── Image ────────────────────────────────────────────────────────────
  objectFit: ObjectFit;

  // ── Effects ─────────────────────────────────────────────────────────
  opacity: number;
  shadow: ShadowStyle | null;

  // ── Z-index ─────────────────────────────────────────────────────────
  zIndex: number;

  // ── Transform ───────────────────────────────────────────────────────
  rotation: number;   // degrees
  scaleX: number;
  scaleY: number;
}

// ---------------------------------------------------------------------------
// Element Models
// ---------------------------------------------------------------------------

export interface BaseElement {
  id: string;
  type: ElementType;
  name: string;
  style: ElementStyle;
  /** When true, element escapes all ancestors and is positioned on root canvas */
  free: boolean;
  /** ID of the logical parent (null = root document) */
  parentId: string | null;
  locked: boolean;
  visible: boolean;
}

export interface BoxElement extends BaseElement {
  type: 'box';
  children: string[];   // ordered child IDs
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  alt: string;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;       // plain text or basic HTML for inline formatting
}

export type AnyElement = BoxElement | ImageElement | TextElement;

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export interface DocumentState {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage: string;
  /** Root-level child IDs (ordered) */
  children: string[];
  /** Flat map of ALL elements by ID */
  elements: Record<string, AnyElement>;
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface SelectionState {
  ids: string[];
  /** Bounding box of combined selection in canvas coordinates */
  bounds: Rect | null;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Snap
// ---------------------------------------------------------------------------

export interface SnapConfig {
  enabled: boolean;
  grid: boolean;
  gridSize: number;
  gridColor: string;
  elements: boolean;
  canvas: boolean;
  canvasEdges?: boolean;
  elementEdges?: boolean;
  smartGuides: boolean;
  threshold: number;   // px
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

export interface SnapGuide {
  orientation: 'horizontal' | 'vertical';
  position: number;         // canvas-space coordinate
  start: number;
  end: number;
}

// ---------------------------------------------------------------------------
// History / Commands
// ---------------------------------------------------------------------------

export interface ICommand {
  readonly description: string;
  execute(): void;
  undo(): void;
}

// ---------------------------------------------------------------------------
// Formats
// ---------------------------------------------------------------------------

export type FormatValue = string | number | boolean | object | null;

export interface IFormat<T extends FormatValue = FormatValue> {
  readonly id: string;
  readonly name: string;
  readonly group: string;
  readonly appliesTo: ElementType[];
  getValue(element: AnyElement): T;
  apply(element: AnyElement, value: T): Partial<ElementStyle>;
  renderControl(
    element: AnyElement,
    onChange: (value: T) => void
  ): HTMLElement;
}

// ---------------------------------------------------------------------------
// Panels / Theme
// ---------------------------------------------------------------------------

export interface ThemeConfig {
  panelBackground?: string;
  panelBorder?: string;
  accent?: string;
  text?: string;
  textMuted?: string;
  inputBackground?: string;
  fontFamily?: string;
}

export interface PanelConfig {
  leftWidth?: number;
  rightWidth?: number;
  theme?: ThemeConfig;
}

// Legacy/internal alias still used by some modules
export interface EditorTheme {
  panelBackground: string;
  panelBorder: string;
  accent: string;
  text: string;
  textMuted: string;
  surface: string;
  surfaceHover: string;
  selectionColor: string;
  guideColor: string;
  gridColor: string;
}

export interface CanvasConfig {
  width: number;
  height: number;
  backgroundColor: string;
}

// ---------------------------------------------------------------------------
// Menu / Custom extensions
// ---------------------------------------------------------------------------

export interface CustomMenuItem {
  id: string;
  label: string;
  group: string;
  shortcut?: string;
  icon?: string;
  callback: (editorAPI: EditorAPI) => void;
}

export interface ExportFormat {
  id: string;
  label: string;
  icon?: string;
  handler: (doc: DocumentState) => Promise<Blob | string>;
}

// ---------------------------------------------------------------------------
// Editor API (what consumer code receives)
// ---------------------------------------------------------------------------

export interface EditorAPI {
  getDocument(): DocumentState;
  getSelection(): SelectionState;
  selectElement(id: string, additive?: boolean): void;
  clearSelection(): void;
  addElement(type: ElementType, parentId?: string | null, style?: Partial<ElementStyle>): string;
  removeElement(id: string): void;
  updateStyle(id: string, patch: Partial<ElementStyle>): void;
  updateContent(id: string, content: string): void;
  updateSrc(id: string, src: string): void;
  setFree(id: string, free: boolean): void;
  moveLayer(id: string, direction: 'up' | 'down' | 'top' | 'bottom'): void;
  reorderLayer(id: string, targetId: string, position: 'before' | 'after'): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  setSnapConfig(patch: Partial<SnapConfig>): void;
  getSnapConfig(): SnapConfig;
  destroy(): void;
  on(event: EditorEventName, handler: (payload: any) => void): void;
  off(event: EditorEventName, handler: (payload: any) => void): void;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type EditorEventName =
  | 'document:change'
  | 'selection:change'
  | 'element:selected'
  | 'element:deselected'
  | 'element:add'
  | 'element:remove'
  | 'element:update'
  | 'element:move'
  | 'element:resize'
  | 'history:change'
  | 'history:changed'
  | 'snap:change'
  | 'panel:ready'
  | 'text:edit:start'
  | 'text:edit:end';

export type EditorEventMap = {
  'document:change': { document: DocumentState };
  'selection:change': { selection: SelectionState };
  'element:selected': { ids: string[] };
  'element:deselected': { ids: string[] };
  'element:add': { element: AnyElement };
  'element:remove': { id: string };
  'element:update': { element: AnyElement };
  'element:move': { id: string; x: number; y: number };
  'element:resize': { id: string; width: number; height: number };
  'history:change': { canUndo: boolean; canRedo: boolean };
  'history:changed': { canUndo: boolean; canRedo: boolean };
  'snap:change': { config: SnapConfig };
  'panel:ready': {};
  'text:edit:start': { id: string };
  'text:edit:end': { id: string; content: string };
};

// Legacy/internal event aliases used by EventBus.ts
export type EditorEventType = EditorEventName;
export type EventHandler<T = unknown> = (payload?: T) => void;

// ---------------------------------------------------------------------------
// Legacy/Internal Element Model Types (used by src/model/* and history commands)
// ---------------------------------------------------------------------------

export type TailwindSize = number | 'auto' | 'full' | `${number}/${number}` | string;

export interface RichTextDelta {
  ops: Array<Record<string, unknown>>;
}

export interface ElementFormat {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto' | string;
  backgroundPosition?: string;
  backgroundRepeat?: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y';
  color?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  textAlign?: TextAlign;
  lineHeight?: number;
  letterSpacing?: number;
  textDecoration?: 'none' | 'underline' | 'line-through';
  fontStyle?: 'normal' | 'italic';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  objectFit?: ObjectFit;
  opacity?: number;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius?: number | 'circle';
  boxShadow?: string;
  [key: string]: unknown;
}

export interface BaseElementModel {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: TailwindSize;
  height: TailwindSize;
  zIndex: number;
  free: boolean;
  parentId: string | null;
  format: ElementFormat;
  locked: boolean;
  visible: boolean;
}

export interface BoxElementModel extends BaseElementModel {
  type: 'box';
  children: string[];
}

export interface ImageElementModel extends BaseElementModel {
  type: 'image';
  src: string;
  alt: string;
}

export interface TextElementModel extends BaseElementModel {
  type: 'text';
  content: string;
  richContent?: RichTextDelta | undefined;
}

export type AnyElementModel = BoxElementModel | ImageElementModel | TextElementModel;

export interface EditorStateSnapshot {
  version: string;
  canvas: CanvasConfig;
  elements: Record<string, AnyElementModel>;
  rootOrder: string[];
  snap: SnapConfig;
}

// ---------------------------------------------------------------------------
// EditorConfig
// ---------------------------------------------------------------------------

export interface EditorConfig {
  container: HTMLElement;
  canvas?: Partial<CanvasConfig>;
  document?: Partial<Omit<DocumentState, 'id' | 'elements' | 'children'>>;
  snap?: Partial<SnapConfig>;
  panel?: PanelConfig;
  theme?: ThemeConfig;
  menuItems?: CustomMenuItem[];
  exportFormats?: ExportFormat[];
  mountPanels?: boolean;
  /** Called once the editor is ready */
  onReady?: (api: EditorAPI) => void;
}
