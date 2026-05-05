import { ProjectEvents, SceneEvents } from "../Events";
import { createElement, Component } from "../gooact";
import { FileBrowser, MODE } from "../helpers/FileBrowser";
import { BaseProps } from "./Layout";

import { Tree } from "./TreeView/Tree";
import { TreeItem } from "./TreeView/TreeItem";
import { FloatingMenu } from "./FloatingMenu";
import { TridentAPI } from "../engine-api/trident/TridentAPI";

interface LayoutTopbarState {
    fileMenuOpen: boolean;
};

export class LayoutTopbar extends Component<BaseProps, LayoutTopbarState> {
    constructor(props: BaseProps) {
        super(props);
        this.setState({fileMenuOpen: false});
    }

    private openProject() {
        FileBrowser.init().then(() => {
            TridentAPI.EventSystem.emit(ProjectEvents.Opened);
        })
        this.setState({fileMenuOpen: !this.state.fileMenuOpen});
    }

    private async saveProject() {
        const serializedScene = this.props.engineAPI.serializer.serializeScene(this.props.engineAPI.currentScene);
        const handle = await FileBrowser.fopen(`${this.props.engineAPI.currentScene.name}.scene`, MODE.W)
        FileBrowser.fwrite(handle, JSON.stringify(serializedScene));
        TridentAPI.EventSystem.emit(SceneEvents.Saved, this.props.engineAPI.currentScene);
        this.setState({fileMenuOpen: !this.state.fileMenuOpen});
    }

    private async test() {
        const serializedScene = this.props.engineAPI.serializer.serializeScene(this.props.engineAPI.currentScene);
        console.log(JSON.stringify(serializedScene))
        this.setState({fileMenuOpen: !this.state.fileMenuOpen});
        TridentAPI.EventSystem.emit(SceneEvents.Saved, this.props.engineAPI.currentScene);
    }

    render() {
        return (
            <div style={{padding: "10px", marginLeft: "5px"}}>
                <a onClick={() => { this.setState({...this.state, fileMenuOpen: !this.state.fileMenuOpen})}} style={{cursor: "pointer"}}>File</a>
                <FloatingMenu visible={this.state.fileMenuOpen} onClose={() => this.setState({ ...this.state, fileMenuOpen: false })}>
                    <Tree>
                        <TreeItem name="Open Project..." onPointerDown={() => { this.openProject() }} />
                        <TreeItem name="Save Project" onPointerDown={() => { this.saveProject() }} />
                        <TreeItem name="Test" onPointerDown={() => { this.test() }} />
                    </Tree>
                </FloatingMenu>
            </div>
        );
    }
}