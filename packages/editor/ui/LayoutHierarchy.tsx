import { createElement, Component } from "../gooact";
import { IGameObject } from "../engine-api/trident/components/IGameObject";
import { BaseProps } from "./Layout";
import { ITreeMap } from "./TreeView/ITreeMap";
import { Tree } from "./TreeView/Tree";
import { EventSystem } from "../Events";

export class LayoutHierarchyEvents {
    public static Selected = (gameObject: IGameObject) => {};
}

interface LayoutHierarchyState {
    gameObject: IGameObject;
};

export class LayoutHierarchy extends Component<BaseProps, LayoutHierarchyState> {

    constructor(props) {
        super(props);
        this.setState({gameObject: null});
    }

    private onDropped(from: string, to: string) {
    }

    private onClicked(data: ITreeMap<IGameObject>) {
        EventSystem.emit(LayoutHierarchyEvents.Selected, data.data);
        this.setState({gameObject: data.data});
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
            <div style="width: 100%">
                <Tree
                    onDropped={(from, to) => this.onDropped(from, to)}
                    onClicked={(data) => this.onClicked(data)}
                    onDragStarted={(event, data) => this.onDragStarted(event, data)}
                    data={nodes}
                />
            </div>
        );
    }
}