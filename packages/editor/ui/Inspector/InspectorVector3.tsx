import { createElement, Component } from "../../gooact";

import { IVector3 } from "../../engine-api/trident/math/IVector3";

import './InspectorComponent.css';

interface InspectorVector3Props {
    title: string;
    vector3: IVector3
    onChanged?: (value: IVector3) => void;
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
        this.state = {vector3: this.props.vector3.clone()};
    }

    private onChanged(property: ChangedProperty, event: Event) {
        if (this.props.onChanged) {
            const input = event.currentTarget as HTMLInputElement;
            if (input.value == "") return;
            const value = parseFloat(input.value);

            if (property == ChangedProperty.X) this.state.vector3.x = value;
            else if (property == ChangedProperty.Y) this.state.vector3.y = value;
            else if (property == ChangedProperty.Z) this.state.vector3.z = value;

            this.props.onChanged(this.state.vector3)
        }
    }
      
    private Vector3Equals(v1: IVector3, v2: IVector3, epsilon = Number.EPSILON ) {
        return ( ( Math.abs( v1.x - v2.x ) < epsilon ) && ( Math.abs( v1.y - v2.y ) < epsilon ) && ( Math.abs( v1.z - v2.z ) < epsilon ) );
    }

    public componentDidUpdate() {
        if (!this.Vector3Equals(this.props.vector3, this.state.vector3)) {
            this.setState({vector3: this.props.vector3.clone()});
        }
    }

    public render() {
        return <div className="InspectorComponent">
            <span className="title">{this.props.title}</span>

            <div style={{
                width: "22%",
                display: "flex",
                alignItems: "center"
            }}>
                <span style={{
                    fontSize: "12px",
                }}>X</span>
                <input 
                    className="input input-vector3"
                    type="number"
                    onChange={(event) => {this.onChanged(ChangedProperty.X, event)}}
                    value={this.state.vector3.x}
                />
            </div>

            <div style={{
                width: "22%",
                display: "flex",
                alignItems: "center"
            }}>
                <span style={{
                    fontSize: "12px",
                }}>Y</span>
                <input
                    className="input input-vector3"
                    type="number"
                    onChange={(event) => {this.onChanged(ChangedProperty.Y, event)}}
                    value={this.state.vector3.y}
                />
            </div>

            <div style={{
                width: "22%",
                display: "flex",
                alignItems: "center"
            }}>
                <span style={{
                    fontSize: "12px",
                }}>Z</span>
                <input
                    className="input input-vector3"
                    type="number"
                    onChange={(event) => {this.onChanged(ChangedProperty.Z, event)}}
                    value={this.state.vector3.z}
                />
            </div>
        </div>
    }
}