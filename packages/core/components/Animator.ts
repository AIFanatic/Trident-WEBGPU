import { Component } from "./Component";
import { Quaternion, Vector3 } from "../math";
import { Transform } from "./Transform";
import { SerializeField } from "../utils/SerializeField";

export type AnimationPath = "translation" | "rotation" | "scale" | "weights";

export interface SerializedAnimationClip {
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

export class AnimationTrack extends Component {
    public static type = "@trident/core/components/AnimationTrack";

    public trackName: string = "";

    @SerializeField
    public clips: SerializedAnimationTrackClip[] = [];

    // O(1) lookup cache (built once)
    private _clipsByIndex: (SerializedAnimationTrackClip | null)[] | null = null;

    // Reusable scratch objects — no per-frame allocations
    private _v0 = new Vector3();
    private _v1 = new Vector3();
    private _q0 = new Quaternion();
    private _q1 = new Quaternion();

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

    private sampleVec3(sampler: SerializedAnimationSampler, t: number, out: Vector3): Vector3 {
        const times = sampler.times;
        const vals = sampler.values;
        const lastT = times[sampler.keyCount - 1] ?? 0;
        const time = sampler.keyCount > 1 ? (t % lastT) : 0;

        let i1 = 0; while (i1 < sampler.keyCount && times[i1] < time) ++i1;
        if (i1 === 0) i1 = 1;
        if (i1 >= sampler.keyCount) i1 = sampler.keyCount - 1;
        const i0 = i1 - 1;

        const t0 = times[i0], t1 = times[i1];
        const u = t1 > t0 ? (time - t0) / (t1 - t0) : 0;
        const b0 = i0 * 3, b1 = i1 * 3;

        out.set(
            vals[b0]     + (vals[b1]     - vals[b0])     * u,
            vals[b0 + 1] + (vals[b1 + 1] - vals[b0 + 1]) * u,
            vals[b0 + 2] + (vals[b1 + 2] - vals[b0 + 2]) * u,
        );
        return out;
    }

    private sampleQuat(sampler: SerializedAnimationSampler, t: number, out: Quaternion): Quaternion {
        const times = sampler.times;
        const vals = sampler.values;
        const lastT = times[sampler.keyCount - 1] ?? 0;
        const time = sampler.keyCount > 1 ? (t % lastT) : 0;

        let i1 = 0; while (i1 < sampler.keyCount && times[i1] < time) ++i1;
        if (i1 === 0) i1 = 1;
        if (i1 >= sampler.keyCount) i1 = sampler.keyCount - 1;
        const i0 = i1 - 1;

        const t0 = times[i0], t1 = times[i1];
        const u = t1 > t0 ? (time - t0) / (t1 - t0) : 0;
        const b0 = i0 * 4, b1 = i1 * 4;

        this._q1.set(vals[b0], vals[b0 + 1], vals[b0 + 2], vals[b0 + 3]);
        out.set(vals[b1], vals[b1 + 1], vals[b1 + 2], vals[b1 + 3]);
        this._q1.slerp(out, u);
        out.copy(this._q1);
        return out;
    }

    public apply(clipIndex: number, time: number) {
        const clip = this.getClip(clipIndex);
        if (!clip) return;

        const tr = this.gameObject.transform;
        for (const ch of clip.channels) {
            if (ch.path === "translation") {
                this.sampleVec3(ch.sampler, time, tr.localPosition);
            } else if (ch.path === "scale") {
                this.sampleVec3(ch.sampler, time, tr.scale);
            } else if (ch.path === "rotation") {
                this.sampleQuat(ch.sampler, time, tr.localRotation).normalize();
            }
        }
    }

    public applyBlended(clipA: number, tA: number, clipB: number, tB: number, alpha: number) {
        const a = this.getClip(clipA);
        const b = this.getClip(clipB);
        if (!a && !b) return;
        if (a && !b) return this.apply(clipA, tA);
        if (!a && b) return this.apply(clipB, tB);

        const tr = this.gameObject.transform;

        for (const chA of a.channels) {
            const chB = b.channels.find(ch => ch.path === chA.path);
            if (!chB) {
                if (chA.path === "translation") this.sampleVec3(chA.sampler, tA, tr.localPosition);
                else if (chA.path === "scale") this.sampleVec3(chA.sampler, tA, tr.scale);
                else if (chA.path === "rotation") this.sampleQuat(chA.sampler, tA, tr.localRotation).normalize();
                continue;
            }

            if (chA.path === "translation") {
                this.sampleVec3(chA.sampler, tA, this._v0);
                this.sampleVec3(chB.sampler, tB, this._v1);
                tr.localPosition.copy(this._v0.lerp(this._v1, alpha));
            } else if (chA.path === "scale") {
                this.sampleVec3(chA.sampler, tA, this._v0);
                this.sampleVec3(chB.sampler, tB, this._v1);
                tr.scale.copy(this._v0.lerp(this._v1, alpha));
            } else if (chA.path === "rotation") {
                this.sampleQuat(chA.sampler, tA, this._q0);
                this.sampleQuat(chB.sampler, tB, this._q1);
                tr.localRotation.copy(this._q0.slerp(this._q1, alpha)).normalize();
            }
        }
    }
}

Component.Registry.set(AnimationTrack.type, AnimationTrack);

export class Animator extends Component {
    public static type = "@trident/core/components/Animator";

    @SerializeField
    public assetPath?: string;

    @SerializeField
    public clips: SerializedAnimationClip[] = [];

    @SerializeField
    public tracksData: { [nodeName: string]: SerializedAnimationTrackClip[] } = {};

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

        // Distribute track data from the animation asset
        if (this.tracksData) {
            for (const track of this.tracks) {
                if (track.trackName && this.tracksData[track.trackName]) {
                    track.clips = this.tracksData[track.trackName];
                }
            }
        }

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
