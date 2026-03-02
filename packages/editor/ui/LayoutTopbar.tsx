import { EventSystem, ProjectEvents } from "../Events";
import { createElement, Component } from "../gooact";
import { FileBrowser, MODE } from "../helpers/FileBrowser";
import { BaseProps } from "./Layout";

import { Tree } from "./TreeView/Tree";
import { TreeItem } from "./TreeView/TreeItem";

interface LayoutTopbarState {
    fileMenuOpen: boolean;
};

export class LayoutTopbar extends Component<BaseProps, LayoutTopbarState> {
    constructor(props) {
        super(props);
        this.setState({fileMenuOpen: false});
    }

    private openProject() {
        FileBrowser.init().then(() => {
            EventSystem.emit(ProjectEvents.Opened);
        })
        this.setState({fileMenuOpen: !this.state.fileMenuOpen});
    }

    private async saveProject() {
        const serializedScene = this.props.engineAPI.currentScene.Serialize();
        const handle = await FileBrowser.fopen(`${this.props.engineAPI.currentScene.name}.scene`, MODE.W)
        FileBrowser.fwrite(handle, JSON.stringify(serializedScene));
        this.setState({fileMenuOpen: !this.state.fileMenuOpen});
    }

    private async test() {
        const serializedScene = this.props.engineAPI.currentScene.Serialize();
        console.log(JSON.stringify(serializedScene))
        this.setState({fileMenuOpen: !this.state.fileMenuOpen});
    }

    render() {
        return (
            <div style={{padding: "10px", marginLeft: "5px"}}>
                <a onClick={event => { this.setState({...this.state, fileMenuOpen: !this.state.fileMenuOpen})}} style={{cursor: "pointer"}}>File</a>
                <div class="Floating-Menu" style={`display: ${this.state.fileMenuOpen ? "inherit" : "none"}`}>
                    <Tree>
                        <TreeItem name="Open Project..." onClicked={() => { this.openProject() }} />
                        <TreeItem name="Save Project" onClicked={() => { this.saveProject() }} />
                        <TreeItem name="Test" onClicked={() => { this.test() }} />
                    </Tree>
                </div>
            </div>
        );
    }
}