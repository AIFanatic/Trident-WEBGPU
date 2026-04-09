// import { ExtendedDataTransfer } from '../../helpers/ExtendedDataTransfer';
import { ExtendedDataTransfer } from "../../helpers/ExtendedDataTransfer";
import { createElement, Component } from "../../gooact";
import './InspectorComponent.css';

export class Class { };

interface InspectorTypeProps {
    title: string;
    value: string;
    component: Class;
    property: string;
    expectedType?: Function;
    onChanged?: (value: string) => void;
};

export class InspectorType extends Component<InspectorTypeProps> {
    constructor(props: InspectorTypeProps) {
        super(props);
    }

    private isValidDrop(draggedItem: any): boolean {
        if (!draggedItem) return false;
        if (this.props.expectedType) return draggedItem instanceof this.props.expectedType;
        const current = this.props.component[this.props.property];
        return current && draggedItem.constructor === current.constructor;
    }

    private onDrop(event: DragEvent) {
        const draggedItem = ExtendedDataTransfer.data;
        console.log("onDrop", draggedItem);
        if (!this.isValidDrop(draggedItem)) return;

        this.props.component[this.props.property] = draggedItem;

        const input = event.currentTarget as HTMLInputElement;
        if(input.classList.contains("active")) {
            input.classList.remove("active");
        }

        if (this.props.onChanged) {
            this.props.onChanged(draggedItem)
        }

        event.preventDefault();
        event.stopPropagation();
    }

    private onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    private onDragEnter(event: DragEvent) {
        const draggedItem = ExtendedDataTransfer.data;
        if (!this.isValidDrop(draggedItem)) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        const input = event.currentTarget as HTMLInputElement;
        if(!input.classList.contains("active")) {
            input.classList.add("active");
        }
    }

    private onDragLeave(event: DragEvent) {
        const input = event.currentTarget as HTMLInputElement;
        if (input.classList.contains("active")) {
            input.classList.remove("active");
        }
    }

    public render() {
        return <div className="InspectorComponent">
            <span className="title">{this.props.title}</span>

            <div class="edit">
                <span class={`vec-label`} style={`background-color: #e67e2250; cursor: auto`}>{"◉"}</span>
                <input
                    className="input"
                    disabled
                    value={this.props.value}
                    onDragEnter={(event) => this.onDragEnter(event)}
                    onDragLeave={(event) => this.onDragLeave(event)}
                    onDrop={(event) => this.onDrop(event)}
                    onDragOver={(event) => this.onDragOver(event)}
                />
            </div>
        </div>
    }
}