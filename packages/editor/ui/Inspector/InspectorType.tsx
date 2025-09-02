// import { ExtendedDataTransfer } from '../../helpers/ExtendedDataTransfer';
import { createElement, Component } from "../../gooact";
import './InspectorComponent.css';

export class Class {};

interface InspectorTypeProps {
    title: string;
    value: string;
    component: Class;
    property: string;
    onChanged?: (value: string) => void;
};

export class InspectorType extends Component<InspectorTypeProps> {
    constructor(props: InspectorTypeProps) {
        super(props);
    }

    private onDrop(event: DragEvent) {
        // const isValid = ExtendedDataTransfer.validate(this.props.component[this.props.property]);
        // if (!isValid) {
        //     ExtendedDataTransfer.remove(event);
        //     return;
        // }

        // console.log("onDrop", this.props)
        // const data = ExtendedDataTransfer.get();
        // this.props.component[this.props.property] = data;

        // const input = event.currentTarget as HTMLInputElement;
        // if(input.classList.contains("active")) {
        //     input.classList.remove("active");
        // }

        // ExtendedDataTransfer.remove(event);

        // if (this.props.onChanged) {
        //     const input = event.currentTarget as HTMLInputElement;
        //     this.props.onChanged(data)
        // }

        // event.preventDefault();
        // event.stopPropagation();
    }

    private onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    private onDragEnter(event: DragEvent) {
        // const isValid = ExtendedDataTransfer.validate(this.props.component[this.props.property]);
        // if (!isValid) {
        //     event.preventDefault();
        //     event.stopPropagation();
        //     return;
        // }

        // const input = event.currentTarget as HTMLInputElement;
        // if(!input.classList.contains("active")) {
        //     input.classList.add("active");
        // }
    }

    private onDragLeave(event: DragEvent) {
        const input = event.currentTarget as HTMLInputElement;
        if(input.classList.contains("active")) {
            input.classList.remove("active");
        }
    }

    public render() {
        return <div className="InspectorComponent">
            <span className="title">{this.props.title}</span>

            <input 
                className="input"
                disabled
                value={this.props.value}
                onDragEnter={(event) => this.onDragEnter(event)}
                onDragLeave={(event) => this.onDragLeave(event)}
                onDrop={(event) => this.onDrop(event)}
                onDragOver={(event) => this.onDragOver(event)}
            />

            <span
            style={{
                width: "15px",
                height: "15px",
                position: "relative",
                right: "10px",
                textAlign: "center"
            }}
            >o</span>
        </div>
    }
}