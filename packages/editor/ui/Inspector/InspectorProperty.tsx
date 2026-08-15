import { createElement, Component, VNodeChild } from "../../gooact";

import './InspectorComponent.css';

export interface InspectorPropertyProps {
    title: string;
    stacked?: boolean;
    children?: VNodeChild[];
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