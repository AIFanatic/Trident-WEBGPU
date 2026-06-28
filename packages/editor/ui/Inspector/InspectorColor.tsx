import { createElement, Component } from "../../gooact";
import { IColor } from "../../engine-api/trident/math/IColor";

import './InspectorComponent.css';
import { InspectorNumber } from "./InspectorNumber";
import { Mathf } from "@trident/core";
import { Popup } from "./Popup";

interface Props {
    color: IColor;
    onChanged?: (value: IColor) => void;
}

interface State {
    hue: number;
    alpha: number;
    sx: number;
    sy: number;
    popupOpen: boolean;
}

const format = (v: number) => Math.round(v * 255);
const cssRGB = (c: { r: number, g: number, b: number }) => `rgb(${format(c.r)}, ${format(c.g)}, ${format(c.b)})`;
const cssRGBA = (c: { r: number, g: number, b: number, a: number }) => `rgba(${format(c.r)}, ${format(c.g)}, ${format(c.b)}, ${c.a})`;

export class InspectorColor extends Component<Props, State> {
    private dragging = false;

    constructor(props: Props) {
        super(props);
        const hsv = Mathf.Color.RGBToHSV(props.color.r, props.color.g, props.color.b);
        this.setState({ hue: hsv.h ?? 0, alpha: props.color.a, sx: hsv.s ?? 0, sy: 1 - (hsv.v ?? 1), popupOpen: false});
        window.addEventListener("pointerup", () => { this.dragging = false; });
    }

    private currentColor() {
        const { hue, sx, sy, alpha } = this.state;
        const c = Mathf.Color.HSVToRGB(hue, sx, 1 - sy);
        return { r: c.r, g: c.g, b: c.b, a: alpha };
    }

    private commit() {
        const c = this.currentColor();
        this.props.color.r = c.r;
        this.props.color.g = c.g;
        this.props.color.b = c.b;
        this.props.color.a = c.a;
        if (this.props.onChanged) this.props.onChanged(this.props.color);
    }

    private onChannel(channel: "R" | "G" | "B" | "A", value: number) {
        const c = this.props.color;
        if (channel === "R") c.r = value;
        if (channel === "G") c.g = value;
        if (channel === "B") c.b = value;
        if (channel === "A") c.a = value;
        const hsv = Mathf.Color.RGBToHSV(c.r, c.g, c.b);
        this.setState({ hue: hsv.h ?? this.state.hue, sx: hsv.s ?? 0, sy: 1 - (hsv.v ?? 1), alpha: c.a });
        if (this.props.onChanged) this.props.onChanged(c);
    }

    private pickFromEvent(event: PointerEvent) {
        if (!this.dragging) return;
        const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
        const sx = Mathf.Clamp((event.clientX - rect.left) / rect.width, 0, 1);
        const sy = Mathf.Clamp((event.clientY - rect.top) / rect.height, 0, 1);
        this.setState({ ...this.state, sx, sy });
        this.commit();
    }

    public render() {
        const { hue, sx, sy, alpha } = this.state;
        const cur = this.currentColor();
        const hueColor = Mathf.Color.HSVToRGB(hue, 1, 1);

        return <div class="color-picker">
            <div onClick={(event: Event) => { this.setState({...this.state, popupOpen: !this.state.popupOpen}) }} class="color-preview" style={`background: ${cssRGBA(cur)}; width: 100%; height: 20px; border-radius: 5px; cursor:pointer`}></div>
            <div class="popup" style={`display: ${this.state.popupOpen ? "" : "none"}`}>
                <div class="color-picker">
                    <div class="color-canvas"
                        style={`background: linear-gradient(transparent 0%, rgb(0,0,0) 100%), linear-gradient(to left, transparent 0%, rgb(255,255,255) 100%), ${cssRGB(hueColor)}`}
                        onPointerDown={(e: PointerEvent) => { this.dragging = true; this.pickFromEvent(e); }}
                        onPointerMove={(e: PointerEvent) => this.pickFromEvent(e)}
                    >
                        <div class="color-canvas-picker" style={`left: ${sx * 100}%; top: ${sy * 100}%`}></div>
                    </div>

                    <div class="range-container">
                        <div class="color-preview" style={`background: ${cssRGBA(cur)}`}></div>
                        <div class="hue-alpha-container">
                            <input class="range hue" type="range" min="0" max="360" step="0.1" value={hue} onInput={(e: any) => { this.setState({ ...this.state, hue: parseFloat(e.target.value) }); this.commit(); }} />
                            <input class="range alpha" type="range" min="0" max="1" step="0.01" value={alpha} onInput={(e: any) => { this.setState({ ...this.state, alpha: parseFloat(e.target.value) }); this.commit(); }} />
                        </div>
                    </div>

                    <div class="rgb-picker-container">
                        <InspectorNumber title="R" titleClass="red-bg" value={cur.r} step={0.01} min={0} max={1} onChanged={value => this.onChannel("R", value)} />
                        <InspectorNumber title="G" titleClass="green-bg" value={cur.g} step={0.01} min={0} max={1} onChanged={value => this.onChannel("G", value)} />
                        <InspectorNumber title="B" titleClass="blue-bg" value={cur.b} step={0.01} min={0} max={1} onChanged={value => this.onChannel("B", value)} />
                        <InspectorNumber title="A" titleClass="gray-bg" value={cur.a} step={0.01} min={0} max={1} onChanged={value => this.onChannel("A", value)} />
                    </div>
                </div>
            </div>
        </div>
    }
}