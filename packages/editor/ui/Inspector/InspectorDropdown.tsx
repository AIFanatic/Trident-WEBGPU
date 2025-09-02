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
            this.props.onSelected(input.value)
        }
    }

    public render() {
        return <div className="InspectorComponent">
            <span className="title">{this.props.title}</span>
            <select
                style={{
                    fontSize: "12px",
                    background: "#121212",
                    borderRadius: "5px",
                    color: "white",
                    border: "none",
                    outline: "none",
                    width: "65%",
                    float: "right",
                    paddingTop: "2px",
                    paddingBottom: "2px",
                    marginRight: "10px"
                }}
                onChange={(event) => {this.onChanged(event)}}
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