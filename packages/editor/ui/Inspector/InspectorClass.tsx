import { createElement, Component } from "../../gooact";
import { Collapsible } from "../Collapsible/Collapsible";

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
        return  <Collapsible header={this.props.title}>
            <div style={{paddingLeft: "10px"}}>
                {this.props.children}
            </div>
        </Collapsible>
    }
}