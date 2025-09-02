import { createElement, Component } from "../../gooact";
import { Folder } from './Folder';
import { File } from './File';
import { ITreeMap, ITreeMapType } from './ITreeMap';

import './TreeView.css'

interface TreeProps {
    data: ITreeMap<any>[];
    item?: ITreeMap<any>;
    onClicked: (data: ITreeMap<any>) => void;
    onDoubleClicked?: (data: ITreeMap<any>) => void;
    onDropped: (from: string, to: string) => void;
    onToggled?: (data: ITreeMap<any>) => void;
    onDragStarted?: (event: DragEvent, data: ITreeMap<any>) => void;
};

export class Tree extends Component<TreeProps> {
    constructor(props: TreeProps) {
        super(props);
    }

    private getChildrenForParent(data: ITreeMap<any>[], parentId: string): ITreeMap<any>[] {
        let out: ITreeMap<any>[] = [];
        for (let entry of data) {
            if (entry.parent == parentId) out.push(entry);
        }
        return out;
    }
    
    render() {
        let children = this.props.item ? this.getChildrenForParent(this.props.data, this.props.item.id) : this.getChildrenForParent(this.props.data, "");

        return (
            <div
                className="treeview"
            >
                {
                    children.map(item => {
                        const itemChildren = this.getChildrenForParent(this.props.data, item.id);

                        if (itemChildren.length > 0 || item.type == ITreeMapType.Folder) {
                            return <Folder 
                                onToggled={this.props.onToggled ? (item) => this.props.onToggled(item) : null}
                                // key={item.id}
                                item={item}
                                data={this.props.data}
                                onDropped={(from, to) => this.props.onDropped(from, to)}
                                onClicked={(data) => this.props.onClicked(data)}
                                onDoubleClicked={(data) => this.props.onDoubleClicked(data)}
                            >
                                <Tree
                                    item={item}
                                    onToggled={this.props.onToggled ? (item) => this.props.onToggled(item) : null}
                                    onDropped={(from, to) => this.props.onDropped(from, to)}
                                    onClicked={(data) => this.props.onClicked(data)}
                                    onDragStarted={(event, data) => this.props.onDragStarted(event, data)}
                                    data={this.props.data}
                                />
    
                            </Folder>
                        }
                        else {
                            return <File
                                // key={item.id}
                                data={item}
                                onDropped={this.props.onDropped ? (from, to) => this.props.onDropped(from, to) : null}
                                onClicked={this.props.onClicked ? (data) => this.props.onClicked(data) : null}
                                onDoubleClicked={this.props.onDoubleClicked ? (data) => this.props.onDoubleClicked(data) : null}
                                onDragStarted={this.props.onDragStarted ? (event, data) => this.props.onDragStarted(event, data) : null}
                            >
                            </File>
                        }
                    })
                }
            </div>
        )
    }
}