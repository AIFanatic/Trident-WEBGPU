import { Component } from "./Component";
import { Quaternion, Vector3 } from "../math";
import { Transform } from "./Transform";
import { SerializeField } from "../utils/SerializeField";

export type AnimationPath = "translation" | "rotation" | "scale" | "weights";

export interface SerializedAnimationClipDef {
    name: string;
    duration: number;
}

export interface SerializedAnimationTrackClip {
    clipIndex: number;
    channels: SerializedAnimationChannel[];
}

export interface SerializedAnimationSampler {
    times: number[];
    values: number[];
    keyCount: number;
    compCount: number;
}

export interface SerializedAnimationChannel {
    path: AnimationPath;
    sampler: SerializedAnimationSampler;
}

export interface SerializedAnimationClip {
    name: string;
    duration: number;
    channels: SerializedAnimationChannel[];
}

export class AnimationTrack extends Component {
    public static type = "@trident/core/components/AnimationTrack";

    @SerializeField
    public clips: SerializedAnimationTrackClip[] = [];

    // O(1) lookup cache (built once)
    private _clipsByIndex: (SerializedAnimationTrackClip | null)[] | null = null;

    private ensureClipCache() {
        if (this._clipsByIndex) return;
        let max = -1;
        for (const c of this.clips) if (c.clipIndex > max) max = c.clipIndex;
        const arr = new Array(max + 1).fill(null);
        for (const c of this.clips) arr[c.clipIndex] = c;
        this._clipsByIndex = arr;
    }

    private getClip(clipIndex: number) {
        this.ensureClipCache();
        return this._clipsByIndex![clipIndex] ?? null;
    }

    private sampleSampler(sampler: SerializedAnimationSampler, t: number, out: Vector3 | Quaternion): Quaternion | Vector3 {
        const times = sampler.times;
        const lastT = times[sampler.keyCount - 1] ?? 0;
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
            const qa = sampler.values.slice(base0, base0 + 4);
            const qb = sampler.values.slice(base1, base1 + 4);
            const _qa = new Quaternion(...qa as any);
            const _qb = new Quaternion(...qb as any);
            out.copy(_qa).slerp(_qb, u);
        } else if (c === 3 && out instanceof Vector3) {
            const a = sampler.values.slice(base0, base0 + 3);
            const b = sampler.values.slice(base1, base1 + 3);
            const _a = new Vector3(...a as any);
            const _b = new Vector3(...b as any);
            out.copy(_a).lerp(_b, u);
        }
        return out;
    }

    public apply(clipIndex: number, time: number) {
        const clip = this.getClip(clipIndex);
        if (!clip) return;

        const tr = this.gameObject.transform;
        for (const ch of clip.channels) {
            if (ch.path === "translation") {
                this.sampleSampler(ch.sampler, time, tr.localPosition);
            } else if (ch.path === "scale") {
                this.sampleSampler(ch.sampler, time, tr.scale);
            } else if (ch.path === "rotation") {
                this.sampleSampler(ch.sampler, time, tr.localRotation).normalize();
            }
        }
    }

    public applyBlended(clipA: number, tA: number, clipB: number, tB: number, alpha: number) {
        const a = this.getClip(clipA);
        const b = this.getClip(clipB);
        if (!a && !b) return;

        // if only one clip exists on this track
        if (a && !b) return this.apply(clipA, tA);
        if (!a && b) return this.apply(clipB, tB);

        const tr = this.gameObject.transform;

        for (const chA of a.channels) {
            const chB = b.channels.find(ch => ch.path === chA.path);
            if (!chB) {
                // no matching channel: just apply A
                if (chA.path === "translation") this.sampleSampler(chA.sampler, tA, tr.localPosition);
                else if (chA.path === "scale") this.sampleSampler(chA.sampler, tA, tr.scale);
                else if (chA.path === "rotation") this.sampleSampler(chA.sampler, tA, tr.localRotation).normalize();
                continue;
            }

            if (chA.path === "translation") {
                const v0 = new Vector3();
                const v1 = new Vector3();
                this.sampleSampler(chA.sampler, tA, v0);
                this.sampleSampler(chB.sampler, tB, v1);
                tr.localPosition.copy(v0.lerp(v1, alpha));
            } else if (chA.path === "scale") {
                const v0 = new Vector3();
                const v1 = new Vector3();
                this.sampleSampler(chA.sampler, tA, v0);
                this.sampleSampler(chB.sampler, tB, v1);
                tr.scale.copy(v0.lerp(v1, alpha));
            } else if (chA.path === "rotation") {
                const q0 = new Quaternion();
                const q1 = new Quaternion();
                this.sampleSampler(chA.sampler, tA, q0);
                this.sampleSampler(chB.sampler, tB, q1);
                tr.localRotation.copy(q0.slerp(q1, alpha)).normalize();
            }
        }
    }
}

Component.Registry.set(AnimationTrack.type, AnimationTrack);

export class Animator extends Component {
    public static type = "@trident/core/components/Animator";

    @SerializeField
    public clips: SerializedAnimationClipDef[] = [];

    public clipIndex = 0;
    private playing = false;
    private previousTime = 0;

    private tracks: AnimationTrack[] = [];

    // blend state
    private currentTime = 0;
    private nextTime = 0;
    private fadeDuration = 0;
    private fadeTime = 0;
    private nextClipIndex: number | null = null;

    public Start(): void {
        this.previousTime = performance.now();
        this.tracks = [];
        this.collectTracks(this.gameObject.transform);
        this.playing = true;
    }

    private collectTracks(root: Transform) {
        const track = root.gameObject.GetComponent(AnimationTrack);
        if (track) this.tracks.push(track);
        for (const child of root.children) this.collectTracks(child);
    }

    public SetClipByIndex(i: number) {
        this.clipIndex = Math.max(0, i);
        this.currentTime = 0;
        this.nextClipIndex = null;
        this.fadeDuration = 0;
        this.fadeTime = 0;
        this.playing = true;
    }

    public CrossFadeTo(i: number, duration: number = 0.25) {
        this.nextClipIndex = Math.max(0, i);
        this.nextTime = 0;
        this.fadeDuration = Math.max(0.0001, duration);
        this.fadeTime = 0;
        this.playing = true;
    }

    public Update() {
        if (!this.playing) return;
        const now = performance.now();
        const dt = (now - this.previousTime) / 1000;
        this.previousTime = now;

        this.currentTime += dt;
        if (this.nextClipIndex !== null) {
            this.nextTime += dt;
            this.fadeTime += dt;
        }

        if (this.nextClipIndex === null) {
            for (const track of this.tracks) {
                track.apply(this.clipIndex, this.currentTime);
            }
        } else {
            const alpha = Math.min(1, this.fadeTime / this.fadeDuration);
            for (const track of this.tracks) {
                track.applyBlended(this.clipIndex, this.currentTime, this.nextClipIndex, this.nextTime, alpha);
            }
            if (alpha >= 1) {
                this.clipIndex = this.nextClipIndex;
                this.currentTime = this.nextTime;
                this.nextClipIndex = null;
                this.fadeDuration = 0;
                this.fadeTime = 0;
            }
        }
    }

    public GetClipIndexByName(name: string): number {
        if (!this.tracks.length) {
            this.tracks = [];
            this.collectTracks(this.gameObject.transform);
        }
        if (!this.clips.length) return -1;
        return this.clips.findIndex(c => c.name === name);
    }
}

Component.Registry.set(Animator.type, Animator);