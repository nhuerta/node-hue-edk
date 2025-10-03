export interface HueStatus {
  success?: boolean;
  streamingMode?: string;
  message?: string;
}
export interface BridgeConfig {
  id: string;
  ip: string;
  username: string;
  clientKey: string;
}
export interface BridgeStatus {
  initialized: boolean;
  connected: boolean;
  streaming: boolean;
  appName: string;
  deviceName: string;
  streamingMode: string;
  selectedGroup: string;
  bridge?: {
    id: string;
    ip: string;
    connected: boolean;
    streaming: boolean;
  };
}
export class HueWrapper {
  constructor(appName: string, deviceName: string);
  initialize(): HueStatus;
  connectManual(config: BridgeConfig): boolean;
  selectGroup(groupId: string): boolean;
  start(): boolean;
  stop(): boolean;

  // RGB color methods (0-255 range, auto-normalized to 0-1)
  setColorRGB(r: number, g: number, b: number): boolean;
  setColorRGBA(r: number, g: number, b: number, alpha: number): boolean;

  // XY color space methods (CIE 1931 xy coordinates + brightness)
  setColorXY(x: number, y: number, brightness: number): boolean;

  // Color temperature methods (mireds 153-500 + brightness)
  setColorCT(colorTemperature: number, brightness: number): boolean;

  // Per-light RGB variants
  setLightColorRGB(lightId: number, r: number, g: number, b: number): boolean;
  setLightColorRGBA(lightId: number, r: number, g: number, b: number, alpha: number): boolean;

  // Per-light XY variant
  setLightColorXY(lightId: number, x: number, y: number, brightness: number): boolean;

  // Per-light color temperature variant
  setLightColorCT(lightId: number, colorTemperature: number, brightness: number): boolean;

  // Apply brightness to current colors
  setBrightness(brightness: number): boolean;
  setLightBrightness(lightId: number, brightness: number): boolean;

  getLightIds(): string[];
  update(): boolean;
  getStatus(): BridgeStatus;
  shutdown(): boolean;
}
declare module './hue-edk/build/Release/hue_edk.node' {
  export const HueWrapper: typeof HueWrapper;
}