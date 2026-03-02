import { createElement, Component } from "../../gooact";

import './InspectorComponent.css';

interface InspectorNumberProps {
    title: string;
    value: number;
    titleClass?: string;
    onChanged?: (value: number) => void;
};

interface InspectorNumberState {
    value: number;
}

export class InspectorNumber extends Component<InspectorNumberProps, InspectorNumberState> {
    constructor(props: InspectorNumberProps) {
        super(props);
        this.setState({value: this.props.value});
    }

    private onChanged(event: Event) {
        if (this.props.onChanged) {
            const input = event.currentTarget as HTMLInputElement;
            if (input.value == "") return;

            const value = parseFloat(input.value)

            this.props.onChanged(value);

            this.state.value = value;
            this.setState({value: this.state.value});
        }
    }

    private onClicked(event: MouseEvent) {
        const MouseMoveEvent = (event: MouseEvent) => {
            const delta = event.movementX;
            this.state.value += delta / 10;
            this.setState({value: this.state.value});
            this.props.onChanged(this.state.value);
            (event.currentTarget as HTMLElement).requestPointerLock();
        }
        
        const MouseUpEvent = (event: MouseEvent) => {
            document.body.removeEventListener("mousemove", MouseMoveEvent);
            document.body.removeEventListener("mouseup", MouseUpEvent);
            document.exitPointerLock();
        }

        document.body.addEventListener("mousemove", MouseMoveEvent);
        document.body.addEventListener("mouseup", MouseUpEvent);
    }

    public render() {
        return <div class="value">
            <span class={`vec-label ${this.props.titleClass}`} onMouseDown={(event) => { this.onClicked(event) }}>{this.props.title}</span>
            <input
                class="input vec-input"
                type="number"
                onChange={(event) => { this.onChanged(event) }}
                value={this.state.value.toPrecision(4)}
            />
        </div>
    }
}