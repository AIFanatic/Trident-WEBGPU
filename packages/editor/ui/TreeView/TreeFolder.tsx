import { createElement, Component } from "../../gooact";
import { Arrow } from "../Arrow";

interface TreeFolderProps {
    key?: string;
    name: string;
    id?: string;
    icon?: JSX.Element;
    isSelected?: boolean;
    data?: any;
    className?: string;
    onPointerDown?: () => void;
    onPointerUp?: () => void;
    onDoubleClicked?: () => void;
    onClicked?: () => void;
    onDropped?: (event: DragEvent) => void;
    onDroppedItem?: (fromId: string, toId: string) => void;
    onDragStarted?: (event: DragEvent) => void;
    onToggled?: () => void;
}

interface TreeFolderState {
    isOpen: boolean;
}

export class TreeFolder extends Component<TreeFolderProps, TreeFolderState> {
    private folderRef: HTMLDivElement;

    constructor(props: TreeFolderProps) {
        super(props);
        this.state = { isOpen: false };
    }

    private handleToggle(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (this.props.onToggled) this.props.onToggled();
        this.setState({ isOpen: !this.state.isOpen });
    }

    private onDragStart(event: DragEvent) {
        if (this.props.id) event.dataTransfer.setData("from-uuid", this.props.id);
        if (this.props.onDragStarted) this.props.onDragStarted(event);
    }

    private onDrop(event: DragEvent) {
        if (this.props.onDropped) this.props.onDropped(event);

        if (this.folderRef) this.folderRef.style.backgroundColor = "";
        const fromUuid = event.dataTransfer.getData("from-uuid");
        if (fromUuid && this.props.onDroppedItem && this.props.id) {
            this.props.onDroppedItem(fromUuid, this.props.id);
        }
        event.preventDefault();
        event.stopPropagation();
    }

    private onDragOver(event: DragEvent) { event.preventDefault(); }
    private onDragEnter(event: DragEvent) { if (this.folderRef) this.folderRef.style.backgroundColor = "#3498db80"; }
    private onDragLeave(event: DragEvent) { if (this.folderRef) this.folderRef.style.backgroundColor = ""; }

    public render() {
        const classes = `item-title ${this.props.isSelected ? "active": ""} ${this.props.className}`;

        return (
            <div key={this.props.key} className="item" ref={(ref) => this.folderRef = ref}>
                <div
                    style={{ display: "flex", alignItems: "center" }}
                    className={classes}
                    draggable={true}
                    onDragStart={(event) => this.onDragStart(event)}
                    onDragEnter={(event) => this.onDragEnter(event)}
                    onDragLeave={(event) => this.onDragLeave(event)}
                    onDrop={(event) => this.onDrop(event)}
                    onDragOver={(event) => this.onDragOver(event)}
                    onClick={(event) => { if (this.props.onClicked) this.props.onClicked(); }}
                    onPointerDown={(event) => { if (this.props.onPointerDown) this.props.onPointerDown(); }}
                    onPointerUp={(event) => { if (this.props.onPointerUp) this.props.onPointerUp(); }}
                    onDblClick={() => { if (this.props.onDoubleClicked) this.props.onDoubleClicked(); }}
                >
                    <span style={{ width: "15px", height: "15px", fontSize: "10px" }}
                        onPointerDown={(event) => this.handleToggle(event)}>
                        <Arrow isOpen={this.state.isOpen} />
                    </span>
                    <span style={{ paddingRight: "5px" }}>{this.props.icon ?? null}</span>
                    <span>{this.props.name}</span>
                </div>
                <div className="item-content" style={{ height: this.state.isOpen ? "auto" : "0" }}>
                    {[this.props.children].flat(Infinity)}
                </div>
            </div>
        );
    }
}