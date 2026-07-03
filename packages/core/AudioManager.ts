import { System } from "./System";

export class AudioManager extends System {
    public static ctx: AudioContext;
    public static masterGainNode: GainNode;

    public async Start() {
        AudioManager.ctx = new AudioContext();

        AudioManager.masterGainNode = AudioManager.ctx.createGain();
        AudioManager.masterGainNode.connect(AudioManager.ctx.destination);
    }
}