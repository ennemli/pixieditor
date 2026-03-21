export declare function makeLabel(text: string): HTMLElement;
export declare function makeRow(): HTMLElement;
export declare function makeColorInput(label: string, value: string, onChange: (v: string) => void): HTMLElement;
export declare function makeNumberInput(label: string, value: number, min: number, onChange: (v: number) => void): HTMLElement;
export declare function makeTextInput(label: string, placeholder: string, value: string, onChange: (v: string) => void): HTMLElement;
export declare function makeSlider(label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void): HTMLElement;
export declare function makeToggle(label: string, value: boolean, onChange: (v: boolean) => void): HTMLElement;
export declare function makeSelect(label: string, options: {
    value: string;
    label: string;
}[], value: string, onChange: (v: string) => void): HTMLElement;
export declare function makeSegmented(options: {
    value: string;
    label: string;
}[], value: string, onChange: (v: string) => void): HTMLElement;
