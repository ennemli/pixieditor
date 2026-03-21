// ─── Primitive Types ─────────────────────────────────────────────────────────

export type ElementId = string;
export type ParentId = ElementId | null; // null = root canvas

/** Tailwind-style sizing: pixels | fraction (1/2, 3/5…) | keywords */
export type SizeValue = number | `${number}/${number}` | 'full' | 'auto' | 'screen';
export type PositionValue = number | `${number}/${number}` | 'full' | 'auto';

export type ElementType = 'box' | 'image' | 'text';

// ─── Transform ───────────────────────────────────────────────────────────────

export interface Transform {
  x: PositionValue;
  y: PositionValue;
  width: SizeValue;
  height: SizeValue;
  rotation: number; // degrees
  scaleX: number;
  scaleY: number;
}

// ─── Format Values ───────────────────────────────────────────────────────────

export interface PaddingValue {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BorderValue {
  width: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted' | 'none';
  radius?: number;
}

export interface ShadowValue {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
}

export interface GradientStop {
  color: string;
  position: number; // 0-1
}

export interface GradientValue {
  type: 'linear' | 'radial';
  angle?: number;
  stops: GradientStop[];
}

// ─── Formats ─────────────────────────────────────────────────────────────────

export interface Formats {
  // Background
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundGradient?: GradientValue;
  backgroundSize?: 'cover' | 'contain' | 'fill' | 'none';
  backgroundPosition?: string;
  backgroundRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';

  // Typography
  color?: string;
  fontSize?: number;
  fontWeight?: '100'|'200'|'300'|'400'|'500'|'600'|'700'|'800'|'900';
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  textDecoration?: 'none' | 'underline' | 'line-through';

  // Spacing
  padding?: PaddingValue;

  // Border & Shape
  border?: BorderValue;
  /** number = px radius; 'circle' = 50% shorthand */
  borderRadius?: number | 'circle';

  // Effects
  shadow?: ShadowValue;
  opacity?: number; // 0–1
  backdropBlur?: number;
  mixBlendMode?: GlobalCompositeOperation;

  // Overflow
  overflow?: 'visible' | 'hidden' | 'scroll';

  // Flex layout (for box children)
  display?: 'block' | 'flex' | 'grid';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap';
  justifyContent?: 'flex-start'|'center'|'flex-end'|'space-between'|'space-around'|'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  gap?: number;
  rowGap?: number;
  columnGap?: number;
}

// ─── Element Models ───────────────────────────────────────────────────────────

export interface BaseElementModel {
  id: ElementId;
  type: ElementType;
  parentId: ParentId;
  /** When true: element escapes all ancestors and is positioned relative to root canvas */
  free: boolean;
  /** Original parentId before becoming free (used for un-free restore) */
  originalParentId?: ParentId;
  zIndex: number;
  transform: Transform;
  formats: Formats;
  locked: boolean;
  visible: boolean;
  name: string;
}

export interface BoxElementModel extends BaseElementModel {
  type: 'box';
  children: ElementId[];
}

export interface ImageElementModel extends BaseElementModel {
  type: 'image';
  src: string;
  alt: string;
  objectFit: 'cover' | 'contain' | 'fill' | 'none';
}

export interface TextElementModel extends BaseElementModel {
  type: 'text';
  /** HTML content — rendered via contenteditable overlay during edit, PixiJS HTMLText for display */
  content: string;
  placeholder: string;
}

export type AnyElementModel = BoxElementModel | ImageElementModel | TextElementModel;

// ─── Snap Guide ───────────────────────────────────────────────────────────────

export interface SnapGuide {
  axis: 'x' | 'y';
  position: number;       // canvas-space coordinate
  start: number;          // guide line extent start
  end: number;            // guide line extent end
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

// ─── Editor State ─────────────────────────────────────────────────────────────

export interface CanvasConfig {
  width: number;
  height: number;
  backgroundColor: string;
  zoom: number;
  panX: number;
  panY: number;
}

export interface SnapConfig {
  enabled: boolean;
  grid: boolean;
  gridSize: number;
  canvasEdges: boolean;
  elementEdges: boolean;
  smartGuides: boolean;
  threshold: number; // px
}

export interface ThemeConfig {
  panelBackground: string;
  panelBorder: string;
  accent: string;
  accentForeground: string;
  text: string;
  textSecondary: string;
  surface: string;
  surfaceHover: string;
  danger: string;
}

export const DEFAULT_THEME: ThemeConfig = {
  panelBackground: '#1a1a2e',
  panelBorder: '#2d2d4a',
  accent: '#7c3aed',
  accentForeground: '#ffffff',
  text: '#f0f0f0',
  textSecondary: '#9090b0',
  surface: '#252540',
  surfaceHover: '#2f2f52',
  danger: '#ef4444',
};

export interface EditorState {
  elements: Record<ElementId, AnyElementModel>;
  /** IDs of elements directly on root (parentId === null) — ordered by z */
  rootChildren: ElementId[];
  selectedIds: ElementId[];
  hoveredId: ElementId | null;
  canvas: CanvasConfig;
  snap: SnapConfig;
  theme: ThemeConfig;
}

// ─── Resolved Geometry ────────────────────────────────────────────────────────

export interface ResolvedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Panel Config ─────────────────────────────────────────────────────────────

export interface PanelConfig {
  leftWidth: number;
  rightWidth: number;
  collapsed: { left: boolean; right: boolean };
}

// ─── Export & Menubar ─────────────────────────────────────────────────────────

export type ExportFormatId = string;

export interface IExportFormat {
  id: ExportFormatId;
  label: string;
  icon?: string;
  export(state: EditorState): Promise<void> | void;
}

export type MenuGroup = string;

export interface IMenuBarItem {
  id: string;
  label: string;
  group: MenuGroup;
  shortcut?: string;
  icon?: string;
  callback: (state: EditorState) => void;
}

// ─── Element Templates (dragged from left panel) ──────────────────────────────

export interface ElementTemplate {
  id: string;
  label: string;
  icon: string;
  type: ElementType;
  defaultModel: Partial<AnyElementModel>;
}

// ─── Format Definition (used by FormatRegistry) ───────────────────────────────

export type FormatId = string;

export interface FormatControl {
  type: 'color' | 'number' | 'select' | 'toggle' | 'slider' | 'text' | 'image-picker';
  key: keyof Formats;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: unknown }[];
}

export interface IFormatDefinition {
  id: FormatId;
  label: string;
  icon: string;
  /** Which element types this format applies to */
  applicableTo: ElementType[] | 'all';
  controls: FormatControl[];
  /** Optional default values when format is first applied */
  defaults?: Partial<Formats>;
}
