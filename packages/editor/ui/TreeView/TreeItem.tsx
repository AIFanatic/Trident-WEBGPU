import { createElement, Component } from "../../gooact";

interface TreeItemProps {
    name: string;
    id?: string;
    isSelected?: boolean;
    data?: any;
    className?: string;
    onPointerDown?: () => void;
    onClicked?: () => void;
    onPointerUp?: () => void;
    onDoubleClicked?: () => void;
    onDropped?: (event: DragEvent) => void;
    onDroppedItem?: (fromId: string, toId: string) => void;
    onDragStarted?: (event: DragEvent) => void;
    render?: JSX.Element;
}

export class TreeItem extends Component<TreeItemProps> {
    private onDragStart(event: DragEvent) {
        if (this.props.id) event.dataTransfer.setData("from-uuid", this.props.id);
        if (this.props.onDragStarted) this.props.onDragStarted(event);
    }

    private onDrop(event: DragEvent) {
        if (this.props.onDropped) this.props.onDropped(event);
        
        (event.currentTarget as HTMLElement).style.backgroundColor = "";
        const fromUuid = event.dataTransfer.getData("from-uuid");
        if (fromUuid && this.props.onDroppedItem && this.props.id) {
            this.props.onDroppedItem(fromUuid, this.props.id);
        }
        event.preventDefault();
        event.stopPropagation();
    }

    private onDragOver(event: DragEvent) { event.preventDefault(); }
    private onDragEnter(event: DragEvent) { (event.currentTarget as HTMLElement).style.backgroundColor = "#3498db80"; }
    private onDragLeave(event: DragEvent) { (event.currentTarget as HTMLElement).style.backgroundColor = ""; }

    private lastClickTs = 0;
    private readonly dblMs = 220;

    private onPointerDown(event: MouseEvent) {
        if (this.props.onPointerDown) this.props.onPointerDown();
        const now = performance.now();
        if (now - this.lastClickTs < this.dblMs && this.props.onDoubleClicked) {
            this.props.onDoubleClicked();
        }
        this.lastClickTs = now;
    }

    private onClick(event: Event) {
        if (this.props.onClicked) this.props.onClicked();
    }

    public render() {
        const classes = `item-title ${this.props.isSelected ? "active": ""} ${this.props.className}`;
        return (
            <div className="item">
                <div
                    style={{ display: "flex", alignItems: "center" }}
                    className={classes}
                    draggable={true}
                    onDragStart={(event: DragEvent) => this.onDragStart(event)}
                    onDragEnter={(event: DragEvent) => this.onDragEnter(event)}
                    onDragLeave={(event: DragEvent) => this.onDragLeave(event)}
                    onDrop={(event: DragEvent) => this.onDrop(event)}
                    onDragOver={(event: DragEvent) => this.onDragOver(event)}
                    onPointerDown={(event: PointerEvent) => this.onPointerDown(event)}
                    onPointerUp={(event: PointerEvent) => { if (this.props.onPointerUp) this.props.onPointerUp(); }}
                    onClick={(event: Event) => this.onClick(event)}
                >
                    <span style={{ paddingLeft: "15px" }}></span>
                    { this.props.render ? this.props.render : <span>{this.props.name}</span> }
                </div>
            </div>
        );
    }
}