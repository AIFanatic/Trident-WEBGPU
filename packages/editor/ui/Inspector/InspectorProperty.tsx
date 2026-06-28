import { createElement, Component } from "../../gooact";

import './InspectorComponent.css';

interface InspectorPropertyProps {
    title: string;
    stacked?: boolean;
};

export class InspectorProperty extends Component<InspectorPropertyProps> {
    constructor(props: InspectorPropertyProps) {
        super(props);
    }

    public render() {
        return <div className={this.props.stacked ? "InspectorComponent stacked" : "InspectorComponent"}>
            <span className="title">{this.props.title}</span>
            {this.props.children}
        </div>;
    }
}