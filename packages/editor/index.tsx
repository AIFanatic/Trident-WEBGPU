import { TridentAPI } from "./engine-api/trident/TridentAPI";
import { createElement, render, Component } from "./gooact";
import { Layout } from "./ui/Layout";
import { registerEditorBridge } from "@trident/editor";
import { SaveAsset } from "./commands/SaveAsset";

registerEditorBridge({
    saveAsset: SaveAsset,
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