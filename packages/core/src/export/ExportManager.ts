import type { EditorState, IExportFormat, IMenuBarItem, MenuGroup, ExportFormatId } from '../models/types';

// ─── ExportManager ────────────────────────────────────────────────────────────

/**
 * Manages pluggable export formats.
 * Consumers register custom exporters; the library calls them on demand.
 */
export class ExportManager {
  private readonly formats = new Map<ExportFormatId, IExportFormat>();

  register(format: IExportFormat): void {
    this.formats.set(format.id, format);
  }

  unregister(id: ExportFormatId): void {
    this.formats.delete(id);
  }

  getAll(): IExportFormat[] {
    return Array.from(this.formats.values());
  }

  async export(id: ExportFormatId, state: EditorState): Promise<void> {
    const fmt = this.formats.get(id);
    if (!fmt) throw new Error(`[ExportManager] No exporter registered for id: ${id}`);
    await fmt.export(state);
  }
}

// ─── MenuBarManager ───────────────────────────────────────────────────────────

/**
 * Manages custom menu bar items grouped by group name.
 * Consumers register items; the MenuBar UI renders them.
 */
export class MenuBarManager {
  private readonly items = new Map<string, IMenuBarItem>();

  register(item: IMenuBarItem): void {
    this.items.set(item.id, item);
  }

  unregister(id: string): void {
    this.items.delete(id);
  }

  getAll(): IMenuBarItem[] {
    return Array.from(this.items.values());
  }

  /** Returns items grouped: Record<group, items[]> */
  getGrouped(): Record<MenuGroup, IMenuBarItem[]> {
    const result: Record<MenuGroup, IMenuBarItem[]> = {};
    for (const item of this.items.values()) {
      if (!result[item.group]) result[item.group] = [];
      result[item.group].push(item);
    }
    return result;
  }

  trigger(id: string, state: EditorState): void {
    const item = this.items.get(id);
    if (!item) return;
    item.callback(state);
  }
}
