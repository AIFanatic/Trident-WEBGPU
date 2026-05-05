import { createElement, Component } from "../gooact";
import { BaseProps } from "./Layout";

import { RuntimeEvents } from "../Events";
import { TridentAPI } from "../engine-api/trident/TridentAPI";

export class LayoutCanvas extends Component<BaseProps> {

    private async canvasRef(canvas: HTMLCanvasElement) {
        TridentAPI.EventSystem.emit(RuntimeEvents.CreatedCanvas, canvas);
    }

    render() {
        return (<canvas ref={(canvas: HTMLCanvasElement) => this.canvasRef(canvas)}></canvas>);
    }
}