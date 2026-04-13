interface PreservePitchWorkletOptions {
  ctx: AudioContext;
  pitchFactor?: number;
  modulePath?: string;
}

import processorCode from './PreservePitchProcessor.js?raw';

export class PreservePitchWorklet {
  ctx: AudioContext;
  workletNode: AudioWorkletNode | null = null;
  private url: string | null = null;

  static async createWorklet(options: PreservePitchWorkletOptions): Promise<PreservePitchWorklet> {
    const { ctx, pitchFactor, modulePath } = options;
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
    if (this.url) {
      URL.revokeObjectURL(this.url);
      this.url = null;
    }
  }
}
