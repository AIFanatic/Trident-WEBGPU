import { createElement, Component } from "../gooact";
import { IGameObject } from "../engine-api/trident/components/IGameObject";
import { BaseProps } from "./Layout";
import { ITreeMap } from "./TreeView/ITreeMap";
import { Tree } from "./TreeView/Tree";
import { EventSystem, GameObjectEvents, LayoutHierarchyEvents } from "../Events";
import { ExtendedDataTransfer } from "../helpers/ExtendedDataTransfer";
import { MenuItem } from "./MenuDropdown/MenuItem";
import { Menu } from "./MenuDropdown/Menu";
import { MenuDropdown } from "./MenuDropdown/MenuDropdown";

interface LayoutHierarchyState {
    gameObject: IGameObject;
};

export class LayoutHierarchy extends Component<BaseProps, LayoutHierarchyState> {

    constructor(props) {
        super(props);
        this.setState({ gameObject: null });

        EventSystem.on(GameObjectEvents.Created, gameObject => {
            this.selectGameObject(gameObject);
        });

        EventSystem.on(GameObjectEvents.Deleted, gameObject => {
            if (gameObject === this.state.gameObject) this.setState({ gameObject: null });
        });
    }

    private selectGameObject(gameObject: IGameObject) {
        console.log("selected", gameObject);
        EventSystem.emit(LayoutHierarchyEvents.Selected, gameObject);
        this.setState({ gameObject: gameObject });
    }

    private onDropped(from: string, to: string) {
    }

    private onDragStarted(event, data) {
        console.log("onDragStarted", event)
    }

    private onDrop(event) {
        console.log("onDrop", event)
        const extendedEvent = ExtendedDataTransfer.get();
        console.log("extendedEvent", extendedEvent.data)
        const instance = extendedEvent.data;
        if (instance && this.props.engineAPI.isPrefab(instance)) {
            const gameObject = this.props.engineAPI.currentScene.Instantiate(instance);
            this.selectGameObject(gameObject);
        }
        // const fromUuid = event.dataTransfer.getData("from-uuid");
        // const fromGameObject = this.getGameObjectFromUuid(this.state.scene, fromUuid);
        // if (fromGameObject) {
        //     fromGameObject.transform.parent = null;
        //     this.forceUpdate();
        // }
    }

    private buildTreeFromGameObjects(gameObjects: IGameObject[]): ITreeMap<IGameObject>[] {
        const treeMap: ITreeMap<IGameObject>[] = [];

        for (let gameObject of gameObjects) {
            treeMap.push({
                id: gameObject.transform.id,
                name: gameObject.name,
                isSelected: this.state.gameObject && this.state.gameObject == gameObject ? true : false,
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