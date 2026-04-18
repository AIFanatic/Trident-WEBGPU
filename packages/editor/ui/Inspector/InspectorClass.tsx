import { createElement, Component } from "../../gooact";

import './InspectorComponent.css';

interface InspectorClassProps {
    title: string;
    onChanged?: (value: string) => void;
};

export class InspectorClass extends Component<InspectorClassProps> {
    constructor(props: InspectorClassProps) {
        super(props);
    }

    public render() {
        return <div className="InspectorComponent" style={{display: "block"}}>
        <span className="title">{this.props.title}</span>

            <div style={{paddingLeft: "10px"}}>
                {this.props.children}
            </div>
        </div>
    }
}