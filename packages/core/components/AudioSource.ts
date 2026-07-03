import { Component } from "./Component";

import { SerializeField, UUID } from "../utils";
import { AudioManager } from "../AudioManager";
import { Assets } from "../Assets";
import { EventSystemLocal } from "../Events";
import { TransformEvents } from "./Transform";

const bufferCache: Map<string, AudioBuffer> = new Map();

export class AudioClip {
    public static type = "@trident/core/components/AudioClip";

    @SerializeField public assetPath?: string;
    @SerializeField public id = UUID();
    @SerializeField public name: string = "";

    private buffer: AudioBuffer;

    public static async Deserialize(assetPath: string, data?: any, bytes?: ArrayBuffer): Promise<AudioClip> {
        const audioClip = new AudioClip();
        audioClip.assetPath = assetPath;

        let audioBuffer = bufferCache.get(assetPath);
        if (!audioBuffer) {
            const buffer = bytes ?? await Assets.Load(assetPath, "binary");
            audioBuffer = await AudioManager.ctx.decodeAudioData(buffer);
            bufferCache.set(assetPath, audioBuffer);
        }
        audioClip.buffer = audioBuffer;

        return audioClip;
    }

    public GetBuffer(): AudioBuffer { return this.buffer }
}

export class AudioListener extends Component {
    public static type = "@trident/core/components/AudioListener";

    public static listener: globalThis.AudioListener;
    public Start(): void {
        if (AudioListener.listener) {
            console.warn("Only one AudioListener is allowed.");
            return;
        }
        AudioListener.listener = AudioManager.ctx.listener;

        EventSystemLocal.on(TransformEvents.Updated, this.transform, this.onTransformUpdated);
    }

    private onTransformUpdated = () => {
        AudioListener.listener.positionX.value = this.transform.position.x;
        AudioListener.listener.positionY.value = this.transform.position.y;
        AudioListener.listener.positionZ.value = this.transform.position.z;

        AudioListener.listener.forwardX.value = this.transform.forward.x;
        AudioListener.listener.forwardY.value = this.transform.forward.y;
        AudioListener.listener.forwardZ.value = this.transform.forward.z;

        AudioListener.listener.upX.value = this.transform.up.x;
        AudioListener.listener.upY.value = this.transform.up.y;
        AudioListener.listener.upZ.value = this.transform.up.z;
    };

    public Destroy(): void {
        EventSystemLocal.off(TransformEvents.Updated, this.transform, this.onTransformUpdated);
    }
}

export class AudioSource extends Component {
    public static type = "@trident/core/components/AudioSource";

    @SerializeField(AudioClip) public clip: AudioClip;
    @SerializeField public spatial: boolean = true;

    public Play() {
        if (!this.clip) {
            console.warn("AudioSource has no clip.");
            return;
        }
        return this.PlayOneShot(this.clip);
    }

    public PlayOneShot(clip: AudioClip) {
        if (!clip) {
            console.warn("AudioSource.PlayOneShot called with no clip.");
            return;
        }

        const ctx = AudioManager.ctx;
        const source = ctx.createBufferSource();
        source.buffer = clip.GetBuffer();

        const gain = ctx.createGain();
        gain.gain.value = 1;

        if (this.spatial) {
            if (!AudioListener.listener) {
                console.warn("No AudioListener exists.");
                return;
            }
            const panner = new PannerNode(ctx, {
                panningModel: "HRTF",
                distanceModel: "inverse",
                refDistance: 5,
                rolloffFactor: 1,
                maxDistance: 100,
                positionX: this.transform.position.x,
                positionY: this.transform.position.y,
                positionZ: this.transform.position.z,
            });
            source.connect(panner).connect(gain).connect(AudioManager.masterGainNode);
        } else {
            source.connect(gain).connect(AudioManager.masterGainNode);
        }

        source.start();
    }
}

Component.Registry.set(AudioListener.type, AudioListener);
Component.Registry.set(AudioSource.type, AudioSource);