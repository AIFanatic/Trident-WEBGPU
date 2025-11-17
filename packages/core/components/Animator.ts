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
    public name: string;
    public channels: AnimationChannel[];
    private duration: number;
    constructor(name: string, channels: AnimationChannel[], duration: number) {
        this.name = name;
        this.channels = channels;
        this.duration = duration;
    }
}
// --- new helper type ---
class AnimationState {
    public clip: AnimationClip;
    public time: number = 0;
    public speed: number = 1;
    constructor(clip: AnimationClip, speed = 1) {
        this.clip = clip;
        this.speed = speed;
    }
}

export class Animator extends Component {
    public clips: AnimationClip[];

    private playing: boolean;
    public clipIndex: number;

    private previousTime: number;

    // --- blending state ---
    private current?: AnimationState;
    private next?: AnimationState;
    private fadeDuration: number = 0;
    private fadeTime: number = 0;

    constructor(gameObject) {
        super(gameObject);
        this.clips = [];
        this.playing = false;
        this.clipIndex = 0;
    }

    public SetClipByIndex(i: number, speed = 1) {
        this.clipIndex = Math.max(0, Math.min(i, this.clips.length - 1));
        const clip = this.clips[this.clipIndex];
        this.current = clip ? new AnimationState(clip, speed) : undefined;
        this.next = undefined;
        this.fadeDuration = 0;
        this.fadeTime = 0;
        this.playing = true;
    }

    // Start a crossfade into another clip over `duration` seconds
    public CrossFadeTo(i: number, duration: number = 0.25, speed = 1) {
        if (this.clips.length === 0) return;
        const targetIdx = Math.max(0, Math.min(i, this.clips.length - 1));
        const target = this.clips[targetIdx];
        if (!target) return;

        if (!this.current) {
            // nothing playing yet: just start it
            this.SetClipByIndex(targetIdx);
            return;
        }

        this.next = new AnimationState(target, speed);
        this.fadeDuration = Math.max(0.0001, duration);
        this.fadeTime = 0;
        this.playing = true;
    }

    public Start(): void {
        this.previousTime = performance.now();
    }

    public Update() {
        const now = performance.now();
        const dt = (now - this.previousTime) / 1000;
        this.previousTime = now;

        if (!this.playing || !this.current) return;

        // advance times
        this.current.time += dt * (this.current.speed);
        if (this.next) {
            this.next.time += dt * (this.next.speed);
            this.fadeTime += dt;
        }

        // apply poses
        if (!this.next) {
            // no blend
            this.apply(this.current.clip, this.current.time);
        } else {
            const alpha = Math.min(1, this.fadeTime / this.fadeDuration);
            this.applyBlended(this.current.clip, this.current.time, this.next.clip, this.next.time, alpha);

            // finish blend
            if (alpha >= 1) {
                this.current = this.next;
                this.next = undefined;
                this.fadeDuration = 0;
                this.fadeTime = 0;
            }
        }
    }

    // unchanged sampler
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
        }
        return out;
    }

    // find a channel in `clip` matching the same target transform & path
    private findChannel(clip: AnimationClip, target: Transform, path: AnimationPath) {
        // You could hash on IDs if your Transform has them; this simple version compares object identity.
        return clip.channels.find(ch => ch.targetTransform === target && ch.path === path);
    }

    // original apply (no blend)
    apply(clip: AnimationClip, time: number) {
        for (const ch of clip.channels) {
            switch (ch.path) {
                case 'translation': this.sampleSampler(ch.sampler, time, ch.targetTransform.position); break;
                case 'scale':       this.sampleSampler(ch.sampler, time, ch.targetTransform.scale); break;
                case 'rotation':    this.sampleSampler(ch.sampler, time, ch.targetTransform.rotation).normalize(); break;
                default: break;
            }
        }
    }

    // blended apply between two clips at times tA/tB and factor alpha
    private applyBlended(clipA: AnimationClip, tA: number, clipB: AnimationClip, tB: number, alpha: number) {
        // Iterate over union of targets/paths from A and B.
        // We’ll iterate A, then handle any extra channels from B that weren’t in A.
        const visited = new Set<AnimationChannel>();

        // temp holders to avoid allocations
        const tmpV0 = new Vector3();
        const tmpV1 = new Vector3();
        const tmpQ0 = new Quaternion();
        const tmpQ1 = new Quaternion();

        for (const chA of clipA.channels) {
            visited.add(chA);
            const chB = this.findChannel(clipB, chA.targetTransform, chA.path);
            const tr = chA.targetTransform;

            if (chA.path === 'translation') {
                this.sampleSampler(chA.sampler, tA, tmpV0);
                if (chB) this.sampleSampler(chB.sampler, tB, tmpV1);
                tr.position.copy(chB ? tmpV0.lerp(tmpV1, alpha) : tmpV0);
            } else if (chA.path === 'scale') {
                this.sampleSampler(chA.sampler, tA, tmpV0);
                if (chB) this.sampleSampler(chB.sampler, tB, tmpV1);
                tr.scale.copy(chB ? tmpV0.lerp(tmpV1, alpha) : tmpV0);
            } else if (chA.path === 'rotation') {
                this.sampleSampler(chA.sampler, tA, tmpQ0);
                if (chB) this.sampleSampler(chB.sampler, tB, tmpQ1);
                tr.rotation.copy(chB ? tmpQ0.slerp(tmpQ1, alpha) : tmpQ0).normalize();
            }
        }

        // Channels that exist only in B
        for (const chB of clipB.channels) {
            // "visited" is by object; we must check if there's any A-channel matching B's target/path.
            const chA = this.findChannel(clipA, chB.targetTransform, chB.path);
            if (chA) continue; // already blended above

            const tr = chB.targetTransform;
            if (chB.path === 'translation') {
                this.sampleSampler(chB.sampler, tB, tmpV1);
                // Blend from current transform (what A left there) to B — or just snap toward B:
                tr.position.lerp(tmpV1, alpha);
            } else if (chB.path === 'scale') {
                this.sampleSampler(chB.sampler, tB, tmpV1);
                tr.scale.lerp(tmpV1, alpha);
            } else if (chB.path === 'rotation') {
                this.sampleSampler(chB.sampler, tB, tmpQ1);
                tr.rotation.slerp(tmpQ1, alpha).normalize();
            }
        }
    }
}
