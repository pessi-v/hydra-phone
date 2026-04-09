declare module 'hydra-synth' {
  interface HydraOptions {
    canvas?: HTMLCanvasElement;
    width?: number;
    height?: number;
    autoLoop?: boolean;
    makeGlobal?: boolean;
    detectAudio?: boolean;
    enableStreamCapture?: boolean;
    pb?: unknown;
  }

  class Hydra {
    constructor(options?: HydraOptions);
    render(output?: unknown): void;
  }

  export default Hydra;
}
