import { createElement, Component } from "../gooact";
import { IGameObject } from "../engine-api/trident/components/IGameObject";
import { BaseProps } from "./Layout";
import { EventSystem, GameObjectEvents, LayoutHierarchyEvents, SceneEvents } from "../Events";
import { ExtendedDataTransfer } from "../helpers/ExtendedDataTransfer";
import { ComponentRegistry } from "../engine-api/trident/ComponentRegistry";
import { TreeFolder } from "./TreeView/TreeFolder";
import { TreeItem } from "./TreeView/TreeItem";
import { Tree } from "./TreeView/Tree";
import { FloatingMenu } from "./FloatingMenu";

interface LayoutHierarchyState {
    selectedGameObject: IGameObject;
    headerMenuOpen: boolean;
};

export class LayoutHierarchy extends Component<BaseProps, LayoutHierarchyState> {

    constructor(props: BaseProps) {
        super(props);
        this.setState({ selectedGameObject: null, headerMenuOpen: false });

        EventSystem.on(GameObjectEvents.Created, gameObject => {
            this.selectGameObject(gameObject);
        });

        EventSystem.on(GameObjectEvents.Deleted, gameObject => {
            if (gameObject === this.state.selectedGameObject) this.setState({...this.state, selectedGameObject: null });
        });

        EventSystem.on(GameObjectEvents.Selected, gameObject => {
            this.selectGameObject(gameObject);
        });

        EventSystem.on(GameObjectEvents.Changed, (gameObject) => {
            this.selectGameObject(gameObject);
        })

        EventSystem.on(SceneEvents.Loaded, scene => {
            this.setState({ ...this.state, selectedGameObject: null });
        });
    }

    private selectGameObject(gameObject: IGameObject) {
        EventSystem.emit(LayoutHierarchyEvents.Selected, gameObject);
        this.setState({ ...this.state, selectedGameObject: gameObject });
    }

    private getGameObjectById(id: string): IGameObject {
        for (const gameObject of this.props.engineAPI.currentScene.gameObjects) {
            if (gameObject.transform.id === id) return gameObject;
        }
        return undefined;
    }

    private onDroppedItem(fromId: string, toId: string) {        
        const fromGameObject = this.getGameObjectById(fromId);
        const toGameObject = this.getGameObjectById(toId);
        if (fromGameObject === toGameObject) return;
        if (fromGameObject && toGameObject) {
            fromGameObject.transform.parent = toGameObject.transform;
            this.selectGameObject(toGameObject);
        }
    }

    private onDragStarted(go: IGameObject) {
        ExtendedDataTransfer.data = go;
        // console.log("onDroppedItem", fromId, toId);
    }

