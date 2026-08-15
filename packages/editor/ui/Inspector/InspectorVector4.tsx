import { createElement, Component } from "../../gooact";

import { IVector4 } from "../../engine-api/trident/math/IVector4";

import './InspectorComponent.css';
import { InspectorNumber } from "./InspectorNumber";

interface InspectorVector4Props {
    vector4: IVector4;
    onChanged?: (value: IVector4) => void;
};

enum ChangedProperty {
    X,
    Y,
    Z,
    W
};

export class InspectorVector4 extends Component<InspectorVector4Props> {
    constructor(props: InspectorVector4Props) {
        super(props);
    }

    private onChanged(property: ChangedProperty, _value) {
        if (this.props.onChanged) {
            if (_value === "") return;
            const value = parseFloat(_value);

            if (property == ChangedProperty.X) this.props.vector4.x = value;
            else if (property == ChangedProperty.Y) this.props.vector4.y = value;
            else if (property == ChangedProperty.Z) this.props.vector4.z = value;
            else if (property == ChangedProperty.W) this.props.vector4.w = value;

            this.props.onChanged(this.props.vector4);
        }
    }

    // TODO: InspectorComponent should be vector4, need to update CSS
    public render() {
        return <div class="InspectorComponent">
            <InspectorNumber title="X" titleClass="red-bg" value={this.props.vector4.x} onChanged={value => { this.onChanged(ChangedProperty.X, value) }} />
            <InspectorNumber title="Y" titleClass="green-bg" value={this.props.vector4.y} onChanged={value => { this.onChanged(ChangedProperty.Y, value) }} />
            <InspectorNumber title="Z" titleClass="blue-bg" value={this.props.vector4.z} onChanged={value => { this.onChanged(ChangedProperty.Z, value) }} />
            <InspectorNumber title="W" titleClass="gray-bg" value={this.props.vector4.z} onChanged={value => { this.onChanged(ChangedProperty.W, value) }} />
        </div>
    }
}