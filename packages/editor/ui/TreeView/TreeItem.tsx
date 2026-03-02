import { createElement, Component } from "../../gooact";

interface TreeItemProps {
    name: string;
    id?: string;
    isSelected?: boolean;
    data?: any;
    onClicked?: () => void;
    onDoubleClicked?: () => void;
    onDropped?: (fromId: string, toId: string) => void;
    onDragStarted?: (event: DragEvent) => void;
}

export class TreeItem extends Component<TreeItemProps> {
    private itemRef: HTMLDivElement;

    private onDragStart(event: DragEvent) {
        if (this.props.id) event.dataTransfer.setData("from-uuid", this.props.id);
        if (this.props.onDragStarted) this.props.onDragStarted(event);
    }

    private onDrop(event: DragEvent) {
        if (this.itemRef) this.itemRef.style.backgroundColor = "";
        const fromUuid = event.dataTransfer.getData("from-uuid");
        if (fromUuid && this.props.onDropped && this.props.id) {
            this.props.onDropped(fromUuid, this.props.id);
        }
        event.preventDefault();
        event.stopPropagation();
    }

    private onDragOver(event: DragEvent) { event.preventDefault(); }
    private onDragEnter(event: DragEvent) { if (this.itemRef) this.itemRef.style.backgroundColor = "#3498db80"; }
    private onDragLeave(event: DragEvent) { if (this.itemRef) this.itemRef.style.backgroundColor = ""; }

    private lastClickTs = 0;
    private readonly dblMs = 220;

    private onPointerDown(event: MouseEvent) {
        if (this.props.onClicked) this.props.onClicked();
        const now = performance.now();
        if (now - this.lastClickTs < this.dblMs && this.props.onDoubleClicked) {
            this.props.onDoubleClicked();
        }
        this.lastClickTs = now;
    }

    public render() {
        let classes = "item-title";
        if (this.props.isSelected) classes += " active";

        return (
            <div className="item" ref={(ref) => this.itemRef = ref}>
                <div
                    style={{ display: "flex", alignItems: "center" }}
                    className={classes}
                    draggable={true}
                    onDragStart={(event) => this.onDragStart(event)}
                    onDragEnter={(event) => this.onDragEnter(event)}
                    onDragLeave={(event) => this.onDragLeave(event)}
                    onDrop={(event) => this.onDrop(event)}
                    onDragOver={(event) => this.onDragOver(event)}
                    onPointerDown={(event) => this.onPointerDown(event)}
                >
                    <span style={{ paddingLeft: "15px" }}></span>
                    <span>{this.props.name}</span>
                </div>
            </div>
        );
    }
}