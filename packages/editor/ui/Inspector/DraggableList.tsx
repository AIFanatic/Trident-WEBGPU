import { createElement, Component, VNode } from "../../gooact";

interface DraggableListProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => Node;
    onReorder: (items: T[]) => void;
}

interface DraggableListState {
    draggingIndex: number | null;
}

export class DraggableList<T> extends Component<DraggableListProps<T>, DraggableListState> {
    public state: DraggableListState = {
        draggingIndex: null
    };

    private onDragStart(index: number, e: DragEvent) {
        this.setState({ draggingIndex: index });

        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", index.toString());
        }
    }

    private onDragOver(index: number, e: DragEvent) {
        e.preventDefault();

        const fromIndex = this.state.draggingIndex;
        const toIndex = index;

        if (fromIndex === null || fromIndex === toIndex) return;

        const reordered = this.props.items.slice();

        const [movedItem] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, movedItem);

        this.setState({ draggingIndex: toIndex });
        this.props.onReorder(reordered);
    }

    private onDragEnd() {
        this.setState({ draggingIndex: null });
    }

    private onDrop(e: DragEvent) {
        e.stopPropagation();
    }

    public render() {
        return <div>
            {...this.props.items.map((item, index) => {
                return <div
                    draggable={true}
                    onDragStart={(e: DragEvent) => this.onDragStart(index, e)}
                    onDragOver={(e: DragEvent) => this.onDragOver(index, e)}
                    onDragEnd={() => this.onDragEnd()}
                    onDrop={(e: DragEvent) => this.onDrop(e)}
                    style={{ cursor: "move" }}
                >
                    {this.props.renderItem(item, index)}
                </div>;
            })}
        </div>;
    }
}