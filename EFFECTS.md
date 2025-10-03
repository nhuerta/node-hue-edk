# Hue Effects Reference

Complete documentation for all 40+ light effects available in `@nhuerta/node-hue-edk`.

## Table of Contents

- [Basic Control](#basic-control)
- [Gradient Effects](#gradient-effects)
- [Pulse & Breathing](#pulse--breathing)
- [Movement Effects](#movement-effects)
- [Countdown Effects](#countdown-effects)
- [Flash Effects](#flash-effects)
- [Bouncing Effects](#bouncing-effects)
- [Color Sequence](#color-sequence)
- [Explosion Effects](#explosion-effects)
- [Environmental Effects](#environmental-effects)
- [Advanced Effects](#advanced-effects)
- [Game-Specific Effects](#game-specific-effects)

---

## Basic Control

### `setSolidColor(color: Color)`
Set all lights to a single solid color.

```typescript
hue.setSolidColor(COLORS.blue);
hue.setSolidColor({ r: 255, g: 128, b: 0 });
```

### `clearAllLights()`
Turn off all lights immediately.

```typescript
hue.clearAllLights();
```

### `stopCurrentEffect()`
Stop the currently running effect.

```typescript
hue.stopCurrentEffect();
```

---

## Gradient Effects

### `gradientWave(color1: Color, color2: Color, duration: number, runTime: number)`
Smooth wave that transitions between two colors across segments.

**Parameters:**
- `color1` - Start color
- `color2` - End color
- `duration` - Wave cycle time in ms (default: 2000)
- `runTime` - Total effect duration in ms (default: 0 = infinite)

```typescript
hue.gradientWave(COLORS.red, COLORS.yellow, 2000, 5000);
```

### `rippleGradient(color: Color, duration: number, runTime: number)`
Ripple effect emanating from center, fading with distance.

**Parameters:**
- `color` - Ripple color
- `duration` - Ripple cycle time in ms (default: 1000)
- `runTime` - Total effect duration (default: 0 = infinite)

```typescript
hue.rippleGradient(COLORS.purple, 1000, 3000);
```

### `breathingGradient(color1: Color, color2: Color, period: number, runTime: number)`
Smooth breathing effect with gradient between two colors.

**Parameters:**
- `color1` - First gradient color
- `color2` - Second gradient color
- `period` - Breathing cycle time in ms (default: 3000)
- `runTime` - Total effect duration (default: 0 = infinite)

```typescript
hue.breathingGradient(COLORS.red, COLORS.black, 1500);
```

---

## Pulse & Breathing

### `pulseWave(color1: Color, color2: Color, speed: number, runTime: number)`
Pulsing wave effect with sinusoidal interpolation between colors.

**Parameters:**
- `color1` - First pulse color
- `color2` - Second pulse color
- `speed` - Pulse speed in ms (default: 1000)
- `runTime` - Total duration (default: 0 = infinite)

```typescript
hue.pulseWave(COLORS.cyan, COLORS.white, 1000, 3000);
```

### `acceleratingPulse(color: Color, pulseCount: number, startSpeed: number, endSpeed: number)`
Pulses between color and black with exponentially increasing speed.

**Parameters:**
- `color` - Pulse color
- `pulseCount` - Number of pulses (default: 5)
- `startSpeed` - Initial pulse speed in ms (default: 800)
- `endSpeed` - Final pulse speed in ms (default: 100)

```typescript
hue.acceleratingPulse(COLORS.red, 5, 800, 100);
```

---

## Movement Effects

### `chaseGradient(color: Color, speed: number, runTime: number)`
Chasing light effect with gradient trail.

**Parameters:**
- `color` - Chase color
- `speed` - Chase speed in ms (default: 500)
- `runTime` - Total duration (default: 0 = infinite)

```typescript
hue.chaseGradient(COLORS.orange, 500, 5000);
```

### `rainbowWave(speed: number, runTime: number)`
Full spectrum rainbow wave cycling across segments.

**Parameters:**
- `speed` - Wave cycle speed in ms (default: 2000)
- `runTime` - Total duration (default: 0 = infinite)

```typescript
hue.rainbowWave(2000, 5000);
```

---

## Countdown Effects

### `countdownPulse(totalSeconds: number)`
Pulsing countdown from dark red → yellow → green. Accelerates as time runs out.

**Parameters:**
- `totalSeconds` - Countdown duration in seconds

**Behavior:**
- 66-100%: Dark red
- 33-66%: Red → yellow
- 0-33%: Yellow → green
- On complete: White flash → green

```typescript
hue.countdownPulse(30);  // 30 second countdown
```

### `countdownPulseWithColors(totalSeconds: number, startColor: Color, endColor: Color)`
Customizable countdown pulse with your own colors.

```typescript
hue.countdownPulseWithColors(30, COLORS.blue, COLORS.white);
```

### `segmentedCountdownPulse(totalSeconds: number)`
Each segment counts down independently with different colors.

**Default colors:**
- Segment 0: Red → Green
- Segment 1: Purple → Cyan
- Segment 2: Blue → Yellow

```typescript
hue.segmentedCountdownPulse(30);
```

### `segmentedCountdownPulseWithColors(...)`
Fully customizable per-segment countdown colors.

```typescript
hue.segmentedCountdownPulseWithColors(
    30,
    COLORS.red, COLORS.green,      // Segment 0
    COLORS.purple, COLORS.cyan,    // Segment 1
    COLORS.blue, COLORS.yellow     // Segment 2
);
```

---

## Flash Effects

### `flashColor(color: Color, duration: number)`
Quick bright flash that fades exponentially.

**Parameters:**
- `color` - Flash color
- `duration` - Flash duration in ms (default: 500)

```typescript
hue.flashColor(COLORS.white, 500);
```

### `strobeLight(color: Color, duration: number, strobeSpeed: number)`
Fast on/off strobe effect.

**Parameters:**
- `color` - Strobe color
- `duration` - Total duration in ms (default: 1000)
- `strobeSpeed` - On/off cycle speed in ms (default: 50 = 20Hz)

```typescript
hue.strobeLight(COLORS.white, 1000, 50);
```

### `policeFlash(flashCount: number, flashSpeed: number)`
Red/white/blue/white police-style flash pattern.

```typescript
hue.policeFlash(6, 150);
```

### `policeFlashPro(duration: number)`
Professional police flash using precise HSB and color temperature values.

```typescript
hue.policeFlashPro(3000);
```

### `mexicanFlag(flashCount: number, flashSpeed: number)`
Red/white/green/white flash sequence.

```typescript
hue.mexicanFlag(6, 150);
```

---

## Bouncing Effects

### `bouncingWave(color1: Color, color2: Color, speed: number, runTime: number)`
Single light bounces back and forth, interpolating between colors.

```typescript
hue.bouncingWave(COLORS.red, COLORS.blue, 2000, 5000);
```

### `pulsingBounce(color1: Color, color2: Color, bounceSpeed: number, pulseSpeed: number, runTime: number)`
Bouncing effect with additional pulsing brightness modulation.

```typescript
hue.pulsingBounce(COLORS.cyan, COLORS.magenta, 2000, 500, 5000);
```

### `fadeBounce(color1: Color, color2: Color, speed: number, runTime: number)`
Bouncing light with fading trail that decays exponentially.

```typescript
hue.fadeBounce(COLORS.orange, COLORS.purple, 2000, 5000);
```

### `doubleBounce(color1: Color, color2: Color, speed: number, runTime: number)`
Two lights bouncing in opposite directions simultaneously.

```typescript
hue.doubleBounce(COLORS.red, COLORS.blue, 2000, 5000);
```

---

## Color Sequence

### `flashingColorSequence(colorSequence: Color[], flashCount: number, flashSpeed: number)`
Cycles through array of colors with quick flashes.

```typescript
hue.flashingColorSequence(
    [COLORS.red, COLORS.white, COLORS.blue],
    6,
    150
);
```

### `randomColorSequence(duration: number)`
Randomly selects 4-6 colors and flashes them in sequence.

```typescript
hue.randomColorSequence(3000);
```

---

## Explosion Effects

### `explosionFlash(baseColor: Color, flashColor: Color, duration: number)`
Intense flash with exponential decay, simulating explosion.

**Parameters:**
- `baseColor` - Base/ambient color (default: orange)
- `flashColor` - Flash peak color (default: white)
- `duration` - Total effect duration (default: 1500)

```typescript
hue.explosionFlash(COLORS.orange, COLORS.white, 1500);
```

### `explosionFlashRipple(baseColor: Color, flashColor: Color, duration: number)`
Explosion that ripples outward from center with distance-based delay.

```typescript
hue.explosionFlashRipple(COLORS.darkRed, COLORS.yellow, 2000);
```

---

## Environmental Effects

### `sunriseEffect(duration: number)`
Simulates sunrise using color temperature (2000K → 6500K) with exponential brightness curve.

```typescript
hue.sunriseEffect(3000);
```

### `dayNightCycle(duration: number)`
Full day cycle: Morning → Noon → Evening → Night with color temperature transitions.

```typescript
hue.dayNightCycle(3000);
```

### `candlelightFlicker(duration: number)`
Realistic candle flame simulation with random flicker and warm color temp (2200K).

```typescript
hue.candlelightFlicker(3000);
```

---

## Advanced Effects

### `xyPrecisionRainbow(duration: number)`
Scientifically accurate rainbow using CIE XY color space coordinates.

```typescript
hue.xyPrecisionRainbow(3000);
```

### `multiLayerAlphaBlend(duration: number)`
Demonstrates alpha blending with multiple overlaid layers:
- Base: Orange
- Layer 1: Pulsing blue overlay (50% opacity)
- Layer 2: Sweeping white highlight

```typescript
hue.multiLayerAlphaBlend(3000);
```

### `brightnessWave(baseColor: Color, duration: number)`
Maintains constant color while creating wave pattern with brightness variation.

```typescript
hue.brightnessWave(COLORS.purple, 3000);
```

---

## Game-Specific Effects

### `percentageBar(percentage: number)`
Health bar visualization with color-coded levels:
- 80-100%: Green
- 60-80%: Yellow-green
- 40-60%: Orange
- 20-40%: Red-orange
- 0-20%: Red

```typescript
hue.percentageBar(75);  // Shows 75% health
```

### `meteorShower(color1: Color, color2: Color, duration: number)`
Rapid cascading lights simulating falling stars.

```typescript
hue.meteorShower(COLORS.white, COLORS.blue, 2500);
```

### `doubleStrike(color: Color, duration: number)`
Two quick impact flashes with slight color variation (for abilities that hit twice).

```typescript
hue.doubleStrike(COLORS.red, 500);
```

### `timeRewind(color1: Color, color2: Color, duration: number)`
Reverse color progression with temporal distortion and flickering.

```typescript
hue.timeRewind(COLORS.purple, COLORS.cyan, 3000);
```

### `shockwave(color: Color, duration: number)`
Expanding ring effect that fades as it spreads.

```typescript
hue.shockwave(COLORS.white, 1500);
```

### `energyBurst(color: Color, duration: number)`
Instant bright flash with rapid fade (powerful impact effect).

```typescript
hue.energyBurst(COLORS.electricBlue, 800);
```

### `spiralVortex(color1: Color, color2: Color, duration: number)`
Rotating color spiral with depth modulation.

```typescript
hue.spiralVortex(COLORS.purple, COLORS.cyan, 2000);
```

### `lightningStrike(duration: number)`
Sharp white flash followed by electric blue afterglow with random flickering.

```typescript
hue.lightningStrike(1000);
```

### `poisonDrip(duration: number)`
Toxic green effect that drips downward with bubbling animation.

```typescript
hue.poisonDrip(3000);
```

### `iceShatter(duration: number)`
Bright ice blue freeze followed by fragmenting shatter effect.

```typescript
hue.iceShatter(1500);
```

### `fadeToBlack()`
Smooth fade from blood red to black over 60 steps.

```typescript
hue.fadeToBlack();
```

---

## Effect Categories

**Status Indicators:**
- `percentageBar()` - Health/progress bars

**Countdowns:**
- `countdownPulse()` - Standard countdown
- `segmentedCountdownPulse()` - Multi-segment countdown

**Impact/Attack:**
- `flashColor()` - Quick strike
- `doubleStrike()` - Double-hit attack
- `shockwave()` - Area effect
- `energyBurst()` - Powerful impact

**Elemental:**
- `lightningStrike()` - Lightning
- `iceShatter()` - Ice/freeze
- `poisonDrip()` - Poison/toxic
- `explosionFlash()` - Fire/explosion

**Ambient:**
- `breathingGradient()` - Calm breathing
- `candlelightFlicker()` - Candle ambiance
- `sunriseEffect()` - Natural sunrise
- `rainbowWave()` - Colorful atmosphere

**Movement:**
- `gradientWave()` - Smooth wave
- `chaseGradient()` - Chase effect
- `bouncingWave()` - Bouncing light
- `meteorShower()` - Falling lights

---

## Color Type

```typescript
interface Color {
    r: number;        // Red: 0-255
    g: number;        // Green: 0-255
    b: number;        // Blue: 0-255
    alpha?: number;   // Alpha: 0-1 (optional, for blending)
}
```

## Predefined Colors (COLORS)

39 colors available: `red`, `green`, `blue`, `yellow`, `purple`, `cyan`, `white`, `orange`, `pink`, `darkRed`, `brightGreen`, `emerald`, `electricBlue`, `iceBlue`, `gold`, `amber`, `scarlet`, `violet`, `magenta`, `indigo`, `crimson`, `coral`, `rose`, `sapphire`, `skyBlue`, `babyBlue`, `lightBlue`, `deepBlue`, `forestGreen`, `limeGreen`, `hotPink`, `darkViolet`, `redOrange`, `darkOrange`, `lightYellow`, `bloodRed`, `black`, `ghostWhite`.

---

## Performance Notes

- All effects run at 60 FPS (16ms update interval)
- Effects use native EDK render thread for optimal performance
- Multiple effects can be queued (new effect stops previous)
- `runTime: 0` means effect runs indefinitely until stopped
