import { createElement, Component } from "../../gooact";

import './InspectorComponent.css';

import { IColor } from "../../engine-api/trident/math/IColor";

// interface InspectorColorProps {
//     title: string;
//     color: IColor;
//     onChanged?: (value: IColor) => void;
// };

// interface InspectorColorState {
// };

// export class InspectorColor extends Component<InspectorColorProps, InspectorColorState> {
//     // constructor(props: InspectorColorProps) {
//     //     super(props);
//     // }

//     // private onChanged(event: React.ChangeEvent<HTMLInputElement>) {
//     //     if (this.props.onChanged) {
//     //         const input = event.currentTarget as HTMLInputElement;
//     //         const color = new IColor(input.value);
//     //         this.props.onChanged(color);
//     //     }
//     // }

//     // public render() {
//     //     let title;
//     //     if (this.props.title != "") {
//     //         title = <div className="title">
//     //             {this.props.title}
//     //         </div>
//     //     }
//     //     return <div className="InspectorComponent">
//     //         {title}

//     //         <input
//     //             className="input"
//     //             type="color"
//     //             onChange={(event) => {this.onChanged(event)}}
//     //             value={`#${this.props.color.getHexString()}`}
//     //         />
//     //     </div>
//     // }
// }

interface InspectorColorProps {
    title: string;
    color: IColor;
    onChanged?: (value: IColor) => void;
};

interface InspectorColorState {
    color: IColor;
};

export class InspectorColor extends Component<InspectorColorProps, InspectorColorState> {
    constructor(props: InspectorColorProps) {
        super(props);

        this.state = {color: this.props.color.clone()};
    }

    private onChanged(event: Event) {
        if (this.props.onChanged) {
            const input = event.currentTarget as HTMLInputElement;
            this.state.color.setFromHex(input.value);
            this.props.onChanged(this.state.color);
        }
    }

    public render() {
        return <div className="InspectorComponent">
        <span className="title">{this.props.title}</span>

            <input
                className="input"
                type="color"
                onChange={(event) => {this.onChanged(event)}}
                value={`#${this.state.color.toHex()}`}
            />
        </div>
    }
}