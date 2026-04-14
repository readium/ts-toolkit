// PreservePitchProcessor.js
// AudioWorklet processor for pitch preservation via pitch shifting.
//
// Architecture:
//   - Overlap-add (OLA) phase vocoder with an iterative in-place Cooley-Tukey FFT/IFFT.
//   - All intermediate buffers are pre-allocated in the constructor; the hot path
//     (process → _processBuffer → _fft) is allocation-free and GC-safe.
//   - An output ring buffer decouples OLA processing (fires every hopSize input
//     samples) from the Web Audio render quantum (128 frames), so process() always
//     fills outputChannel completely.

class PreservePitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize  = 1024;
    this.hopSize     = 256;
    this.overlap     = this.bufferSize - this.hopSize;
    this.pitchFactor = 1.0;

    // Sliding input window (always holds the last bufferSize samples)
    this.inputBuffer = new Float32Array(this.bufferSize);
    this.inputFill   = 0;   // samples loaded during startup (saturates at bufferSize)
    this.hopAccum    = 0;   // new samples since last OLA step; triggers a step at hopSize

    // OLA output accumulator: overlap-add results accumulate here; hopSize samples
    // are drained to the ring buffer and the remainder shifts down each OLA step.
    this.olaBuffer = new Float32Array(this.bufferSize);

    // Output FIFO ring buffer — power-of-2 size for allocation-free modulo wrapping.
    this._ringSize  = 4096;
    this._ring      = new Float32Array(this._ringSize);
    this._ringMask  = this._ringSize - 1;
    this._ringWrite = 0;
    this._ringRead  = 0;
    this._ringAvail = 0;

    // Hann window (pre-computed, never mutated)
    this.window = new Float32Array(this.bufferSize);
    for (let i = 0; i < this.bufferSize; i++) {
      this.window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / this.bufferSize));
    }

    // Pre-allocated FFT work buffers — never re-created in the hot path
    this._re        = new Float64Array(this.bufferSize);
    this._im        = new Float64Array(this.bufferSize);
    this._shiftedRe = new Float64Array(this.bufferSize);
    this._shiftedIm = new Float64Array(this.bufferSize);

    this.port.onmessage = (event) => {
      if (event.data.type === 'setPitchFactor') {
        this.pitchFactor = event.data.factor;
      }
    };
  }

  process(inputs, outputs) {
    const input  = inputs[0];
    const output = outputs[0];
    if (!input || !output) return true;
    const inCh  = input[0];
    const outCh = output[0];
    if (!inCh || !outCh) return true;

    const newCount = inCh.length; // always 128 under normal Web Audio conditions

    // --- 1. Push new samples into the sliding input window ---
    if (this.inputFill < this.bufferSize) {
      // Startup: fill the window until we have a full bufferSize frame.
      // Since bufferSize (1024) is an exact multiple of the render quantum (128)
      // this branch always copies exactly newCount samples.
      this.inputBuffer.set(inCh, this.inputFill);
      this.inputFill += newCount;
    } else {
      // Steady state: slide left by newCount, append the new quantum at the end.
      this.inputBuffer.copyWithin(0, newCount);
      this.inputBuffer.set(inCh, this.bufferSize - newCount);
    }
    this.hopAccum += newCount;

    // --- 2. Run OLA step(s) whenever hopAccum reaches hopSize ---
    // During startup we skip processing until a full window is available.
    while (this.inputFill >= this.bufferSize && this.hopAccum >= this.hopSize) {
      this.hopAccum -= this.hopSize;
      this._processBuffer(); // drains hopSize samples into _ring
    }

    // --- 3. Drain output ring into outputChannel ---
    // Output silence during the initial buffering latency (bufferSize samples ≈ 23 ms
    // at 44100 Hz).  Once the ring has data it stays ahead of demand.
    if (this._ringAvail >= newCount) {
      for (let i = 0; i < newCount; i++) {
        outCh[i] = this._ring[this._ringRead];
        this._ringRead = (this._ringRead + 1) & this._ringMask;
      }
      this._ringAvail -= newCount;
    } else {
      outCh.fill(0);
    }

    return true;
  }

  _processBuffer() {
    const N         = this.bufferSize;
    const re        = this._re;
    const im        = this._im;
    const shiftedRe = this._shiftedRe;
    const shiftedIm = this._shiftedIm;
    const win       = this.window;

    // Load windowed input into real part; zero imaginary part
    for (let i = 0; i < N; i++) {
      re[i] = this.inputBuffer[i] * win[i];
      im[i] = 0;
    }

    this._fft(re, im, false);

    // Spectral pitch shift: map bin k → round(k * factor)
    shiftedRe.fill(0);
    shiftedIm.fill(0);
    const half   = N >> 1;
    const factor = this.pitchFactor;
    for (let k = 0; k <= half; k++) {
      const newK = Math.round(k * factor);
      if (newK <= half) {
        shiftedRe[newK] += re[k];
        shiftedIm[newK] += im[k];
        // Restore conjugate symmetry so the IFFT yields a real-valued signal
        if (newK > 0 && newK < half) {
          shiftedRe[N - newK] =  shiftedRe[newK];
          shiftedIm[N - newK] = -shiftedIm[newK];
        }
      }
    }

    this._fft(shiftedRe, shiftedIm, true); // in-place IFFT

    // Overlap-add into olaBuffer
    for (let i = 0; i < N; i++) {
      this.olaBuffer[i] += shiftedRe[i] * win[i];
    }

    // Push hopSize output samples to the ring buffer
    for (let i = 0; i < this.hopSize; i++) {
      this._ring[this._ringWrite] = this.olaBuffer[i];
      this._ringWrite = (this._ringWrite + 1) & this._ringMask;
    }
    this._ringAvail += this.hopSize;

    // Shift the OLA accumulator left by hopSize; clear the vacated tail
    this.olaBuffer.copyWithin(0, this.hopSize);
    this.olaBuffer.fill(0, this.bufferSize - this.hopSize);
  }

  /**
   * In-place iterative Cooley-Tukey FFT / IFFT.
   * Operates entirely on the caller-supplied Float64Arrays — no allocation.
   *
   * @param {Float64Array} re      Real parts (mutated in place)
   * @param {Float64Array} im      Imaginary parts (mutated in place)
   * @param {boolean}      inverse true → IFFT (divides by N), false → FFT
   */
  _fft(re, im, inverse) {
    const N = re.length;

    // Bit-reversal permutation
    let j = 0;
    for (let i = 1; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let tmp;
        tmp = re[i]; re[i] = re[j]; re[j] = tmp;
        tmp = im[i]; im[i] = im[j]; im[j] = tmp;
      }
    }

    // Butterfly stages — O(N log N), no allocation
    const sign = inverse ? 1 : -1;
    for (let len = 2; len <= N; len <<= 1) {
      const halfLen = len >> 1;
      const ang     = sign * Math.PI / halfLen;
      const wBaseRe = Math.cos(ang);
      const wBaseIm = Math.sin(ang);
      for (let i = 0; i < N; i += len) {
        let wRe = 1, wIm = 0;
        for (let k = 0; k < halfLen; k++) {
          const uRe = re[i + k];
          const uIm = im[i + k];
          const vRe = re[i + k + halfLen] * wRe - im[i + k + halfLen] * wIm;
          const vIm = re[i + k + halfLen] * wIm + im[i + k + halfLen] * wRe;
          re[i + k]           = uRe + vRe;
          im[i + k]           = uIm + vIm;
          re[i + k + halfLen] = uRe - vRe;
          im[i + k + halfLen] = uIm - vIm;
          const newWRe = wRe * wBaseRe - wIm * wBaseIm;
          wIm = wRe * wBaseIm + wIm * wBaseRe;
          wRe = newWRe;
        }
      }
    }

    if (inverse) {
      for (let i = 0; i < N; i++) {
        re[i] /= N;
        im[i] /= N;
      }
    }
  }
}

registerProcessor('preserve-pitch-processor', PreservePitchProcessor);
