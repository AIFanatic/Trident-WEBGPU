import { createElement, Component } from "../../gooact";

import './InspectorComponent.css';
import { InspectorNumber } from "./InspectorNumber";

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

    private onChanged(value: string | number) {
        if (this.props.onChanged) {
            if (value == "") return;
            this.props.onChanged(value)
        }
    }

    public render() {
        return <div className="InspectorComponent">
            <span className="title">{this.props.title}</span>

            <div class="edit">

                <InspectorNumber title="N" titleClass="gray-bg" value={this.props.value} onChanged={value => { this.onChanged(value) }} />
            </div>
        </div>
    }
}