declare module 'gifenc' {
  export interface QuantizeOptions {
    maxColors?: number;
    format?: string;
  }

  export function quantize(rgba: Uint8ClampedArray | Uint8Array, maxColors?: number, options?: QuantizeOptions): number[][];

  export function applyPalette(rgba: Uint8ClampedArray | Uint8Array, palette: number[][], format?: string): Uint8Array;

  export interface FrameOptions {
    palette?: number[][];
    delay?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
  }

  export interface GIFEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, options?: FrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
  }

  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): GIFEncoderInstance;
}
