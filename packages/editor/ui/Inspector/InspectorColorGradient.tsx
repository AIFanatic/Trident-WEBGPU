import { createElement, Component } from "../../gooact";
import { Mathf } from "@trident/core";

import './InspectorComponent.css';
import { InspectorNumber } from "./InspectorNumber";
import { InspectorColor } from "./InspectorColor";
import { Popup } from "./Popup";
import { InspectorProperty } from "./InspectorProperty";

interface Props {
    gradient: Mathf.Gradient;
    onChanged?: () => void;
}

interface Selected {
    type: "alpha" | "color";
    index: number;
}

interface State {
    selected: Selected | null;
    dragging: boolean;
    popupOpen: boolean;
}

const offsetPercent = (event: PointerEvent | MouseEvent): number => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
}

export class InspectorColorGradient extends Component<Props, State> {
    private _color: Mathf.Color;

    constructor(props: Props) {
        super(props);
        this.setState({ selected: null, dragging: false, popupOpen: false });
        window.addEventListener("pointerup", event => { this.setState({ ...this.state, dragging: false }) });
        this._color = new Mathf.Color();
    }

    private onPointerMove(type: "alpha" | "color", event: PointerEvent) {
        const selected = this.state.selected;
        if (!selected || !this.state.dragging || selected.type !== type) return;
        const t = offsetPercent(event);
        if (type === "alpha") {
            this.props.gradient.alphaKeys[selected.index].t = t;
            this.props.gradient.setAlphaKeys(this.props.gradient.alphaKeys);
        } else {
            this.props.gradient.colorKeys[selected.index].t = t;
            this.props.gradient.setColorKeys(this.props.gradient.colorKeys);
        }
        this.props.onChanged?.();
        this.setState({ ...this.state });
    }

    private addStop(type: "alpha" | "color", event: PointerEvent) {
        if (this.state.dragging) return;
        const t = offsetPercent(event);
        if (type === "alpha") this.props.gradient.addAlpha({ t, a: 1 });
        else this.props.gradient.addColor({ t, r: 1, g: 1, b: 1 });
        const index = (type === "alpha" ? this.props.gradient.alphaKeys : this.props.gradient.colorKeys).length - 1;
        this.props.onChanged?.();
        this.setState({ ...this.state, selected: { type, index }, dragging: true });
    }

    private deleteSelected() {
        const selected = this.state.selected;
        if (!selected) return;
        const keys = selected.type === "alpha" ? this.props.gradient.alphaKeys : this.props.gradient.colorKeys;
        if (keys.length <= 1) return;
        const filtered = keys.filter((_, i) => i !== selected.index);
        if (selected.type === "alpha") this.props.gradient.setAlphaKeys(filtered as any);
        else this.props.gradient.setColorKeys(filtered as any);
        this.props.onChanged?.();
        this.setState({ ...this.state, selected: null });
    }

    private getStopElementsForType(type: "alpha" | "color"): JSX.Element {
        const keys = type === "alpha" ? this.props.gradient.alphaKeys : this.props.gradient.colorKeys;
        return <div
            onPointerDown={(event: PointerEvent) => { this.addStop(type, event) }}
            onPointerMove={(event: PointerEvent) => { this.onPointerMove(type, event) }}
            class={type}
            style="position: relative; height: 10px; background: rgba(255, 255, 255, 0.5); border-radius: 3px;"
        >
            {keys.map((key: any, index: number) => {
                const selected = this.state.selected;
                const isSelected = selected?.type === type && selected.index === index;
                const background = type === "alpha" ? `rgba(255, 255, 255, ${key.a})` : `rgb(${key.r * 255}, ${key.g * 255}, ${key.b * 255})`;
                return <div
                    onPointerDown={(event: PointerEvent) => { event.stopPropagation(); this.setState({ ...this.state, selected: { type, index }, dragging: true }) }}
                    class="picker"
                    style={`width: 8px; height: 8px; background: ${background}; position: absolute; left: ${key.t * 100}%; transform: translateX(-50%); border: 1px solid ${isSelected ? "yellow" : "white"}; border-radius: 50%`}
                />;
            })}
        </div>;
    }

