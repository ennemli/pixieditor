// ---------------------------------------------------------------------------
// Element Types
// ---------------------------------------------------------------------------

export type ElementType = 'box' | 'image' | 'text';

/**
 * Tailwind-style size tokens resolved relative to parent dimensions.
 * Numeric values are treated as pixels.
 */
export type TailwindSize =
  | 'auto'
  | 'full'         // 100%
  | '1/2'          // 50%
  | '1/3'          // 33.33%
  | '2/3'          // 66.66%
  | '1/4'          // 25%
  | '3/4'          // 75%
  | '1/5'          // 20%
  | '2/5'          // 40%
  | '3/5'          // 60%
  | '4/5'          // 80%
  | number;        // px

export type PositionValue = TailwindSize;

// ---------------------------------------------------------------------------
// Format — all visual styling properties
// ---------------------------------------------------------------------------

export interface ElementFormat {
  // Background
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;
  backgroundRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';

  // Text color
  color?: string;

  // Padding (px)
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;

  // Border
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderColor?: string;

  // Border radius — circle format sets this to 50%
  borderRadius?: number | 'circle';

  // Opacity 0–1
  opacity?: number;

  // Shadow
  boxShadow?: string;

  // Typography
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  textDecoration?: 'none' | 'underline' | 'line-through';
  fontStyle?: 'normal' | 'italic';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';

  // Overflow
  overflow?: 'visible' | 'hidden' | 'clip';

  // Blend
  mixBlendMode?: string;

  // Flex layout for box children
  display?: 'block' | 'flex' | 'grid';
  flexDirection?: 'row' | 'column';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  gap?: number;
  flexWrap?: 'nowrap' | 'wrap';
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

export interface ElementTransform {
  x: PositionValue;
  y: PositionValue;
  width: TailwindSize;
  height: TailwindSize;
  rotation: number;  // degrees
  scaleX: number;
  scaleY: number;
}

// ---------------------------------------------------------------------------
// Element Models
// ---------------------------------------------------------------------------

export interface BaseElementModel {
  id: string;
  type: ElementType;
  name: string;

  /**
   * When true the element escapes all ancestors and is positioned
   * relative to the root canvas.  Its parentId still records the
   * logical parent for re-nesting if free is toggled back off.
   */
  free: boolean;

  visible: boolean;
  locked: boolean;

  /** Paint order within its container. Higher = on top. */
  zIndex: number;

  transform: ElementTransform;
  format: ElementFormat;

  /** null ⟹ root canvas child */
  parentId: string | null;
}

export interface BoxElementModel extends BaseElementModel {
  type: 'box';
  /** Ordered list of child element IDs */
  children: string[];
}

export interface ImageElementModel extends BaseElementModel {
  type: 'image';
  src: string;
  alt?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

export interface TextElementModel extends BaseElementModel {
  type: 'text';
  /** Rich HTML content managed by the DOM overlay */
  content: string;
  placeholder?: string;
}

export type AnyElementModel = BoxElementModel | ImageElementModel | TextElementModel;
