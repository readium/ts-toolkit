import { ReadiumSpeechUtterance } from "@readium/speech";

// Characters per second at rate 1 until a voice is measured, on the slow side so pages turn late rather than early.
const DEFAULT_SPEED = 12;
// Shorter utterances are dominated by the voice's start latency.
const MIN_MEASURED_LENGTH = 40;

/** Times the utterance being spoken, and measures each voice's speed on the utterances it finishes. */
export class SpeechProgress {
    private readonly speeds = new Map<string, number>();
    private utterance?: ReadiumSpeechUtterance;
    private startedAt = 0;
    private pausedAt?: number;

    start(utterance: ReadiumSpeechUtterance) {
        this.utterance = utterance;
        this.startedAt = performance.now();
        this.pausedAt = undefined;
    }

    pause() {
        if (this.utterance && this.pausedAt === undefined) this.pausedAt = performance.now();
    }

    resume() {
        if (this.pausedAt === undefined) return;
        this.startedAt += performance.now() - this.pausedAt;
        this.pausedAt = undefined;
    }

    /** Measures the speed of `voice` once it has spoken `utterance` through. */
    end(utterance: ReadiumSpeechUtterance | null, voice: string, rate: number) {
        const length = (utterance?.plain ?? "").length;
        if (utterance === this.utterance && this.pausedAt === undefined && length >= MIN_MEASURED_LENGTH && rate > 0) {
            const seconds = (performance.now() - this.startedAt) / 1000;
            if (seconds > 0) this.speeds.set(voice, length / seconds / rate);
        }
        this.reset();
    }

    reset() {
        this.utterance = undefined;
        this.pausedAt = undefined;
    }

    get speaking(): boolean {
        return this.utterance !== undefined && this.pausedAt === undefined;
    }

    /** Seconds spent speaking the current utterance. */
    elapsed(): number {
        if (!this.utterance) return 0;
        return ((this.pausedAt ?? performance.now()) - this.startedAt) / 1000;
    }

    /** Characters per second of `voice` at `rate`. */
    speed(voice: string, rate: number): number {
        return (this.speeds.get(voice) ?? DEFAULT_SPEED) * rate;
    }
}
