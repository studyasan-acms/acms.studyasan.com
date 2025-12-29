/**
 * Type declarations for @mediapipe/selfie_segmentation
 */

declare module '@mediapipe/selfie_segmentation' {
    export interface Results {
        segmentationMask: CanvasImageSource;
        image: CanvasImageSource;
    }

    export interface SelfieSegmentationConfig {
        locateFile?: (file: string) => string;
    }

    export interface SelfieSegmentationOptions {
        modelSelection?: number;
        selfieMode?: boolean;
    }

    export class SelfieSegmentation {
        constructor(config?: SelfieSegmentationConfig);
        setOptions(options: SelfieSegmentationOptions): void;
        onResults(callback: (results: Results) => void): void;
        initialize(): Promise<void>;
        send(inputs: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }): Promise<void>;
        close(): void;
    }
}
