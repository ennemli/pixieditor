import type { BaseElementModel, ElementFormat, TailwindSize } from '@/types';
import { generateId } from '@/utils/generateId';

/**
 * Abstract base class for all editor elements.
 * Implements the Composite pattern — BoxElement extends this to hold children.
 *
 * Responsibilities:
 *  - Owns the raw model data (plain serialisable object).
 *  - Provides typed getters/setters for all shared properties.
 *  - Does NOT know about rendering or interaction.
 */
export abstract class BaseElement {
  protected _model: BaseElementModel;

  constructor(model: Partial<BaseElementModel> & { type: BaseElementModel['type'] }) {
    this._model = {
      id: model.id ?? generateId(),
      type: model.type,
      name: model.name ?? `${model.type}-${Date.now()}`,
      x: model.x ?? 0,
      y: model.y ?? 0,
      width: model.width ?? 200,
      height: model.height ?? 100,
      zIndex: model.zIndex ?? 0,
      free: model.free ?? false,
      parentId: model.parentId ?? null,
      format: model.format ?? {},
      locked: model.locked ?? false,
      visible: model.visible ?? true,
    };
  }

  // ── Identity ────────────────────────────────────────────────────────────────

  get id(): string { return this._model.id; }
  get type(): BaseElementModel['type'] { return this._model.type; }

  get name(): string { return this._model.name; }
  set name(v: string) { this._model.name = v; }

  // ── Transform ───────────────────────────────────────────────────────────────

  get x(): number { return this._model.x; }
  set x(v: number) { this._model.x = v; }

  get y(): number { return this._model.y; }
  set y(v: number) { this._model.y = v; }

  get width(): TailwindSize { return this._model.width; }
  set width(v: TailwindSize) { this._model.width = v; }

  get height(): TailwindSize { return this._model.height; }
  set height(v: TailwindSize) { this._model.height = v; }

  get zIndex(): number { return this._model.zIndex; }
  set zIndex(v: number) { this._model.zIndex = v; }

  // ── Behaviour flags ─────────────────────────────────────────────────────────

  get free(): boolean { return this._model.free; }
  set free(v: boolean) { this._model.free = v; }

  get parentId(): string | null { return this._model.parentId; }
  set parentId(v: string | null) { this._model.parentId = v; }

  get locked(): boolean { return this._model.locked; }
  set locked(v: boolean) { this._model.locked = v; }

  get visible(): boolean { return this._model.visible; }
  set visible(v: boolean) { this._model.visible = v; }

  // ── Format ──────────────────────────────────────────────────────────────────

  get format(): ElementFormat { return this._model.format; }

  applyFormat(patch: Partial<ElementFormat>): void {
    this._model.format = { ...this._model.format, ...patch };
  }

  clearFormat(key: keyof ElementFormat): void {
    delete this._model.format[key];
  }

  // ── Serialisation ───────────────────────────────────────────────────────────

  /** Returns a deep-cloned plain model object (safe to store in history). */
  toModel(): BaseElementModel {
    return structuredClone(this._model);
  }

  /** Patch model directly (used when restoring from history). */
  fromModel(model: BaseElementModel): void {
    this._model = structuredClone(model);
  }
}