    private async onDrop(event) {
        const extendedEvent = ExtendedDataTransfer.data;
        const instance = extendedEvent;
        if (instance && this.props.engineAPI.isPrefab(instance)) {
            const gameObject = await this.props.engineAPI.deserializer.deserializeGameObject(this.props.engineAPI.currentScene, instance);
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

    private createEmptyGameObject() {
        const gameObject = this.props.engineAPI.createGameObject(this.props.engineAPI.currentScene);
        EventSystem.emit(GameObjectEvents.Created, gameObject);
        this.setState({ ...this.state, headerMenuOpen: !this.state.headerMenuOpen });
    }

    private deleteGameObject() {
        if (this.state.selectedGameObject === null) return;

        this.state.selectedGameObject.Destroy();
        EventSystem.emit(GameObjectEvents.Deleted, this.state.selectedGameObject);
        this.setState({ headerMenuOpen: !this.state.headerMenuOpen, selectedGameObject: null });
    }

    private createPrimitive(primitiveType: "Cube" | "Capsule" | "Plane" | "Sphere") {
        const gameObject = this.props.engineAPI.createGameObject(this.props.engineAPI.currentScene);
        const mesh = this.props.engineAPI.addComponent(gameObject, ComponentRegistry.Mesh);
        if (primitiveType === "Cube") mesh.geometry = this.props.engineAPI.createCubeGeometry(), gameObject.name = "Cube";
        else if (primitiveType === "Capsule") mesh.geometry = this.props.engineAPI.createCapsuleGeometry(), gameObject.name = "Capsule";
        else if (primitiveType === "Plane") mesh.geometry = this.props.engineAPI.createPlaneGeometry(), gameObject.name = "Plane";
        else if (primitiveType === "Sphere") mesh.geometry = this.props.engineAPI.createSphereGeometry(), gameObject.name = "Sphere";
        mesh.material = this.props.engineAPI.createPBRMaterial();
        EventSystem.emit(GameObjectEvents.Created, gameObject);
        this.setState({ ...this.state, headerMenuOpen: !this.state.headerMenuOpen });
    }

    private createTerrain() {
        const gameObject = this.props.engineAPI.createGameObject(this.props.engineAPI.currentScene);
        gameObject.name = "Terrain";
        this.props.engineAPI.addComponent(gameObject, ComponentRegistry.Terrain);
        EventSystem.emit(GameObjectEvents.Created, gameObject);
        this.setState({ ...this.state, headerMenuOpen: !this.state.headerMenuOpen });
    }

    private createLight(lightType: "Directional" | "Point" | "Spot" | "Area") {
        const gameObject = this.props.engineAPI.createGameObject(this.props.engineAPI.currentScene);
        if (lightType === "Directional") this.props.engineAPI.addComponent(gameObject, ComponentRegistry.DirectionalLight), gameObject.name = "DirectionalLight";
        else if (lightType === "Point") this.props.engineAPI.addComponent(gameObject, ComponentRegistry.PointLight), gameObject.name = "PointLight";
        else if (lightType === "Spot") this.props.engineAPI.addComponent(gameObject, ComponentRegistry.SpotLight), gameObject.name = "SpotLight";
        EventSystem.emit(GameObjectEvents.Created, gameObject);
        this.setState({ ...this.state, headerMenuOpen: !this.state.headerMenuOpen });
    }

    private renderGameObjects(gameObjects: IGameObject[]) {
        return gameObjects.map(go => {
            const isSelected = this.state.selectedGameObject === go;
            const children = go.transform.children;

            if (children.size > 0) {                          // .size not .length
                return <TreeFolder
                    name={go.name}
                    id={go.transform.id}
                    isSelected={isSelected}
                    onPointerDown={() => this.selectGameObject(go)}
                    onDroppedItem={(from, to) => this.onDroppedItem(from, to)}
                    onDragStarted={(event) => this.onDragStarted(event)}
                >
                    {this.renderGameObjects(Array.from(children).map(c => c.gameObject))}
                </TreeFolder>                                  // Array.from() to iterate Set
            }
            return <TreeItem
                name={go.name}
                id={go.transform.id}
                isSelected={isSelected}
                onClicked={() => this.selectGameObject(go)}
                onDroppedItem={(from, to) => this.onDroppedItem(from, to)}
                onDragStarted={(event) => this.onDragStarted(go)}
            />
        });
    }

    render() {
        if (!this.props.engineAPI.currentScene) return <div></div>;

        const rootGameObjects = this.props.engineAPI.currentScene.GetGameObjects().filter(go => !go.transform.parent);

        return (

            <div class="Layout">
                <div class="header">
                    <div class="title">{this.props.engineAPI.currentScene.name || "Untitled scene"}</div>
                    <div class="right-action">
                        <button onClick={event => { this.setState({...this.state, headerMenuOpen: !this.state.headerMenuOpen})}}>⋮</button>
                        <FloatingMenu visible={this.state.headerMenuOpen} onClose={() => this.setState({ ...this.state, headerMenuOpen: false })}>
                            <Tree>
                                <TreeItem name="Create Empty" onPointerDown={() => this.createEmptyGameObject()} />
                                <TreeItem name="Delete" onPointerDown={() => this.deleteGameObject()} />
                                <TreeFolder name="3D Object">
                                    <TreeItem name="Cube" onPointerDown={() => this.createPrimitive("Cube")} />
                                    <TreeItem name="Capsule" onPointerDown={() => this.createPrimitive("Capsule")} />
                                    <TreeItem name="Plane" onPointerDown={() => this.createPrimitive("Plane")} />
                                    <TreeItem name="Sphere" onPointerDown={() => this.createPrimitive("Sphere")} />
                                    <TreeItem name="Terrain" onPointerDown={() => this.createTerrain()} />
                                </TreeFolder>
                                <TreeFolder name="Lights">
                                    <TreeItem name="Directional Light" onPointerDown={() => this.createLight("Directional")} />
                                    <TreeItem name="Point Light" onPointerDown={() => this.createLight("Point")} />
                                    <TreeItem name="Spot Light" onPointerDown={() => this.createLight("Spot")} />
                                </TreeFolder>
                            </Tree>
                        </FloatingMenu>
                    </div>
                </div>
                <div
                    style="width: 100%; height: 100%; overflow: auto;padding-top:5px"
                    onDrop={(event) => this.onDrop(event)}
                    onDragOver={(e) => e.preventDefault()}
                >
                    <Tree>
                        {this.renderGameObjects(rootGameObjects)}
                    </Tree>
                </div>
            </div>
        );
    }
}