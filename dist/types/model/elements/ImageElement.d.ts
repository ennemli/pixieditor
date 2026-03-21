import { BaseElement } from './BaseElement';
import type { ImageElementModel } from '@/types';
/**
 * Image element — renders a raster image on the canvas.
 * Supports objectFit via its format, and alt text for accessibility metadata.
 */
export declare class ImageElement extends BaseElement {
    protected _model: ImageElementModel;
    constructor(model?: Partial<ImageElementModel>);
    get src(): string;
    set src(v: string);
    get alt(): string;
    set alt(v: string);
    toModel(): ImageElementModel;
}
