// ── Core Editor ────────────────────────────────────────────────────────────────
export { Editor } from './editor/Editor';
export type { EditorConfig } from './editor/EditorConfig';

// ── Types & Models ─────────────────────────────────────────────────────────────
export type {
  AnyElementModel,
  BaseElementModel,
  BoxElementModel,
  ImageElementModel,
  TextElementModel,
  ElementId,
  ElementType,
  ParentId,
  EditorState,
  CanvasConfig,
  SnapConfig,
  ThemeConfig,
  Transform,
  Formats,
  PaddingValue,
  BorderValue,
  ShadowValue,
  GradientValue,
  ResolvedRect,
  SnapGuide,
  SnapResult,
  SizeValue,
  PositionValue,
  IFormatDefinition,
  FormatControl,
  IExportFormat,
  IMenuBarItem,
  ElementTemplate,
  MenuGroup,
} from './models/types';
export { DEFAULT_THEME } from './models/types';

// ── Events ─────────────────────────────────────────────────────────────────────
export type { EditorEventMap } from './events/EditorEvents';
export { EventBus } from './events/EventBus';

// ── Commands ───────────────────────────────────────────────────────────────────
export type { ICommand } from './commands/ICommand';
export { CommandHistory } from './commands/ICommand';
export {
  AddElementCommand,
  RemoveElementCommand,
  MoveCommand,
  ResizeCommand,
  SetFormatCommand,
  SetPropertyCommand,
  SetFreeCommand,
  ReorderCommand,
  BatchCommand,
} from './commands/commands';

// ── Sizing ─────────────────────────────────────────────────────────────────────
export { SizingResolver, sizingResolver } from './sizing/SizingResolver';

// ── Snap ───────────────────────────────────────────────────────────────────────
export { SnapEngine } from './snap/SnapEngine';
export type { ISnapStrategy, SnapContext, SnapAxis } from './snap/SnapEngine';
export {
  GridSnapStrategy,
  CanvasSnapStrategy,
  ElementSnapStrategy,
  SmartGuideStrategy,
} from './snap/SnapEngine';

// ── Renderer ───────────────────────────────────────────────────────────────────
export { PixiRenderer } from './renderer/PixiRenderer';
export type { IRenderer } from './renderer/PixiRenderer';

// ── Formats ────────────────────────────────────────────────────────────────────
export { FormatRegistry, registerBuiltinFormats } from './formats/FormatRegistry';
export {
  BACKGROUND_COLOR_FORMAT,
  BACKGROUND_IMAGE_FORMAT,
  COLOR_FORMAT,
  PADDING_FORMAT,
  CIRCLE_FORMAT,
  BORDER_FORMAT,
  SHADOW_FORMAT,
  OPACITY_FORMAT,
  FONT_FORMAT,
  FLEX_FORMAT,
  OVERFLOW_FORMAT,
} from './formats/FormatRegistry';

// ── Export & Menubar ───────────────────────────────────────────────────────────
export { ExportManager, MenuBarManager } from './export/ExportManager';

// ── Interaction ────────────────────────────────────────────────────────────────
export { InteractionEngine } from './interaction/InteractionEngine';
export type { IInteractionHandler, InteractionContext } from './interaction/InteractionEngine';

// ── Panels ─────────────────────────────────────────────────────────────────────
export { PanelManager } from './panels/PanelManager';
