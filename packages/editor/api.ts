import { createElement, PropsWithChildren, VNode as GoactVNode, VNodeChild } from "./gooact";
import { InspectorInputProps } from "./ui/Inspector/InspectorInput";

export interface IEditorBridge {
    saveAsset(asset: { assetPath: string }): Promise<void>;
    repaintInspector(): void;
    LayoutInspectorInput(props: InspectorInputProps): any;
    ExtendedDataTransfer(): any;
    events: {
        onSceneSaved(handler: () => void): void;
        offSceneSaved(handler: () => void): void;
    };
}

let bridge: IEditorBridge | null = null;

export function registerEditorBridge(impl: IEditorBridge): void {
    bridge = impl;
}

function requireBridge(): IEditorBridge {
    if (!bridge) {
        throw new Error("EditorAPI is only available when running inside the Trident editor.");
    }
    return bridge;
}

export type VNode = GoactVNode;
export class EditorAPI {
    public static SaveAsset(asset: { assetPath: string }): Promise<void> { return requireBridge().saveAsset(asset) };
    public static CreateElement(type: VNode['type'], props: PropsWithChildren | null, ...children: VNodeChild[]): VNode { return createElement(type, props, ...children) };
    public static RepaintInspector(): void { return requireBridge().repaintInspector() };
    public static LayoutInspectorInput(props: InspectorInputProps): any { return requireBridge().LayoutInspectorInput(props) };
    public static ExtendedDataTransfer(): any { return requireBridge().ExtendedDataTransfer() };
    public static Events = {
        onSceneSaved(handler: () => void): void { return requireBridge().events.onSceneSaved(handler)},
        offSceneSaved(handler: () => void): void { return requireBridge().events.offSceneSaved(handler)},
    };
}