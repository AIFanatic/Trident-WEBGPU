import { createElement, Component } from "../gooact";
import { IGameObject } from "../engine-api/trident/components/IGameObject";
import { BaseProps } from "./Layout";
import { ITreeMap } from "./TreeView/ITreeMap";
import { Tree } from "./TreeView/Tree";
import { EventSystem, GameObjectEvents, LayoutHierarchyEvents, SceneEvents } from "../Events";
import { ExtendedDataTransfer } from "../helpers/ExtendedDataTransfer";
import { Menu } from "./MenuDropdown/Menu";
import { MenuItem } from "./MenuDropdown/MenuItem";
import { MenuDropdown } from "./MenuDropdown/MenuDropdown";
import { IComponents } from "../engine-api/trident/components";

interface LayoutHierarchyState {
    selectedGameObject: IGameObject;
};

export class LayoutHierarchy extends Component<BaseProps, LayoutHierarchyState> {

    constructor(props) {
        super(props);
        this.setState({ selectedGameObject: null });

        EventSystem.on(GameObjectEvents.Created, gameObject => {
            this.selectGameObject(gameObject);
        });

        EventSystem.on(GameObjectEvents.Deleted, gameObject => {
            if (gameObject === this.state.selectedGameObject) this.setState({ selectedGameObject: null });
        });

        EventSystem.on(GameObjectEvents.Selected, gameObject => {
            this.selectGameObject(gameObject);
        });

        EventSystem.on(GameObjectEvents.Changed, (gameObject) => {
            this.selectGameObject(gameObject);
        })

        EventSystem.on(SceneEvents.Loaded, scene => {
            this.setState({ selectedGameObject: null });
        });
    }

    private selectGameObject(gameObject: IGameObject) {
        EventSystem.emit(LayoutHierarchyEvents.Selected, gameObject);
        this.setState({ selectedGameObject: gameObject });
    }

    private getGameObjectById(id: string): IGameObject {
        console.log(this.props.engineAPI.currentScene.gameObjects)
        for (const gameObject of this.props.engineAPI.currentScene.gameObjects) {
            if (gameObject.transform.id === id) return gameObject;
        }
        return undefined;
    }

    private onDropped(fromId: string, toId: string) {
        const fromGameObject = this.getGameObjectById(fromId);
        const toGameObject = this.getGameObjectById(toId);
        if (fromGameObject && toGameObject) {
            fromGameObject.transform.parent = toGameObject.transform;
            this.selectGameObject(toGameObject);
        }
    }

    private onDragStarted(event, data) {
        console.log("onDragStarted", event)
    }

    private onDrop(event) {
        const extendedEvent = ExtendedDataTransfer.data;
        const instance = extendedEvent;
        if (instance && this.props.engineAPI.isPrefab(instance)) {
            const gameObject = this.props.engineAPI.currentScene.Instantiate(instance);
            this.selectGameObject(gameObject);
            ExtendedDataTransfer.data = undefined;
        }
        else {
            const fromUuid = event.dataTransfer.getData("from-uuid");
            const gameObject = this.getGameObjectById(fromUuid);
            if (gameObject) {
                gameObject.transform.parent = null;
                this.selectGameObject(gameObject);
            }
        }
    }

    private buildTreeFromGameObjects(gameObjects: IGameObject[]): ITreeMap<IGameObject>[] {
        const treeMap: ITreeMap<IGameObject>[] = [];

        for (let gameObject of gameObjects) {
            treeMap.push({
                id: gameObject.transform.id,
                name: gameObject.name,
                isSelected: this.state.selectedGameObject && this.state.selectedGameObject == gameObject ? true : false,
                parent: gameObject.transform.parent ? gameObject.transform.parent.id : "",
                data: gameObject
            })
        }
        return treeMap;
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

    private createPrimitive(primitiveType: "Cube" | "Capsule" | "Plane" | "Sphere") {
        const gameObject = this.props.engineAPI.createGameObject(this.props.engineAPI.currentScene);
        const mesh = gameObject.AddComponent(IComponents.Mesh);
        if (primitiveType === "Cube") mesh.geometry = this.props.engineAPI.createCubeGeometry(), gameObject.name = "Cube";
        else if (primitiveType === "Capsule") mesh.geometry = this.props.engineAPI.createCapsuleGeometry(), gameObject.name = "Capsule";
        else if (primitiveType === "Plane") mesh.geometry = this.props.engineAPI.createPlaneGeometry(), gameObject.name = "Plane";
        else if (primitiveType === "Sphere") mesh.geometry = this.props.engineAPI.createSphereGeometry(), gameObject.name = "Sphere";
        mesh.material = this.props.engineAPI.createPBRMaterial();
        EventSystem.emit(GameObjectEvents.Created, gameObject);
    }

    private createLight(lightType: "Directional" | "Point" | "Spot" | "Area") {
        const gameObject = this.props.engineAPI.createGameObject(this.props.engineAPI.currentScene);
        if (lightType === "Directional") gameObject.AddComponent(IComponents.DirectionalLight), gameObject.name = "DirectionalLight";
        else if (lightType === "Point") gameObject.AddComponent(IComponents.PointLight), gameObject.name = "PointLight";
        else if (lightType === "Spot") gameObject.AddComponent(IComponents.SpotLight), gameObject.name = "SpotLight";
        EventSystem.emit(GameObjectEvents.Created, gameObject);
    }

    render() {
        if (!this.props.engineAPI.currentScene) return;

        const nodes = this.buildTreeFromGameObjects(this.props.engineAPI.currentScene.gameObjects);

        return (

            <div class="Layout">
                <div class="header">
                    <div class="title">Sample scene</div>
                    <div class="right-action">
                        <Menu name="⋮" >
                            <MenuItem name="Create Empty" onClicked={() => { this.createEmptyGameObject() }} />
                            <MenuItem name="Delete" onClicked={() => { this.deleteGameObject() }} />
                            <MenuDropdown name="3D Object" >
                                <MenuItem name="Cube" onClicked={() => { this.createPrimitive("Cube") }} />
                                <MenuItem name="Capsule" onClicked={() => { this.createPrimitive("Capsule") }} />
                                <MenuItem name="Plane" onClicked={() => { this.createPrimitive("Plane") }} />
                                <MenuItem name="Sphere" onClicked={() => { this.createPrimitive("Sphere") }} />
                            </MenuDropdown>

                            <MenuDropdown name="Lights" >
                                <MenuItem name="Directional Light" onClicked={() => { this.createLight("Directional") }} />
                                <MenuItem name="Point Light" onClicked={() => { this.createLight("Point") }} />
                                <MenuItem name="Spot Light" onClicked={() => { this.createLight("Spot") }} />
                            </MenuDropdown>
                        </Menu>
                    </div>
                </div>
                <div
                    style="width: 100%; height: 100%; overflow: auto;padding-top:5px"
                    onDrop={(event) => this.onDrop(event)}
                    onDragOver={(e) => e.preventDefault()}
                >
                    <Tree
                        onDropped={(from, to) => this.onDropped(from, to)}
                        onClicked={(data) => this.selectGameObject(data.data)}
                        onDragStarted={(event, data) => this.onDragStarted(event, data)}
                        data={nodes}
                    />
                </div>
            </div>
        );
    }
}