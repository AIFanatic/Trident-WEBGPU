import "./UIStats.css";
declare class Stat {
    protected statContainer: HTMLDivElement;
    constructor(container: HTMLDivElement, label: string | null);
    Disable(): void;
    Enable(): void;
}
export declare class UIGraph extends Stat {
    private canvas;
    private ctx;
    private lastValue;
    constructor(folder: UIFolder, name: string, color?: string, lineWidth?: number);
    addValue(value: number): void;
}
export declare class UIDropdownStat extends Stat {
    private selectElement;
    constructor(folder: UIFolder, label: string, options: string[], onChanged: (index: number, value: string) => void, defaultIndex?: number);
}
export declare class UIButtonStat extends Stat {
    private button;
    private state;
    private onText;
    private offText;
    constructor(folder: UIFolder, label: string, onClicked: (state: boolean) => void, defaultState?: boolean, onText?: string, offText?: string);
}
export declare class UISliderStat extends Stat {
    constructor(folder: UIFolder, label: string, min: number, max: number, step: number, defaultValue: number, callback: (value: number) => void);
}
export declare class UITextStat extends Stat {
    private textElement;
    private previousValue;
    private precision;
    private unit;
    private rolling;
    constructor(folder: UIFolder, label: string, defaultValue?: number, precision?: number, unit?: string, rolling?: boolean);
    SetValue(value: number): void;
    GetValue(): number;
    GetPrecision(): number;
    SetUnit(unit: string): void;
    Update(): void;
}
export declare class UIColorStat extends Stat {
    private colorElement;
    constructor(folder: UIFolder, label: string, color: string, onChanged: (color: string) => void);
}
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export declare class UIVecStat extends Stat {
    private value;
    constructor(folder: UIFolder, label: string, value: Vec3, onChanged: (value: Vec3) => void);
    private CreateEntry;
}
export declare class UIFolder extends Stat {
    private folderElement;
    readonly container: HTMLDivElement;
    constructor(container: HTMLDivElement | UIFolder, title: string);
    SetPosition(position: {
        left?: number;
        right?: number;
        top?: number;
        bottom?: number;
    }): void;
    Open(): void;
}
export {};
//# sourceMappingURL=UIStats.d.ts.map