# @nhuerta/node-hue-edk

Node.js wrapper for the Philips Hue Entertainment Development Kit (EDK), providing TypeScript bindings for the Hue Entertainment API.

## Installation

Install from GitHub:

```bash
npm install github:nhuerta/node-hue-edk#semver:^1.0.0
# or
bun install github:nhuerta/node-hue-edk#semver:^1.0.0
```

### Pre-built Binaries

- **Windows x64:** ✅ Included (no build required)
- **macOS x64:** ❌ Build from source required
- **Linux x64:** ❌ Build from source required

For platforms without pre-built binaries:
```bash
npm run build
```

## Usage

```typescript
import { Hue, COLORS, type Color } from '@nhuerta/node-hue-edk';

const hue = new Hue({
    appName: 'MyApp',
    deviceName: 'MyDevice',
    groupId: '200'
});

await hue.initialize();

// Solid colors
hue.setSolidColor(COLORS.blue);

// Effects
hue.percentageBar(75);  // Health bar (0-100)
hue.gradientWave(COLORS.red, COLORS.yellow, 2000, 5000);
hue.rippleGradient(COLORS.purple, 1000, 3000);
hue.breathingGradient(COLORS.red, COLORS.black, 1500);
hue.pulseWave(COLORS.cyan, COLORS.white, 1000, 3000);
hue.rainbowWave(2000, 5000);
hue.countdownPulse(30);  // Countdown in seconds
```

## API

### Constructor

```typescript
new Hue(config: HueConfig)

interface HueConfig {
    appName: string;
    deviceName: string;
    groupId: string;
}
```

### Methods

- `initialize(): Promise<boolean>`
- `shutdown(): void`
- `setSolidColor(color: Color): void`
- `clearAllLights(): void`
- `percentageBar(percentage: number): void`
- `gradientWave(color1: Color, color2: Color, duration: number, runTime: number): void`
- `rippleGradient(color: Color, duration: number, runTime: number): void`
- `breathingGradient(color1: Color, color2: Color, period: number, runTime: number): void`
- `chaseGradient(color: Color, speed: number, runTime: number): void`
- `rainbowWave(speed: number, runTime: number): void`
- `pulseWave(color1: Color, color2: Color, speed: number, runTime: number): void`
- `countdownPulse(totalSeconds: number): void`
- `flashColor(color: Color, duration: number): void`
- `randomColorSequence(duration: number): void`

### Color Type

```typescript
interface Color {
    r: number;        // 0-255
    g: number;        // 0-255
    b: number;        // 0-255
    alpha?: number;   // 0-1 (optional, for blending)
}
```

### COLORS

39 predefined colors including: `red`, `green`, `blue`, `yellow`, `purple`, `cyan`, `white`, `orange`, `pink`, `darkRed`, `brightGreen`, `emerald`, `electricBlue`, `iceBlue`, `gold`, `amber`, `scarlet`, `violet`, etc.

## Environment Configuration

Create a `.env` file:

```env
HUE_BRIDGE_ID=your-bridge-id
HUE_BRIDGE_IP=192.168.1.x
HUE_USERNAME=your-username
HUE_CLIENT_KEY=your-client-key
```

## Building from Source

Requires:
1. **Philips Hue EDK** - Contact Signify for access
2. **C++ Build Tools:**
   - Windows: Visual Studio Build Tools
   - macOS: Xcode Command Line Tools
   - Linux: build-essential, cmake
3. **Node.js:** Version 18+

