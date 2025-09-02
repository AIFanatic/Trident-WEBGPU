import { createElement, Component } from "../../gooact";
import { ITreeMap } from './ITreeMap';

interface FileProps {
    data: ITreeMap<any>;
    onClicked: (data: ITreeMap<any>) => void;
    onDoubleClicked?: (data: ITreeMap<any>) => void;
    onDropped: (from: string, to: string) => void;
    onDragStarted?: (event: DragEvent, data: ITreeMap<any>) => void;
}

interface FileState {
    isSelected: boolean;
}

export class File extends Component<FileProps, FileState> {
    private FileRef: HTMLDivElement;

    private FileRefCreated(ref: HTMLDivElement) {
        this.FileRef = ref;
    }

    constructor(props: FileProps) {
        super(props);
        this.state = {isSelected: false};
    }

    private onDragStart(event: DragEvent) {
        event.dataTransfer.setData("from-uuid", this.props.data.id);

        if (this.props.onDragStarted) {
            this.props.onDragStarted(event, this.props.data);
        }
    }

    private onDrop(event: DragEvent) {
        this.FileRef.style.backgroundColor = "";
        
        const fromUuid = event.dataTransfer.getData("from-uuid");

        if (fromUuid != "") {
            this.props.onDropped(fromUuid, this.props.data.id);
        }
        event.preventDefault();
        event.stopPropagation();
    }

    private onDragOver(event: DragEvent) {
        event.preventDefault();
    }
    
    private onClicked(event: MouseEvent) {
        this.props.onClicked(this.props.data);
        event.preventDefault();
        event.stopPropagation();
    }

    private onDoubleClicked(event: MouseEvent) {
        if (this.props.onDoubleClicked) {
            this.props.onDoubleClicked(this.props.data);
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private onDragEnter(event: DragEvent) {
        this.FileRef.style.backgroundColor = "#3498db80";
    }

    private onDragLeave(event: DragEvent) {
        this.FileRef.style.backgroundColor = "";
    }

    public render() {
        let classes = "item-title";
        if (this.props.data.isSelected) classes += " active";

        return (
            <div
                className = "item"
                ref={(ref) => this.FileRefCreated(ref)}
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
                    onDoubleClick={(event) => this.onDoubleClicked(event)}
                >
                    <span
                        style={{paddingLeft: "15px"}}
                    ></span>
                    
                    <span>{this.props.data.name}</span>
                </div>

                <div
                    className = "item-content"
                >
                </div>
            </div>
        );
    }
}