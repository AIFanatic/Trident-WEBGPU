import { createElement, Component } from "../../gooact";
import { ITreeMap } from './ITreeMap';

interface FolderProps {
    data: ITreeMap<any>[];
    item: ITreeMap<any>;
    onClicked: (data: ITreeMap<any>) => void;
    onDoubleClicked?: (data: ITreeMap<any>) => void;
    onDropped: (from: string, to: string) => void;
    onToggled: (data: ITreeMap<any>) => void;
}

interface FolderState {
    isOpen: boolean;
    isSelected: boolean;
}

export class Folder extends Component<FolderProps, FolderState> {
    private folderRef: HTMLDivElement;

    constructor(props: FolderProps) {
        super(props);
        this.state = {isOpen: false, isSelected: false};
    }

    private FolderRefCreated(ref: HTMLDivElement) {
        this.folderRef = ref;
    }

    private handleToggle(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (this.props.onToggled) {
            this.props.onToggled(this.props.item);
        }
        this.setState({isOpen: !this.state.isOpen, isSelected: this.state.isSelected});
    };

    private onDragStart(event: DragEvent) {
        event.dataTransfer.setData("from-uuid", this.props.item.id);
    }

    private onDrop(event: DragEvent) {
        this.folderRef.style.backgroundColor = "";
        
        const fromUuid = event.dataTransfer.getData("from-uuid");

        if (fromUuid != "") {
            this.props.onDropped(fromUuid, this.props.item.id);
        }
        event.preventDefault();
        event.stopPropagation();
    }

    private onDragOver(event: DragEvent) {
        event.preventDefault();
    }
    
    private onClicked(event: MouseEvent) {
        this.props.onClicked(this.props.item);
        event.preventDefault();
        event.stopPropagation();
    }
    
    private onDoubleClicked(event: MouseEvent) {
        if (this.props.onDoubleClicked) {
            this.props.onDoubleClicked(this.props.item);
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private onDragEnter(event: DragEvent) {
        this.folderRef.style.backgroundColor = "#3498db80";
    }

    private onDragLeave(event: DragEvent) {
        this.folderRef.style.backgroundColor = "";
    }

    public render() {
        let classes = "item-title";
        if (this.props.item.isSelected) classes += " active";

        return (
            <div
                className = "item"
                ref={(ref) => this.FolderRefCreated(ref)}
            >
                <div
                    style={{display: "flex", alignItems: "center"}}
                    className={classes}
                    draggable={true}
                    onDragStart={(event) => this.onDragStart(event)}
                    onDragEnter={(event) => this.onDragEnter(event)}
                    onDragLeave={(event) => this.onDragLeave(event)}
                    onDrop={(event) => this.onDrop(event)}
                    onDragOver={(event) => this.onDragOver(event)}
                    onClick={(event) => this.onClicked(event)}
                    onDblClick={(event) => this.onDoubleClicked(event)}
                >
                    <span
                        style={{width: "15px", height: "15px", fontSize: "10px"}}
                        onClick={(event) => {this.handleToggle(event)}}
                    >{this.state.isOpen ? "▼ " : "▶ "}</span>

                    <span>{this.props.item.name}</span>
                </div>

                <div
                    className = "item-content"
                    style={{
                        height: this.state.isOpen ? "auto" : "0",
                    }}
                >
                    {this.props.children}
                </div>
            </div>
        );
    }
}