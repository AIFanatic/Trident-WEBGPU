import { GameObject } from "../../GameObject";
import { Component } from "../../components/Component";
import { DataBackedBuffer } from "../DataBackedBuffer";
export interface WaterSettings {
    wave_speed: [number, number, number, number];
    wave_a: [number, number, number, number];
    wave_b: [number, number, number, number];
    wave_c: [number, number, number, number];
    sampler_scale: [number, number, number, number];
    sampler_direction: [number, number, number, number];
    uv_sampler_scale: [number, number, number, number];
    uv_sampler_strength: [number, number, number, number];
    foam_level: [number, number, number, number];
    refraction: [number, number, number, number];
    color_deep: [number, number, number, number];
    color_shallow: [number, number, number, number];
    beers_law: [number, number, number, number];
    depth_offset: [number, number, number, number];
}
export declare class Water extends Component {
    settings: DataBackedBuffer<WaterSettings>;
    private static WaterRenderPass;
    private geometry;
    constructor(gameObject: GameObject);
}
//# sourceMappingURL=WaterPlugin.d.ts.map