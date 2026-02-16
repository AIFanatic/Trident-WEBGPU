import { EventSystem, LayoutHierarchyEvents, ProjectEvents } from "../Events";
import { IGameObject } from "../engine-api/trident/components/IGameObject";
import { createElement, Component } from "../gooact";
import { FileBrowser, MODE } from "../helpers/FileBrowser";
import { BaseProps } from "./Layout";

import { Menu } from './MenuDropdown/Menu';
import { MenuItem } from './MenuDropdown/MenuItem';

interface LayoutTopbarState {
    selectedGameObject: IGameObject;
};

export class LayoutTopbar extends Component<BaseProps, LayoutTopbarState> {
    constructor(props) {
        super(props);
        this.setState({selectedGameObject: null});

        EventSystem.on(LayoutHierarchyEvents.Selected, gameObject => {
            this.setState({selectedGameObject: gameObject});
        });
    }

    private openProject() {
        FileBrowser.init().then(() => {
            EventSystem.emit(ProjectEvents.Opened);
        })
    }

    private async saveProject() {
        const serializedScene = this.props.engineAPI.currentScene.Serialize();
        const handle = await FileBrowser.fopen("Scene.prefab", MODE.W)
        FileBrowser.fwrite(handle, JSON.stringify(serializedScene))
    }

    private async test() {
        const serializedScene = this.props.engineAPI.currentScene.Serialize();
        console.log(JSON.stringify(serializedScene))
    }

    render() {
        return (
            <div style="padding: 5px">
                <Menu name="File">
                    <MenuItem name="Open Project..." onClicked={() => { this.openProject() }} />
                    <MenuItem name="Save Project" onClicked={() => { this.saveProject() }} />
                    <MenuItem name="Test" onClicked={() => { this.test() }} />
                </Menu>
            </div>
        );
    }
}