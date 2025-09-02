import { createElement, Component } from "../../gooact";

import './InspectorComponent.css';

interface InspectorInputProps {
    title: string;
    value: string | number;
    type?: "number" | "text";
    onChanged?: (value: string) => void;
};

export class InspectorInput extends Component<InspectorInputProps> {
    constructor(props: InspectorInputProps) {
        super(props);
    }

    private onChanged(event: Event) {
        if (this.props.onChanged) {
            const input = event.currentTarget as HTMLInputElement;
            if (input.value == "") return;
            this.props.onChanged(input.value)
        }
    }

    public render() {
        return <div className="InspectorComponent">
            <span className="title">{this.props.title}</span>

            <input
                className="input"
                type={this.props.type ? this.props.type : "text"}
                onChange={(event) => {this.onChanged(event)}}
                value={this.props.value}
            />
        </div>
    }
}