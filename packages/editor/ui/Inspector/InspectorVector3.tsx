import { createElement, Component } from "../../gooact";

import { IVector3 } from "../../engine-api/trident/math/IVector3";

import './InspectorComponent.css';
import { InspectorNumber } from "./InspectorNumber";

interface InspectorVector3Props {
    vector3: IVector3;
    onChanged?: (value: IVector3) => void;
};

enum ChangedProperty {
    X,
    Y,
    Z
};

export class InspectorVector3 extends Component<InspectorVector3Props> {
    constructor(props: InspectorVector3Props) {
        super(props);
    }

    private onChanged(property: ChangedProperty, _value) {
        if (this.props.onChanged) {
            if (_value === "") return;
            const value = parseFloat(_value);

            if (property == ChangedProperty.X) this.props.vector3.x = value;
            else if (property == ChangedProperty.Y) this.props.vector3.y = value;
            else if (property == ChangedProperty.Z) this.props.vector3.z = value;

            this.props.onChanged(this.props.vector3);
        }
    }

    // TODO: InspectorComponent should be vector3, need to update CSS
    public render() {
        return <div class="InspectorComponent">
            <InspectorNumber title="X" titleClass="red-bg" value={this.props.vector3.x} onChanged={value => { this.onChanged(ChangedProperty.X, value) }} />
            <InspectorNumber title="Y" titleClass="green-bg" value={this.props.vector3.y} onChanged={value => { this.onChanged(ChangedProperty.Y, value) }} />
            <InspectorNumber title="Z" titleClass="blue-bg" value={this.props.vector3.z} onChanged={value => { this.onChanged(ChangedProperty.Z, value) }} />
        </div>
    }
}