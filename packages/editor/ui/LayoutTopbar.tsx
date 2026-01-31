import { EventSystem, GameObjectEvents, LayoutHierarchyEvents, ProjectEvents } from "../Events";
import { IGameObject } from "../engine-api/trident/components/IGameObject";
import { createElement, Component } from "../gooact";
import { FileBrowser, MODE } from "../helpers/FileBrowser";
import { BaseProps } from "./Layout";

import { Menu } from './MenuDropdown/Menu';
import { MenuDropdown } from './MenuDropdown/MenuDropdown';
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

    private createEmptyGameObject() {
        const gameObject = this.props.engineAPI.createGameObject(this.props.engineAPI.currentScene);
        EventSystem.emit(GameObjectEvents.Created, gameObject);
    }

    private deleteGameObject() {
        if (this.state.selectedGameObject === null) return;

        this.state.selectedGameObject.Destroy();
        EventSystem.emit(GameObjectEvents.Deleted, this.state.selectedGameObject);
        this.setState({selectedGameObject: null});
    }

    private openProject() {
        console.log("open project");
        FileBrowser.init().then(() => {
            EventSystem.emit(ProjectEvents.Opened);
        })
    }

    private async saveProject() {
        console.log("save project");
        const serializedScene = this.props.engineAPI.currentScene.Serialize();
        const handle = await FileBrowser.fopen("Scene.prefab", MODE.W)
        FileBrowser.fwrite(handle, JSON.stringify(serializedScene))
    }

    render() {
        return (
            <div style="padding: 5px">
                <Menu name="File">
                    <MenuItem name="Open Project..." onClicked={() => { this.openProject() }} />
                    <MenuItem name="Save Project" onClicked={() => { this.saveProject() }} />
                </Menu>

                <Menu name="Edit">
                    <MenuItem name="Delete" onClicked={() => { this.deleteGameObject() }} />
                </Menu>

                <Menu name="Assets">
                    <MenuDropdown name="Create">
                        <MenuItem name="Folder" onClicked={() => { this.createFolder() }} />
                        <MenuItem name="Material" onClicked={() => { this.createMaterial() }} />
                        <MenuItem name="Script" onClicked={() => { this.createScript() }} />
                        <MenuItem name="Scene" onClicked={() => { this.createScene() }} />
                    </MenuDropdown>
                </Menu>

                <Menu name="GameObject" >
                    <MenuItem name="Create Empty" onClicked={() => { this.createEmptyGameObject() }} />
                    <MenuDropdown name="3D Object" >
                        <MenuItem name="Cube" onClicked={() => { this.createPrimitive(PrimitiveType.Cube) }} />
                        <MenuItem name="Capsule" onClicked={() => { this.createPrimitive(PrimitiveType.Capsule) }} />
                        <MenuItem name="Plane" onClicked={() => { this.createPrimitive(PrimitiveType.Plane) }} />
                        <MenuItem name="Sphere" onClicked={() => { this.createPrimitive(PrimitiveType.Sphere) }} />
                        <MenuItem name="Cylinder" onClicked={() => { this.createPrimitive(PrimitiveType.Cylinder) }} />
                    </MenuDropdown>

                    <MenuDropdown name="Lights" >
                        <MenuItem name="Directional Light" onClicked={() => { this.createLight(LightTypes.Directional) }} />
                        <MenuItem name="Point Light" onClicked={() => { this.createLight(LightTypes.Point) }} />
                        <MenuItem name="Spot Light" onClicked={() => { this.createLight(LightTypes.Spot) }} />
                        <MenuItem name="Area Light" onClicked={() => { this.createLight(LightTypes.Area) }} />
                    </MenuDropdown>
                </Menu>
            </div>
        );
    }
}