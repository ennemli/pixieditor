import { BoxElement } from './BoxElement';
import { ImageElement } from './ImageElement';
import { TextElement } from './TextElement';
import { generateId } from '@/utils/generateId';
import type { AnyElementModel, BoxElementModel, ImageElementModel, TextElementModel, ElementType } from '@/types';
import type { BaseElement } from './BaseElement';

/**
 * Factory pattern — centralised creation of element instances.
 * Consumers never call `new BoxElement()` directly; they go through this factory.
 */
export class ElementFactory {
  static create(type: ElementType, overrides: Partial<AnyElementModel> = {}): BaseElement {
    switch (type) {
      case 'box':   return new BoxElement(overrides as Partial<BoxElementModel>);
      case 'image': return new ImageElement(overrides as Partial<ImageElementModel>);
      case 'text':  return new TextElement(overrides as Partial<TextElementModel>);
      default:
        throw new Error(`[ElementFactory] Unknown element type: ${type as string}`);
    }
  }

  static fromModel(model: AnyElementModel): BaseElement {
    return ElementFactory.create(model.type, model);
  }

  static clone(element: BaseElement, offsetX = 16, offsetY = 16): BaseElement {
    const model = element.toModel() as AnyElementModel;
    return ElementFactory.create(model.type, {
      ...model,
      id: generateId(),
      name: `${model.name} copy`,
      x: model.x + offsetX,
      y: model.y + offsetY,
    });
  }
}
