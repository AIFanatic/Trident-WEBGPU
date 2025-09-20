import { Component } from "./Component";
import { Quaternion, Vector3 } from "../math";
import { Transform } from "./Transform";
import { SerializeField } from "../utils/SerializeField";

export type AnimationPath = "translation" | "rotation" | "scale" | "weights";

export interface AnimationSampler {
    times: Float32Array;    // keyframe times (sec)
    values: Float32Array;   // values (packed)
    keyCount: number;
    compCount: number;
}

interface AnimationChannel {
    sampler: AnimationSampler,
    targetTransform: Transform,
    path: AnimationPath,
}

export class AnimationClip {
    private name: string;
    public channels: AnimationChannel[];
    private duration: number;
    constructor(name: string, channels: AnimationChannel[], duration: number) {
        this.name = name;
        this.channels = channels;
        this.duration = duration;
    }
}

export class Animator extends Component {
    public clips: AnimationClip[];

    private playing: boolean;
    private clipIndex: number;
    private time: number;
    private previousTime: number;

    private _speed: number = 1;
    @SerializeField
    public get speed(): number { return this._speed; }
    public set speed(speed: number) { this._speed = speed }

    constructor(gameObject) {
        super(gameObject);
        this.clips = [];
        this.playing = false;
        this.clipIndex = 0;
        this.time = 0;
        this.speed = 1;
    }
    private CurrentClip() {
        return this.clips[this.clipIndex];
    }
    
    public SetClipByIndex(i) {
        this.clipIndex = Math.max(0, Math.min(i, this.clips.length - 1));
        this.time = 0;
        this.playing = true;
    }

    public Start(): void {
        this.previousTime = performance.now();
    }

    public Update() {
        const currentTime = performance.now();
        const dt = currentTime - this.previousTime;
        this.previousTime = currentTime;

        if (!this.playing || !this.CurrentClip()) return;

        this.time += (dt / 1000) * this._speed;
        this.apply(this.CurrentClip(), this.time);
    }
    
    private sampleSampler(sampler: AnimationSampler, t: number, out: Vector3 | Quaternion): Quaternion | Vector3 {
        const times = sampler.times;
        const lastT = times[sampler.keyCount - 1];
        const time = sampler.keyCount > 1 ? (t % lastT) : 0;
        let i1 = 0; while (i1 < sampler.keyCount && times[i1] < time) ++i1;
        if (i1 === 0) i1 = 1;
        if (i1 >= sampler.keyCount) i1 = sampler.keyCount - 1;
        const i0 = i1 - 1;
        const t0 = times[i0];
        const t1 = times[i1];
        const u = t1 > t0 ? (time - t0) / (t1 - t0) : 0;
        const c = sampler.compCount;
        const base0 = i0 * c;
        const base1 = i1 * c;
        if (c === 4 && out instanceof Quaternion) {
            const qa = sampler.values.subarray(base0, base0 + 4);
            const qb = sampler.values.subarray(base1, base1 + 4);
            const _qa = new Quaternion(...qa);
            const _qb = new Quaternion(...qb);
            out.copy(_qa).slerp(_qb, u);
        } else if (c === 3 && out instanceof Vector3) {
            const a = sampler.values.subarray(base0, base0 + 3);
            const b = sampler.values.subarray(base1, base1 + 3);
            const _a = new Vector3(...a);
            const _b = new Vector3(...b);
            out.copy(_a).lerp(_b, u);
        } else {
            throw Error("Not implemented");
            // for (let k = 0; k < out.length; ++k) {
            //     out[k] = lerp(sampler.values[base0 + k], sampler.values[base1 + k], u);
            // }
        }
        return out;
    }

    apply(clip: AnimationClip, time: number) {
        for (const ch of clip.channels) {
            switch (ch.path) {
                case 'translation': this.sampleSampler(ch.sampler, time, ch.targetTransform.position); break;
                case 'scale': this.sampleSampler(ch.sampler, time, ch.targetTransform.scale); break;
                case 'rotation': this.sampleSampler(ch.sampler, time, ch.targetTransform.rotation).normalize(); break;
                default: break;
            }
        }
    }
}