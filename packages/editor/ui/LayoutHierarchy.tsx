import { createElement, Component } from "../gooact";
import { IGameObject } from "../engine-api/trident/components/IGameObject";
import { BaseProps } from "./Layout";
import { ITreeMap } from "./TreeView/ITreeMap";
import { Tree } from "./TreeView/Tree";
import { EventSystem } from "../Events";

export class LayoutHierarchyEvents {
    public static Selected = (gameObject: IGameObject) => {};
}

export class LayoutHierarchy extends Component<BaseProps> {

    private onDropped(from: string, to: string) {
    }

    private onClicked(data: ITreeMap<IGameObject>) {
        EventSystem.emit(LayoutHierarchyEvents.Selected, data.data);
    }

    private onDragStarted(event, data) {
    }

    private buildTreeFromGameObjects(gameObjects: IGameObject[]): ITreeMap<IGameObject>[] {
        const treeMap: ITreeMap<IGameObject>[] = [];
        
        for (let gameObject of gameObjects) {
            treeMap.push({
                id: gameObject.transform.id,
                name: gameObject.name,
                isSelected: this.props.selectedGameObject && this.props.selectedGameObject == gameObject ? true : false,
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
            <div>
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