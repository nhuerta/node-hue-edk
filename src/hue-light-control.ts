import type { HueWrapper } from './native';

export interface Color {
    r: number;
    g: number;
    b: number;
    alpha?: number;  // Optional alpha channel for effect blending (0-1)
}

export const COLORS = {
    amber: { r: 255, g: 191, b: 0 },
    babyBlue: { r: 137, g: 207, b: 240 },
    black: { r: 0, g: 0, b: 0 },
    bloodRed: { r: 100, g: 0, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    brightGreen: { r: 0, g: 255, b: 50 },
    coral: { r: 255, g: 127, b: 80 },
    crimson: { r: 220, g: 20, b: 60 },
    cyan: { r: 0, g: 255, b: 255 },
    darkOrange: { r: 255, g: 140, b: 0 },
    darkRed: { r: 150, g: 0, b: 0 },
    darkViolet: { r: 148, g: 0, b: 211 },
    deepBlue: { r: 0, g: 0, b: 139 },
    electricBlue: { r: 125, g: 249, b: 255 },
    emerald: { r: 80, g: 200, b: 120 },
    forestGreen: { r: 34, g: 139, b: 34 },
    ghostWhite: { r: 248, g: 248, b: 255 },
    gold: { r: 255, g: 215, b: 0 },
    green: { r: 0, g: 255, b: 0 },
    hotPink: { r: 255, g: 105, b: 180 },
    iceBlue: { r: 176, g: 224, b: 230 },
    indigo: { r: 75, g: 0, b: 130 },
    lightBlue: { r: 0, g: 150, b: 255 },
    lightYellow: { r: 255, g: 255, b: 100 },
    limeGreen: { r: 50, g: 255, b: 0 },
    magenta: { r: 255, g: 0, b: 255 },
    orange: { r: 255, g: 165, b: 0 },
    pink: { r: 255, g: 192, b: 203 },
    purple: { r: 128, g: 0, b: 255 },
    red: { r: 255, g: 0, b: 0 },
    redOrange: { r: 255, g: 69, b: 0 },
    rose: { r: 255, g: 0, b: 127 },
    sapphire: { r: 15, g: 82, b: 186 },
    scarlet: { r: 255, g: 36, b: 0 },
    skyBlue: { r: 135, g: 206, b: 235 },
    violet: { r: 138, g: 43, b: 226 },
    white: { r: 255, g: 255, b: 255 },
    yellow: { r: 255, g: 255, b: 0 }
} as const;

export function interpolateColor(color1: Color, color2: Color, factor: number): Color {
    return {
        r: Math.round(color1.r + (color2.r - color1.r) * factor),
        g: Math.round(color1.g + (color2.g - color1.g) * factor),
        b: Math.round(color1.b + (color2.b - color1.b) * factor)
    };
}

export function hsvToRgb(h: number, s: number, v: number): Color {
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

export class HueLightControl {
    private hueWrapper: HueWrapper;
    segments: number[] = [0, 1, 2];

    constructor(hueWrapper: HueWrapper) {
        this.hueWrapper = hueWrapper;
    }

    setSegmentColor(segmentId: number, color: Color): void {
        if (color.alpha !== undefined) {
            // Use RGBA variant if alpha is specified
            this.hueWrapper.setLightColorRGBA(segmentId, color.r, color.g, color.b, color.alpha);
        } else {
            // Use RGB variant for better performance when alpha not needed
            this.hueWrapper.setLightColorRGB(segmentId, color.r, color.g, color.b);
        }
    }

    setAllSegments(color: Color): void {
        this.segments.forEach(segId => {
            this.setSegmentColor(segId, color);
        });
    }

    clearSegment(segmentId: number): void {
        this.hueWrapper.setLightColorRGB(segmentId, 0, 0, 0);
    }

    clearAllSegments(): void {
        this.segments.forEach(segId => {
            this.clearSegment(segId);
        });
    }

    sendToDevice(): void {
        this.hueWrapper.update();
    }
}