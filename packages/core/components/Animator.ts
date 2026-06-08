import { Component } from "./Component";
import { Quaternion, Vector3 } from "../math";
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

    @SerializeField public trackName: string = "";

    private _clips: SerializedAnimationTrackClip[] = [];
    public get clips(): SerializedAnimationTrackClip[] { return this._clips; }
    public set clips(value: SerializedAnimationTrackClip[]) {
        this._clips = value ?? [];
        this._clipsByIndex = null;
    }

    private _clipsByIndex: (SerializedAnimationTrackClip | null)[] | null = null;

    private _v0 = new Vector3();
    private _v1 = new Vector3();
    private _q0 = new Quaternion();
    private _q1 = new Quaternion();

    private _sampleQ0 = new Quaternion();
    private _sampleQ1 = new Quaternion();

    private _bindPos = new Vector3();
    private _bindRot = new Quaternion();
    private _bindScl = new Vector3(1, 1, 1);
    private _bindCaptured = false;

    public captureBindPose(): void {
        if (this._bindCaptured) return;

        const tr = this.gameObject.transform;
        this._bindPos.copy(tr.localPosition);
        this._bindRot.copy(tr.localRotation);
        this._bindScl.copy(tr.scale);

        this._bindCaptured = true;
    }

    private clip(clipIndex: number): SerializedAnimationTrackClip | null {
        if (!this._clipsByIndex) {
            let max = -1;
            for (const c of this.clips) if (c.clipIndex > max) max = c.clipIndex;

            this._clipsByIndex = new Array(max + 1).fill(null);
            for (const c of this.clips) this._clipsByIndex[c.clipIndex] = c;
        }

        return this._clipsByIndex[clipIndex] ?? null;
    }

    private channel(clip: SerializedAnimationTrackClip | null, path: AnimationPath): SerializedAnimationChannel | null {
        return clip?.channels.find(ch => ch.path === path) ?? null;
    }

    private sampleVec3(sampler: SerializedAnimationSampler, t: number, out: Vector3): Vector3 {
        const times = sampler.times;
        const vals = sampler.values;
        const lastT = times[sampler.keyCount - 1] ?? 0;
        const time = sampler.keyCount > 1 && lastT > 0 ? (t % lastT) : 0;

        let i1 = 0;
        while (i1 < sampler.keyCount && times[i1] < time) i1++;

        if (i1 === 0) i1 = 1;
        if (i1 >= sampler.keyCount) i1 = sampler.keyCount - 1;

        const i0 = i1 - 1;
        const t0 = times[i0];
        const t1 = times[i1];
        const u = t1 > t0 ? (time - t0) / (t1 - t0) : 0;

        const b0 = i0 * 3;
        const b1 = i1 * 3;

        return out.set(
            vals[b0] + (vals[b1] - vals[b0]) * u,
            vals[b0 + 1] + (vals[b1 + 1] - vals[b0 + 1]) * u,
            vals[b0 + 2] + (vals[b1 + 2] - vals[b0 + 2]) * u,
        );
    }

    private sampleQuat(sampler: SerializedAnimationSampler, t: number, out: Quaternion): Quaternion {
        const times = sampler.times;
        const vals = sampler.values;
        const lastT = times[sampler.keyCount - 1] ?? 0;
        const time = sampler.keyCount > 1 && lastT > 0 ? (t % lastT) : 0;

        let i1 = 0;
        while (i1 < sampler.keyCount && times[i1] < time) i1++;

        if (i1 === 0) i1 = 1;
        if (i1 >= sampler.keyCount) i1 = sampler.keyCount - 1;

        const i0 = i1 - 1;
        const t0 = times[i0];
        const t1 = times[i1];
        const u = t1 > t0 ? (time - t0) / (t1 - t0) : 0;

        const b0 = i0 * 4;
        const b1 = i1 * 4;

        this._sampleQ0.set(vals[b0], vals[b0 + 1], vals[b0 + 2], vals[b0 + 3]).normalize();
        this._sampleQ1.set(vals[b1], vals[b1 + 1], vals[b1 + 2], vals[b1 + 3]).normalize();

        return out.copy(this._sampleQ0).slerp(this._sampleQ1, u).normalize();
    }

    public apply(clipIndex: number, time: number): void {
        this.captureBindPose();

        const clip = this.clip(clipIndex);
        const tr = this.gameObject.transform;

        const pos = this.channel(clip, "translation");
        if (pos) this.sampleVec3(pos.sampler, time, tr.localPosition);
        else tr.localPosition.copy(this._bindPos);

        const rot = this.channel(clip, "rotation");
        if (rot) this.sampleQuat(rot.sampler, time, tr.localRotation);
        else tr.localRotation.copy(this._bindRot);

        const scl = this.channel(clip, "scale");
        if (scl) this.sampleVec3(scl.sampler, time, tr.scale);
        else tr.scale.copy(this._bindScl);
    }

    public applyBlended(clipA: number, timeA: number, clipB: number, timeB: number, alpha: number): void {
        this.captureBindPose();

        const a = this.clip(clipA);
        const b = this.clip(clipB);
        const tr = this.gameObject.transform;

        const posA = this.channel(a, "translation");
        const posB = this.channel(b, "translation");
        if (posA) this.sampleVec3(posA.sampler, timeA, this._v0);
        else this._v0.copy(this._bindPos);
        if (posB) this.sampleVec3(posB.sampler, timeB, this._v1);
        else this._v1.copy(this._bindPos);
        tr.localPosition.copy(this._v0.lerp(this._v1, alpha));

        const rotA = this.channel(a, "rotation");
        const rotB = this.channel(b, "rotation");
        if (rotA) this.sampleQuat(rotA.sampler, timeA, this._q0);
        else this._q0.copy(this._bindRot);
        if (rotB) this.sampleQuat(rotB.sampler, timeB, this._q1);
        else this._q1.copy(this._bindRot);
        tr.localRotation.copy(this._q0.slerp(this._q1, alpha)).normalize();

        const sclA = this.channel(a, "scale");
        const sclB = this.channel(b, "scale");
        if (sclA) this.sampleVec3(sclA.sampler, timeA, this._v0);
        else this._v0.copy(this._bindScl);
        if (sclB) this.sampleVec3(sclB.sampler, timeB, this._v1);
        else this._v1.copy(this._bindScl);
        tr.scale.copy(this._v0.lerp(this._v1, alpha));
    }
}