    private gradientCss() {
        const gradient = this.props.gradient;
        if (!gradient.colorKeys.length && !gradient.alphaKeys.length) return "black";

        const sample = (keys: any[], field: string, t: number, fallback: number) => {
            const sorted = [...keys].sort((a, b) => a.t - b.t);
            if (!sorted.length) return fallback;
            if (t <= sorted[0].t) return sorted[0][field];
            if (t >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1][field];
            for (let i = 0; i < sorted.length - 1; i++) {
                const a = sorted[i], b = sorted[i + 1];
                if (t >= a.t && t <= b.t) return a[field] + (b[field] - a[field]) * ((t - a.t) / (b.t - a.t));
            }
            return fallback;
        };

        const ts = Array.from(new Set([...gradient.colorKeys.map(k => k.t), ...gradient.alphaKeys.map(k => k.t)])).sort((a, b) => a - b);
        const stops = ts.map(t => {
            const r = sample(gradient.colorKeys, "r", t, 1);
            const g = sample(gradient.colorKeys, "g", t, 1);
            const b = sample(gradient.colorKeys, "b", t, 1);
            const a = sample(gradient.alphaKeys, "a", t, 1);
            return `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a}) ${(t * 100).toFixed(2)}%`;
        }).join(", ");

        return `linear-gradient(to right, ${stops}), repeating-conic-gradient(#666 0 25%, #333 0 50%) 50% / 10px 10px`;
    }

    public render() {
        const selected = this.state.selected;
        const gradient = this.props.gradient;
        const colorKey: any = selected?.type === "color" ? gradient.colorKeys[selected.index] : null;
        const alphaKey: any = selected?.type === "alpha" ? gradient.alphaKeys[selected.index] : null;
        const selectedKey = colorKey ?? alphaKey;
        if (colorKey) this._color.set(colorKey.r, colorKey.g, colorKey.b, 1);

        return <div class="color-gradient-picker" style="width: 100%">

            <div onClick={(event: Event) => { this.setState({ ...this.state, popupOpen: !this.state.popupOpen }) }} class="gradient" style={`cursor: pointer; height: 20px; border-radius: 3px; margin-top: 5px; margin-bottom: 5px; background: ${this.gradientCss()}`} />

            <div class="popup" style={`display: ${this.state.popupOpen ? "" : "none"}`}>
                {this.getStopElementsForType("alpha")}
                <div class="gradient" style={`height: 40px; border-radius: 3px; margin-top: 5px; margin-bottom: 5px; background: ${this.gradientCss()}`} />
                {this.getStopElementsForType("color")}

                <div class="settings" style="display: flex; align-items: center; gap: 4px;">
                    <InspectorNumber title="Location" value={selectedKey ? selectedKey.t * 100 : 0} step={0.1} min={0} max={100}
                        onChanged={(value: number) => {
                            if (!selected) return;
                            const t = Math.max(0, Math.min(1, value / 100));
                            if (selected.type === "alpha") {
                                gradient.alphaKeys[selected.index].t = t;
                                gradient.setAlphaKeys(gradient.alphaKeys);
                            } else {
                                gradient.colorKeys[selected.index].t = t;
                                gradient.setColorKeys(gradient.colorKeys);
                            }
                            this.props.onChanged?.();
                            this.setState({ ...this.state });
                        }} />
                    <button class="button" onClick={() => this.deleteSelected()}>Delete</button>
                </div>
                <div>
                    { colorKey ? <InspectorColor key={selected!.index} color={this._color} onChanged={c => Object.assign(gradient.colorKeys[selected!.index], { r: c.r, g: c.g, b: c.b })} /> : null}
                    { alphaKey ? <InspectorNumber min={0} max={1} step={0.01} title="A" value={alphaKey.a} onChanged={value => gradient.alphaKeys[selected!.index].a = value}/> : null }
                </div>
            </div>
        </div>;
    }
}