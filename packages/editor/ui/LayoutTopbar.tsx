import { ProjectEvents, RuntimeEvents, SceneEvents } from "../Events";
import { createElement, Component } from "../gooact";
import { FileBrowser, MODE } from "../helpers/FileBrowser";
import { BaseProps } from "./Layout";

import { Tree } from "./TreeView/Tree";
import { TreeItem } from "./TreeView/TreeItem";
import { FloatingMenu } from "./FloatingMenu";
import { TridentAPI } from "../engine-api/trident/TridentAPI";
import { PlayIcon } from "./icons/PlayIcon";
import { StopIcon } from "./icons/StopIcon";

interface LayoutTopbarState {
    fileMenuOpen: boolean;
};

export class LayoutTopbar extends Component<BaseProps, LayoutTopbarState> {
    constructor(props: BaseProps) {
        super(props);
        this.setState({ fileMenuOpen: false });
    }

    private openProject() {
        FileBrowser.init().then(() => {
            TridentAPI.EventSystem.emit(ProjectEvents.Opened);
        })
        this.setState({ fileMenuOpen: !this.state.fileMenuOpen });
    }

    private async saveProject() {
        const serializedScene = this.props.engineAPI.serializer.serializeScene(this.props.engineAPI.currentScene);
        const handle = await FileBrowser.fopen(`${this.props.engineAPI.currentScene.name}.scene`, MODE.W)
        FileBrowser.fwrite(handle, JSON.stringify(serializedScene));
        TridentAPI.EventSystem.emit(SceneEvents.Saved, this.props.engineAPI.currentScene);
        this.setState({ fileMenuOpen: !this.state.fileMenuOpen });
    }

    private async test() {
        const serializedScene = this.props.engineAPI.serializer.serializeScene(this.props.engineAPI.currentScene);
        console.log(JSON.stringify(serializedScene))
        // this.setState({ fileMenuOpen: !this.state.fileMenuOpen });
        // TridentAPI.EventSystem.emit(SceneEvents.Saved, this.props.engineAPI.currentScene);
    }

    private async PlayStop() {
        const runtime = this.props.engineAPI.getRuntime();
        const wasPlaying = runtime.isPlaying;

        if (wasPlaying) {
            await runtime.Stop();
            TridentAPI.EventSystem.emit(RuntimeEvents.Stop);
        } else {
            runtime.Play();
            TridentAPI.EventSystem.emit(RuntimeEvents.Play);
        }

        this.setState({ ...this.state });
    }

    render() {
        return (
            <div style={{ marginLeft: "5px", display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", padding: "10px" }}>
                <div>
                    <a onClick={() => { this.setState({ ...this.state, fileMenuOpen: !this.state.fileMenuOpen }) }} style={{ cursor: "pointer" }}>File</a>
                    <FloatingMenu visible={this.state.fileMenuOpen} onClose={() => this.setState({ ...this.state, fileMenuOpen: false })}>
                        <Tree>
                            <TreeItem name="Open Project..." onPointerDown={() => { this.openProject() }} />
                            <TreeItem name="Save Project" onPointerDown={() => { this.saveProject() }} />
                            <TreeItem name="Test" onPointerDown={() => { this.test() }} />
                        </Tree>
                    </FloatingMenu>
                </div>
                <div>
                    <button class="button" style={{ width: "25px", height: "25px" }} onClick={() => { this.PlayStop() }}>
                        {this.props.engineAPI.getRuntime().isPlaying ? <StopIcon /> : <PlayIcon />}
                    </button>
                </div>
            </div>
        );
    }
}