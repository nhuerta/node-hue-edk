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

## Quick Start

### 1. Install

```bash
mkdir my-hue-project && cd my-hue-project
bun init -y
bun install github:nhuerta/node-hue-edk#semver:^1.0.0
```

### 2. Configure Bridge

Create `.env` file:

```env
HUE_BRIDGE_ID=your-bridge-id
HUE_BRIDGE_IP=192.168.1.x
HUE_USERNAME=your-username
HUE_CLIENT_KEY=your-client-key
```

> **Note:** Get these values from your Hue bridge setup. The bridge creates a `bridge.json` file automatically - this is git-ignored and not required for configuration.

### 3. Create Test Script

`test.ts`:
```typescript
import 'dotenv/config';
import { Hue, COLORS } from '@nhuerta/node-hue-edk';

const hue = new Hue({
    appName: 'TestApp',
    deviceName: 'TestDevice',
    groupId: '200'  // Your entertainment group ID
});

if (await hue.initialize()) {
    hue.setSolidColor(COLORS.green);
    setTimeout(() => hue.shutdown(), 2000);
}
```

### 4. Run

```bash
bun run test.ts
```

## Effects

This library includes 40+ effects. See [EFFECTS.md](EFFECTS.md) for complete documentation.

**Examples:**
```typescript
hue.percentageBar(75);
hue.gradientWave(COLORS.red, COLORS.yellow, 2000, 5000);
hue.rainbowWave(2000, 5000);
hue.countdownPulse(30);
hue.lightningStrike(1000);
```


## Building from Source

Requires:
1. **Philips Hue EDK** - Contact Signify for access
2. **C++ Build Tools:**
   - Windows: Visual Studio Build Tools
   - macOS: Xcode Command Line Tools
   - Linux: build-essential, cmake
3. **Node.js:** Version 18+

