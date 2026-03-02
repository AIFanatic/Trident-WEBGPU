import { createElement, Component } from "../../gooact";

import { IVector3 } from "../../engine-api/trident/math/IVector3";

import './InspectorComponent.css';
import { InspectorNumber } from "./InspectorNumber";

interface InspectorVector3Props {
    title: string;
    vector3: IVector3;
    onChanged?: (value: IVector3) => void;
    key: string;
};

interface InspectorVector3State {
    vector3: IVector3;
}

enum ChangedProperty {
    X,
    Y,
    Z
};

export class InspectorVector3 extends Component<InspectorVector3Props, InspectorVector3State> {
    constructor(props: InspectorVector3Props) {
        super(props);
        // this.state = {vector3: this.props.vector3.clone()};
        this.setState({vector3: this.props.vector3});
    }

    private onChanged(property: ChangedProperty, _value) {
        if (this.props.onChanged) {
            if (_value == "") return;
            const value = parseFloat(_value);

            if (property == ChangedProperty.X) this.state.vector3.x = value;
            else if (property == ChangedProperty.Y) this.state.vector3.y = value;
            else if (property == ChangedProperty.Z) this.state.vector3.z = value;

            this.props.onChanged(this.state.vector3);
        }
    }
      
    private Vector3Equals(v1: IVector3, v2: IVector3, epsilon = Number.EPSILON ) {
        return ( ( Math.abs( v1.x - v2.x ) < epsilon ) && ( Math.abs( v1.y - v2.y ) < epsilon ) && ( Math.abs( v1.z - v2.z ) < epsilon ) );
    }

    public componentDidUpdate() {
        if (!this.Vector3Equals(this.props.vector3, this.state.vector3)) {
            this.setState({vector3: this.props.vector3});
        }
    }

    private onClicked(property: ChangedProperty, event: MouseEvent) {
        event.preventDefault();
        const MouseMoveEvent = (event: MouseEvent) => {
            const delta = event.movementX;
            if (property === ChangedProperty.X) this.state.vector3.x += delta / 10;
            if (property === ChangedProperty.Y) this.state.vector3.y += delta / 10;
            if (property === ChangedProperty.Z) this.state.vector3.z += delta / 10;
            this.setState({vector3: this.props.vector3});
        }
        
        const MouseUpEvent = (event: MouseEvent) => {
            document.body.removeEventListener("mousemove", MouseMoveEvent);
            document.body.removeEventListener("mouseup", MouseUpEvent);
        }

        document.body.addEventListener("mousemove", MouseMoveEvent);
        document.body.addEventListener("mouseup", MouseUpEvent);
    }

    public render() {
        return <div class="InspectorComponent">
            <span class="title">{this.props.title}</span>

            <div class="edit">
                <InspectorNumber title="X" titleClass="red-bg" value={this.state.vector3.x} onChanged={value => {this.onChanged(ChangedProperty.X, value)}} />
                <InspectorNumber title="Y" titleClass="green-bg" value={this.state.vector3.y} onChanged={value => {this.onChanged(ChangedProperty.Y, value)}} />
                <InspectorNumber title="Z" titleClass="blue-bg" value={this.state.vector3.z} onChanged={value => {this.onChanged(ChangedProperty.Z, value)}} />
            </div>
        </div>
    }
}