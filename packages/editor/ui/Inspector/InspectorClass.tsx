import { createElement, Component } from "../../gooact";

import './InspectorComponent.css';

interface InspectorClassProps {
    onChanged?: (value: string) => void;
};

export class InspectorClass extends Component<InspectorClassProps> {
    constructor(props: InspectorClassProps) {
        super(props);
    }

    public render() {
        return <div style={{ paddingLeft: "10px" }}>
            {this.props.children}
        </div>
    }
}