import { TridentAPI } from "./engine-api/trident/TridentAPI";
import { createElement, render, Component } from "./gooact";
import { Layout } from "./ui/Layout";
import { registerEditorBridge } from "@trident/editor";
import { SaveAsset } from "./commands/SaveAsset";
import { LayoutInspectorEvents, SceneEvents } from "./Events";
import { InspectorInput, InspectorInputProps } from "./ui/Inspector/InspectorInput";
import { ExtendedDataTransfer } from "./helpers/ExtendedDataTransfer";

export type EditorEventHandler<T extends (...args: any[]) => void> = (...args: Parameters<T>) => void;

registerEditorBridge({
    saveAsset: SaveAsset,
    repaintInspector: () => { TridentAPI.EventSystem.emit(LayoutInspectorEvents.Repaint) },
    LayoutInspectorInput: (props: InspectorInputProps) => { return <InspectorInput {...props} /> },
    ExtendedDataTransfer: () => { return ExtendedDataTransfer },
    events: {
        onSceneSaved: (handler: () => void) => { TridentAPI.EventSystem.on(SceneEvents.Saved, handler)},
        offSceneSaved: (handler: () => void) => { TridentAPI.EventSystem.off(SceneEvents.Saved, handler)},
    },
});

const engineAPI = new TridentAPI();

class App extends Component {
    render() {
        return (
            <Layout engineAPI={engineAPI} />
        );
    }
}

render(<App />, document.body);