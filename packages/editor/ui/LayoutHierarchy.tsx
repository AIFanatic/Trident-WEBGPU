import { createElement, Component } from "../gooact";
import { IGameObject } from "../engine-api/trident/components/IGameObject";
import { BaseProps } from "./Layout";
import { ITreeMap } from "./TreeView/ITreeMap";
import { Tree } from "./TreeView/Tree";
import { EventSystem, GameObjectEvents, LayoutHierarchyEvents } from "../Events";

interface LayoutHierarchyState {
    gameObject: IGameObject;
};

export class LayoutHierarchy extends Component<BaseProps, LayoutHierarchyState> {

    constructor(props) {
        super(props);
        this.setState({gameObject: null});

        EventSystem.on(GameObjectEvents.Created, gameObject => {
            this.selectGameObject(gameObject);
        });

        EventSystem.on(GameObjectEvents.Deleted, gameObject => {
            if (gameObject === this.state.gameObject) this.setState({gameObject: null});
        });
    }

    private selectGameObject(gameObject: IGameObject) {
        console.log("selected", gameObject);
        EventSystem.emit(LayoutHierarchyEvents.Selected, gameObject);
        this.setState({gameObject: gameObject});
    }

    private onDropped(from: string, to: string) {
    }

    private onDragStarted(event, data) {
    }

    private buildTreeFromGameObjects(gameObjects: IGameObject[]): ITreeMap<IGameObject>[] {
        const treeMap: ITreeMap<IGameObject>[] = [];
        
        for (let gameObject of gameObjects) {
            treeMap.push({
                id: gameObject.transform.id,
                name: gameObject.name,
                isSelected: this.state.gameObject && this.state.gameObject == gameObject ? true : false,
                parent: gameObject.transform.parent ?  gameObject.transform.parent.id : "",
                data: gameObject
            })
        }
        return treeMap;
    }
    
    render() {
        if (!this.props.engineAPI.currentScene) return;

        const nodes = this.buildTreeFromGameObjects(this.props.engineAPI.currentScene.gameObjects);

        return (
            <div style="width: 100%; overflow: auto;">
                <Tree
                    onDropped={(from, to) => this.onDropped(from, to)}
                    onClicked={(data) => this.selectGameObject(data.data)}
                    onDragStarted={(event, data) => this.onDragStarted(event, data)}
                    data={nodes}
                />
            </div>
        );
    }
}