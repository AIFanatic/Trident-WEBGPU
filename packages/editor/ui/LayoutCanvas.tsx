import { createElement, Component } from "../gooact";
import { BaseProps } from "./Layout";

export class LayoutCanvas extends Component<BaseProps> {

    private canvasRef(canvas: HTMLCanvasElement) {
        this.props.engineAPI.createRenderer(canvas);
    }

    render() {
        return (
            <canvas ref={(canvas) => this.canvasRef(canvas)}></canvas>
        );
    }
}