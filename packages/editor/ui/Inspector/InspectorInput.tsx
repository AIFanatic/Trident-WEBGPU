import { createElement, Component } from "../../gooact";

import './InspectorComponent.css';
import { InspectorNumber } from "./InspectorNumber";

export interface InspectorInputProps {
    title: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChanged?: (value: string) => void;
};

export class InspectorInput extends Component<InspectorInputProps> {
    constructor(props: InspectorInputProps) {
        super(props);
    }

    private onChanged(value: string | number) {
        if (this.props.onChanged) {
            if (value === "") return;
            this.props.onChanged(value)
        }
    }

    public render() {
        return <div className="InspectorComponent">
            <span className="title">{this.props.title}</span>

            <div class="edit">
                <InspectorNumber step={this.props.step} min={this.props.min} max={this.props.max} title="N" titleClass="gray-bg" value={this.props.value} onChanged={value => { this.onChanged(value) }} />
            </div>
        </div>
    }
}