Component.Registry.set(AnimationTrack.type, AnimationTrack);

export class AnimationData {
    public static type = "@trident/core/AnimationData";

    @SerializeField public assetPath?: string;
    @SerializeField public clips: SerializedAnimationClip[] = [];
    @SerializeField public tracksData: { [nodeName: string]: SerializedAnimationTrackClip[] } = {};
}

export class Animator extends Component {
    public static type = "@trident/core/components/Animator";

    @SerializeField(AnimationData)
    public animation: AnimationData = new AnimationData();

    public get assetPath(): string | undefined { return this.animation.assetPath; }
    public set assetPath(value: string | undefined) { this.animation.assetPath = value; }

    public get clips(): SerializedAnimationClip[] { return this.animation.clips; }
    public set clips(value: SerializedAnimationClip[]) { this.animation.clips = value; }

    public get tracksData(): { [nodeName: string]: SerializedAnimationTrackClip[] } { return this.animation.tracksData; }
    public set tracksData(value: { [nodeName: string]: SerializedAnimationTrackClip[] }) { this.animation.tracksData = value; }

    public clipIndex = 0;

    private playing = false;
    private previousTime = 0;

    private tracks: AnimationTrack[] = [];
    private bound = false;

    private currentTime = 0;
    private nextTime = 0;
    private fadeDuration = 0;
    private fadeTime = 0;
    private nextClipIndex: number | null = null;
    private speed = 1;
    private nextSpeed = 1;

    public Start(): void {
        this.previousTime = performance.now();
        this.Bind();
    }

    private Bind(): void {
        if (this.bound) return;

        this.tracks = this.gameObject.GetComponentsInChildren(AnimationTrack);

        for (const track of this.tracks) {
            const trackName = track.trackName || track.gameObject.name;
            track.trackName = trackName;

            const clips = this.animation.tracksData?.[trackName];
            if (clips) track.clips = clips;

            track.captureBindPose();
        }

        this.bound = true;
    }

    public Rebind(): void {
        this.bound = false;
        this.Bind();
    }

    public SetClipByIndex(i: number, speed: number = 1): void {
        this.Bind();
        if (this.tracks.length === 0) return;

        this.clipIndex = Math.max(0, i);
        this.currentTime = 0;
        this.nextClipIndex = null;
        this.fadeDuration = 0;
        this.fadeTime = 0;
        this.previousTime = performance.now();
        this.speed = speed;
        this.playing = true;

        for (const track of this.tracks) {
            track.apply(this.clipIndex, this.currentTime);
        }
    }

    public CrossFadeTo(i: number, duration: number = 0.25, speed: number = 1): void {
        this.Bind();
        if (this.tracks.length === 0) return;

        this.nextClipIndex = Math.max(0, i);
        this.nextTime = 0;
        this.fadeDuration = Math.max(0.0001, duration);
        this.fadeTime = 0;
        this.previousTime = performance.now();
        this.nextSpeed = speed;
        this.playing = true;
    }

    public Update(): void {
        if (!this.playing) return;

        const now = performance.now();
        const dt = (now - this.previousTime) / 1000;
        this.previousTime = now;

        this.currentTime += dt * this.speed;

        if (this.nextClipIndex !== null) {
            this.nextTime += dt * this.nextSpeed;
            this.fadeTime += dt;
        }

        if (this.nextClipIndex === null) {
            for (const track of this.tracks) {
                track.apply(this.clipIndex, this.currentTime);
            }
            return;
        }

        const alpha = Math.min(1, this.fadeTime / this.fadeDuration);

        for (const track of this.tracks) {
            track.applyBlended(this.clipIndex, this.currentTime, this.nextClipIndex, this.nextTime, alpha);
        }

        if (alpha >= 1) {
            this.clipIndex = this.nextClipIndex;
            this.currentTime = this.nextTime;
            this.speed = this.nextSpeed;
            this.nextClipIndex = null;
            this.fadeDuration = 0;
            this.fadeTime = 0;
        }
    }

    public GetClipIndexByName(name: string): number {
        this.Bind();

        if (!this.animation.clips.length) return -1;
        return this.animation.clips.findIndex(c => c.name === name);
    }
}

Component.Registry.set(AnimationData.type, AnimationData);
Component.Registry.set(Animator.type, Animator);