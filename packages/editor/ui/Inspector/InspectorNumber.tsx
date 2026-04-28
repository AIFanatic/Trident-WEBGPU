import { createElement, Component } from "../../gooact";

import './InspectorComponent.css';

export interface InspectorNumberProps {
    title: string;
    value: number;
    titleClass?: string;
    min?: number;
    max?: number;
    step?: number;
    onChanged?: (value: number) => void;
};

interface InspectorNumberState {
    value: number;
}

export class InspectorNumber extends Component<InspectorNumberProps, InspectorNumberState> {
    constructor(props: InspectorNumberProps) {
        super(props);
        this.setState({ value: this.props.value });
    }

    private clampAndSnap(value: number): number {
        if (this.props.step !== undefined && this.props.step > 0) {
            value = Math.round(value / this.props.step) * this.props.step;
        }

        if (this.props.min !== undefined) value = Math.max(this.props.min, value);
        if (this.props.max !== undefined) value = Math.min(this.props.max, value);

        return value;
    }

    private onChanged(event: Event) {
        if (this.props.onChanged) {
            const input = event.currentTarget as HTMLInputElement;
            if (input.value == "") return;

            let value = parseFloat(input.value);
            value = this.clampAndSnap(value);

            this.props.onChanged(value);
            this.setState({ value: value });
        }
    }

    private onClicked(event: MouseEvent) {
        let dragValue = this.state.value;

        const MouseMoveEvent = (event: MouseEvent) => {
            const delta = event.movementX;
            const speed = this.props.step !== undefined ? this.props.step / 10 : 0.1;

            dragValue += delta * speed;

            const value = this.clampAndSnap(dragValue);
            this.setState({ value });
            this.props.onChanged?.(value);

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
                min={this.props.min}
                max={this.props.max}
                step={this.props.step}
                onChange={(event) => { this.onChanged(event) }}
                value={this.state.value.toPrecision(4)}
            />
        </div>
    }
}