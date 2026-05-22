import { createElement, Component } from "../../gooact";

import { IVector2 } from "../../engine-api/trident/math/IVector2";

import './InspectorComponent.css';
import { InspectorNumber } from "./InspectorNumber";

interface InspectorVector2Props {
    title: string;
    vector2: IVector2;
    onChanged?: (value: IVector2) => void;
};

enum ChangedProperty {
    X,
    Y,
};

export class InspectorVector2 extends Component<InspectorVector2Props> {
    constructor(props: InspectorVector2Props) {
        super(props);
    }

    private onChanged(property: ChangedProperty, _value) {
        if (this.props.onChanged) {
            if (_value === "") return;
            const value = parseFloat(_value);
            
            if (property == ChangedProperty.X) this.props.vector2.x = value;
            else if (property == ChangedProperty.Y) this.props.vector2.y = value;
            
            this.props.onChanged(this.props.vector2);
        }
    }
      
    public render() {
        return <div class="InspectorComponent">
            <span class="title">{this.props.title}</span>

            <div class="edit">
                <InspectorNumber title="X" titleClass="red-bg" value={this.props.vector2.x} onChanged={value => {this.onChanged(ChangedProperty.X, value)}} />
                <InspectorNumber title="Y" titleClass="green-bg" value={this.props.vector2.y} onChanged={value => {this.onChanged(ChangedProperty.Y, value)}} />
            </div>
        </div>
    }
}