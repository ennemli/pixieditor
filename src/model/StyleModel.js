/**
 * StyleModel — Value Object
 *
 * Holds all visual properties of an element. Immutable-style:
 * use merge() to derive new styles rather than mutating in place.
 * This makes undo/redo trivial — just swap old/new StyleModel instances.
 */
export class StyleModel {
  constructor(props = {}) {
    // ─── Background ──────────────────────────────────────────────────────
    this.backgroundColor = props.backgroundColor ?? null;   // CSS color string | null
    this.backgroundImage = props.backgroundImage ?? null;   // URL string | null
    this.backgroundSize = props.backgroundSize ?? 'cover';  // 'cover' | 'contain' | 'auto'
    this.backgroundPosition = props.backgroundPosition ?? 'center';

    // ─── Color ───────────────────────────────────────────────────────────
    this.color = props.color ?? '#1a1a1a';

    // ─── Spacing ─────────────────────────────────────────────────────────
    this.padding = {
      top: props.padding?.top ?? 0,
      right: props.padding?.right ?? 0,
      bottom: props.padding?.bottom ?? 0,
      left: props.padding?.left ?? 0,
    };

    this.margin = {
      top: props.margin?.top ?? 0,
      right: props.margin?.right ?? 0,
      bottom: props.margin?.bottom ?? 0,
      left: props.margin?.left ?? 0,
    };

    // ─── Border ──────────────────────────────────────────────────────────
    this.borderWidth = props.borderWidth ?? 0;
    this.borderStyle = props.borderStyle ?? 'solid'; // 'solid' | 'dashed' | 'dotted'
    this.borderColor = props.borderColor ?? '#cccccc';
    this.borderRadius = props.borderRadius ?? 0;     // px — overridden by circle

    // ─── Shape ───────────────────────────────────────────────────────────
    /** When true, borderRadius = 50% → renders as a perfect circle/ellipse */
    this.circle = props.circle ?? false;

    // ─── Appearance ──────────────────────────────────────────────────────
    this.opacity = props.opacity ?? 1;
    this.boxShadow = props.boxShadow ?? null; // CSS box-shadow string | null
    this.overflow = props.overflow ?? 'visible'; // 'visible' | 'hidden'

    // ─── Typography (text elements) ──────────────────────────────────────
    this.fontFamily = props.fontFamily ?? 'Inter';
    this.fontSize = props.fontSize ?? 16;         // px
    this.fontWeight = props.fontWeight ?? '400';  // '100'–'900' | 'bold' | 'normal'
    this.fontStyle = props.fontStyle ?? 'normal'; // 'normal' | 'italic'
    this.textAlign = props.textAlign ?? 'left';   // 'left' | 'center' | 'right' | 'justify'
    this.textDecoration = props.textDecoration ?? 'none';
    this.lineHeight = props.lineHeight ?? 1.5;
    this.letterSpacing = props.letterSpacing ?? 0; // em

    // ─── Flex layout (when box acts as a flex container) ─────────────────
    this.display = props.display ?? 'block';     // 'block' | 'flex'
    this.flexDirection = props.flexDirection ?? 'row';
    this.flexWrap = props.flexWrap ?? 'nowrap';
    this.justifyContent = props.justifyContent ?? 'flex-start';
    this.alignItems = props.alignItems ?? 'flex-start';
    this.gap = props.gap ?? 0;
  }

  /**
   * Returns a new StyleModel with overriding properties merged in.
   * Original is untouched. Supports deep merge for padding/margin.
   * @param {Partial<StyleModel>} overrides
   * @returns {StyleModel}
   */
  merge(overrides) {
    const merged = new StyleModel(this.toJSON());
    Object.assign(merged, overrides);
    if (overrides.padding) {
      merged.padding = { ...this.padding, ...overrides.padding };
    }
    if (overrides.margin) {
      merged.margin = { ...this.margin, ...overrides.margin };
    }
    return merged;
  }

  /**
   * Returns plain JSON-serializable object.
   */
  toJSON() {
    return {
      backgroundColor: this.backgroundColor,
      backgroundImage: this.backgroundImage,
      backgroundSize: this.backgroundSize,
      backgroundPosition: this.backgroundPosition,
      color: this.color,
      padding: { ...this.padding },
      margin: { ...this.margin },
      borderWidth: this.borderWidth,
      borderStyle: this.borderStyle,
      borderColor: this.borderColor,
      borderRadius: this.borderRadius,
      circle: this.circle,
      opacity: this.opacity,
      boxShadow: this.boxShadow,
      overflow: this.overflow,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      fontStyle: this.fontStyle,
      textAlign: this.textAlign,
      textDecoration: this.textDecoration,
      lineHeight: this.lineHeight,
      letterSpacing: this.letterSpacing,
      display: this.display,
      flexDirection: this.flexDirection,
      flexWrap: this.flexWrap,
      justifyContent: this.justifyContent,
      alignItems: this.alignItems,
      gap: this.gap,
    };
  }

  static fromJSON(json) {
    return new StyleModel(json);
  }

  /**
   * Compute the effective border-radius.
   * When circle=true, returns '50%' (handled by renderer).
   */
  get effectiveBorderRadius() {
    return this.circle ? '50%' : this.borderRadius;
  }
}
