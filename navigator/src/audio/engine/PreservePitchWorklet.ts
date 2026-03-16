interface PreservePitchWorkletOptions {
  ctx: AudioContext;
  mediaElement?: HTMLMediaElement;
  pitchFactor?: number;
  modulePath?: string;
}

import processorCode from './PreservePitchProcessor.js?raw';

export class PreservePitchWorklet {
  mediaElement: HTMLMediaElement | null = null;
  source: MediaElementAudioSourceNode | null = null;
  ctx: AudioContext;
  workletNode: AudioWorkletNode | null = null;
  url: string | null = null;

  static async createWorklet(options: PreservePitchWorkletOptions): Promise<PreservePitchWorklet> {
    const { ctx, mediaElement, pitchFactor, modulePath } = options;
    const worklet = new PreservePitchWorklet(ctx);

    try {
      if (modulePath) {
        await ctx.audioWorklet.addModule(modulePath);
      } else {
        const blob = new Blob([processorCode], { type: 'text/javascript' });
        worklet.url = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(worklet.url);
      }
    } catch (err) {
      worklet.destroy();
      throw new Error(`Error adding module: ${err}`);
    }

    try {
      worklet.workletNode = new AudioWorkletNode(ctx, 'preserve-pitch-processor');

      if (pitchFactor) {
        worklet.updatePitchFactor(pitchFactor);
      }

      if (mediaElement) {
        const source = ctx.createMediaElementSource(mediaElement);
        source.connect(worklet.workletNode);
        worklet.mediaElement = mediaElement;
        worklet.source = source;
      }
    } catch (err) {
      worklet.destroy();
      throw new Error(`Error creating worklet node: ${err}`);
    }

    return worklet;
  }

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  updatePitchFactor(factor: number): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'setPitchFactor', factor });
    }
  }

  destroy(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.url) {
      URL.revokeObjectURL(this.url);
      this.url = null;
    }
  }
}
