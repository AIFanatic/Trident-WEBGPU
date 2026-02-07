import { createElement, Component } from "../../gooact";

import { IVector3 } from "../../engine-api/trident/math/IVector3";

import './InspectorComponent.css';

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
        console.log(this.props.vector3)
    }

    private onChanged(property: ChangedProperty, event: Event) {
        if (this.props.onChanged) {
            const input = event.currentTarget as HTMLInputElement;
            if (input.value == "") return;
            const value = parseFloat(input.value);

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
                <div class="value">
                    <span class="vec-label red-bg" onMouseDown={(event) => {this.onClicked(ChangedProperty.X, event)}}>X</span>
                    <input 
                        class="input vec-input"
                        type="number"
                        onChange={(event) => {this.onChanged(ChangedProperty.X, event)}}
                        value={this.state.vector3.x.toPrecision(4)}
                    />
                </div>

                <div class="value">
                    <span class="vec-label green-bg" onMouseDown={(event) => {this.onClicked(ChangedProperty.Y, event)}}>Y</span>
                    <input
                        class="input vec-input"
                        type="number"
                        onChange={(event) => {this.onChanged(ChangedProperty.Y, event)}}
                        value={this.state.vector3.y.toPrecision(4)}
                    />
                </div>

                <div class="value">
                    <span class="vec-label blue-bg" onMouseDown={(event) => {this.onClicked(ChangedProperty.Z, event)}}>Z</span>
                    <input
                        class="input vec-input"
                        type="number"
                        onChange={(event) => {this.onChanged(ChangedProperty.Z, event)}}
                        value={this.state.vector3.z.toPrecision(4)}
                    />
                </div>
            </div>
        </div>
    }
}