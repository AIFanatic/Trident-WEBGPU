export interface IColor {
    r: number;
    g: number;
    b: number;
    a: number;
    
    set(r: number, g: number, b: number, a: number);
    setFromHex(hex: string): IColor;
    clone(): IColor;
    toHex(): string;
};