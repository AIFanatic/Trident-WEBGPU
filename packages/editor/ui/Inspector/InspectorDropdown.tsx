import { createElement, Component } from "../../gooact";

import './InspectorComponent.css';

export interface InspectorDropdownOptions {
    text: string;
    value: string;
}

interface InspectorDropdownProps {
    title: string;
    options: InspectorDropdownOptions[];
    selected?: string;
    onSelected?: (option: string) => void
};

export class InspectorDropdown extends Component<InspectorDropdownProps> {
    constructor(props: InspectorDropdownProps) {
        super(props);
    }

    private onChanged(event: Event) {
        if (this.props.onSelected) {
            const input = event.currentTarget as HTMLSelectElement;

            let value: any = input.value;

            if (typeof this.props.selected === "number") {
                value = Number(value);
            }

            this.props.onSelected(value);
        }
    }

    public render() {
        return <div className="InspectorComponent">
            <span className="title">{this.props.title}</span>
            <select
                style={{ marginRight: "5px" }}
                class="input"
                onChange={(event) => { this.onChanged(event) }}
                value={this.props.selected}
            >
                {this.props.options.map((value) => {
                    const key = this.props.title + "-" + value.text;
                    return <option key={key} value={value.value}>{value.text}</option>
                })}
            </select>
        </div>
    }
}