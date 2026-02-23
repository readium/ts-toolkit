// PreservePitchProcessor.js
// AudioWorklet processor for pitch preservation via pitch shifting

class PreservePitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 1024;
    this.hopSize = 256;
    this.overlap = this.bufferSize - this.hopSize;
    this.inputBuffer = new Float32Array(this.bufferSize);
    this.outputBuffer = new Float32Array(this.bufferSize);
    this.window = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.pitchFactor = 1.0;

    // Hann window
    for (let i = 0; i < this.bufferSize; i++) {
      this.window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / this.bufferSize));
    }

    this.port.onmessage = (event) => {
      if (event.data.type === 'setPitchFactor') {
        this.pitchFactor = event.data.factor;
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !output) return true;

    const inputChannel = input[0];
    const outputChannel = output[0];

    // Accumulate input
    for (let i = 0; i < inputChannel.length; i++) {
      this.inputBuffer[this.bufferIndex] = inputChannel[i];
      this.bufferIndex++;

      if (this.bufferIndex >= this.bufferSize) {
        // Process buffer
        this.processBuffer();
        // Output hopSize samples
        for (let j = 0; j < this.hopSize; j++) {
          outputChannel[j] = this.outputBuffer[j];
        }
        // Shift buffer
        for (let j = 0; j < this.overlap; j++) {
          this.inputBuffer[j] = this.inputBuffer[j + this.hopSize];
        }
        this.bufferIndex = this.overlap;
        // Clear output buffer for next
        this.outputBuffer.fill(0);
      }
    }

    return true;
  }

  processBuffer() {
    // Apply window
    let windowed = new Float32Array(this.bufferSize);
    for (let i = 0; i < this.bufferSize; i++) {
      windowed[i] = this.inputBuffer[i] * this.window[i];
    }

    // FFT
    let fftResult = this.fft(windowed);

    // Pitch shift
    let shifted = this.pitchShift(fftResult, this.pitchFactor);

    // IFFT
    let ifftResult = this.ifft(shifted);

    // Overlap-add
    for (let i = 0; i < this.bufferSize; i++) {
      this.outputBuffer[i] += ifftResult[i] * this.window[i];
    }
  }

  pitchShift(fft, factor) {
    let N = fft.length;
    let result = new Array(N).fill(null).map(() => ({ real: 0, imag: 0 }));
    for (let k = 0; k < N / 2; k++) {
      let newK = Math.round(k * factor);
      if (newK < N / 2) {
        result[newK] = fft[k];
        result[N - newK] = fft[N - k]; // symmetric for real input
      }
    }
    return result;
  }

  fft(input) {
    let N = input.length;
    if (N <= 1) return [{ real: input[0] || 0, imag: 0 }];
    if ((N & (N - 1)) !== 0) throw new Error('N must be power of 2');

    let even = this.fft(input.filter((_, i) => i % 2 === 0));
    let odd = this.fft(input.filter((_, i) => i % 2 === 1));

    let result = new Array(N);
    for (let k = 0; k < N / 2; k++) {
      let t = odd[k];
      let angle = -2 * Math.PI * k / N;
      let twiddle = { real: Math.cos(angle), imag: Math.sin(angle) };
      let twiddled = {
        real: t.real * twiddle.real - t.imag * twiddle.imag,
        imag: t.real * twiddle.imag + t.imag * twiddle.real
      };
      result[k] = {
        real: even[k].real + twiddled.real,
        imag: even[k].imag + twiddled.imag
      };
      result[k + N / 2] = {
        real: even[k].real - twiddled.real,
        imag: even[k].imag - twiddled.imag
      };
    }
    return result;
  }

  ifft(input) {
    let N = input.length;
    // Conjugate
    let conj = input.map(c => ({ real: c.real, imag: -c.imag }));
    // FFT
    let fftConj = this.fft(conj.map(c => c.real)); // wait, fft expects real array
    // FFT on complex is needed, but simplify
    // For simplicity, implement IFFT similarly
    let result = new Float32Array(N);
    for (let n = 0; n < N; n++) {
      let sumReal = 0, sumImag = 0;
      for (let k = 0; k < N; k++) {
        let angle = 2 * Math.PI * k * n / N;
        let c = input[k];
        sumReal += c.real * Math.cos(angle) - c.imag * Math.sin(angle);
        sumImag += c.real * Math.sin(angle) + c.imag * Math.cos(angle);
      }
      result[n] = sumReal / N;
    }
    return result;
  }
}

registerProcessor('preserve-pitch-processor', PreservePitchProcessor);
