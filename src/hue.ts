import type { HueWrapper as HueWrapperType } from './native';
import { HueLightControl, COLORS, interpolateColor, hsvToRgb, type Color } from './hue-light-control';
import { BRIDGE_CONFIG } from './config';

export interface HueConfig {
    appName: string;
    deviceName: string;
    groupId: string;
}

interface HueAddon {
    HueWrapper: typeof HueWrapperType;
}

// Load native addon using node-gyp-build (platform-independent)
const gyp = require('node-gyp-build');
const path = require('path');
const addon = gyp(path.join(__dirname, '..')) as HueAddon;
const { HueWrapper } = addon;

export class Hue {
    private hueWrapper: HueWrapperType;
    private hueLightControl: HueLightControl;
    private groupId: string;
    private effectRunning: boolean = false;
    private updateInterval: ReturnType<typeof setTimeout> | null = null;
    private effectStartTime: number = 0;
    private debugLogEnabled: boolean = false;

    constructor(config: HueConfig) {
        this.groupId = config.groupId;
        this.hueWrapper = new HueWrapper(config.appName, config.deviceName);
        this.hueLightControl = new HueLightControl(this.hueWrapper);
    }

    async initialize(): Promise<boolean> {
        try {
            const initResult = this.hueWrapper.initialize();
            if (!initResult || !initResult.success) {
                console.log('Hue init failed:', initResult);
                return false;
            }

            const connected = this.hueWrapper.connectManual(BRIDGE_CONFIG);
            if (!connected) {
                console.log('Hue connection failed');
                return false;
            }

            this.hueWrapper.selectGroup(this.groupId);
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.hueWrapper.getStatus();

            const streaming = this.hueWrapper.start();
            if (!streaming) {
                console.log('Hue streaming failed');
                return false;
            }

            console.log('Hue initialized successfully');
            return true;
        } catch (error) {
            console.log('Hue initialization error:', error);
            return false;
        }
    }

    shutdown(): void {
        this.clearAllLights();
        try {
            this.hueWrapper.stop();
            this.hueWrapper.shutdown();
        } catch {
        }
    }

    stopCurrentEffect(): void {
        this.effectRunning = false;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    clearAllLights(): void {
        this.stopCurrentEffect();
        this.hueLightControl.clearAllSegments();
        this.hueLightControl.sendToDevice();
    }

    setSolidColor(color: Color): void {
        this.hueLightControl.setAllSegments(color);
        this.hueLightControl.sendToDevice();
    }

    private startUpdateLoop(updateFunc: (elapsed: number) => void): void {
        this.stopCurrentEffect();
        this.effectRunning = true;
        this.effectStartTime = Date.now();

        const update = () => {
            if (!this.effectRunning) {
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                    this.updateInterval = null;
                }
                return;
            }
            const elapsed = Date.now() - this.effectStartTime;
            updateFunc(elapsed);
            this.hueLightControl.sendToDevice();
        };

        update();
        this.updateInterval = setInterval(update, 16);
    }

    percentageBar(percentage: number): void {
        const level = percentage / 100;
        this.hueLightControl.segments.forEach((segId, index) => {
            const segmentLevel = Math.max(0, Math.min(1,
                level + (index - 1.5) * 0.1
            ));

            let color;
            if (segmentLevel > 0.8) {
                color = interpolateColor(COLORS.limeGreen, COLORS.brightGreen, (segmentLevel - 0.8) * 5);
            } else if (segmentLevel > 0.6) {
                color = interpolateColor({ r: 255, g: 200, b: 0 }, COLORS.limeGreen, (segmentLevel - 0.6) * 5);
            } else if (segmentLevel > 0.4) {
                color = interpolateColor({ r: 255, g: 100, b: 0 }, { r: 255, g: 200, b: 0 }, (segmentLevel - 0.4) * 5);
            } else if (segmentLevel > 0.2) {
                color = interpolateColor(COLORS.red, { r: 255, g: 100, b: 0 }, (segmentLevel - 0.2) * 5);
            } else {
                color = COLORS.red;
            }

            this.hueLightControl.setSegmentColor(segId, color);
        });
        this.hueLightControl.sendToDevice();
    }

    gradientWave(color1: Color, color2: Color, duration: number = 2000, runTime: number = 0): void {
        this.startUpdateLoop((elapsed) => {
            if (runTime > 0 && Date.now() > this.effectStartTime + runTime) {
                this.stopCurrentEffect();
                return;
            }

            const phase = (elapsed % duration) / duration;
            this.hueLightControl.segments.forEach((segId, index) => {
                const wavePos = (index / Math.max(1, this.hueLightControl.segments.length - 1) + phase) % 1;
                const color = interpolateColor(color1, color2, wavePos);
                this.hueLightControl.setSegmentColor(segId, color);
            });
        });
    }

    rippleGradient(color: Color, duration: number = 1000, runTime: number = 0): void {
        this.startUpdateLoop((elapsed) => {
            if (runTime > 0 && Date.now() > this.effectStartTime + runTime) {
                this.stopCurrentEffect();
                return;
            }

            const ripplePhase = (elapsed % duration) / duration;
            this.hueLightControl.segments.forEach((segId, index) => {
                const distance = Math.abs(index - 1.5) / 1.5;
                const brightness = Math.max(0, 1 - Math.abs(ripplePhase - distance));
                const dimmedColor = {
                    r: Math.round(color.r * brightness),
                    g: Math.round(color.g * brightness),
                    b: Math.round(color.b * brightness)
                };
                this.hueLightControl.setSegmentColor(segId, dimmedColor);
            });
        });
    }

    breathingGradient(color1: Color, color2: Color, period: number = 3000, runTime: number = 0): void {
        this.startUpdateLoop((elapsed) => {
            if (runTime > 0 && Date.now() > this.effectStartTime + runTime) {
                this.stopCurrentEffect();
                return;
            }

            const phase = (elapsed % period) / period;
            const brightness = 0.3 + 0.7 * (Math.sin(phase * Math.PI * 2) * 0.5 + 0.5);

            this.hueLightControl.segments.forEach((segId, index) => {
                const gradPos = index / Math.max(1, this.hueLightControl.segments.length - 1);
                const color = interpolateColor(color1, color2, gradPos);
                const dimmedColor = {
                    r: Math.round(color.r * brightness),
                    g: Math.round(color.g * brightness),
                    b: Math.round(color.b * brightness)
                };
                this.hueLightControl.setSegmentColor(segId, dimmedColor);
            });
        });
    }

    chaseGradient(color: Color, speed: number = 500, runTime: number = 0): void {
        const endTime = runTime > 0 ? this.effectStartTime + runTime : Infinity;
        let position = 0;

        this.startUpdateLoop((_elapsed) => {
            if (Date.now() > endTime) {
                this.stopCurrentEffect();
                return;
            }

            this.hueLightControl.segments.forEach((segId, index) => {
                const distance = Math.min(
                    Math.abs(index - position),
                    Math.abs(index - position + 4),
                    Math.abs(index - position - 4)
                );
                const brightness = Math.max(0, 1 - (distance * 0.4));
                const dimmedColor = {
                    r: Math.round(color.r * brightness),
                    g: Math.round(color.g * brightness),
                    b: Math.round(color.b * brightness)
                };
                this.hueLightControl.setSegmentColor(segId, dimmedColor);
            });

            position = (position + (speed / 1000)) % 4;
        });
    }

    rainbowWave(speed: number = 2000, runTime: number = 0): void {
        this.startUpdateLoop((elapsed) => {
            if (runTime > 0 && Date.now() > this.effectStartTime + runTime) {
                this.stopCurrentEffect();
                return;
            }

            const hueShift = (elapsed % speed) / speed;
            this.hueLightControl.segments.forEach((segId, index) => {
                const hue_value = (hueShift + index * 0.25) % 1;
                const color = hsvToRgb(hue_value, 1, 1);
                this.hueLightControl.setSegmentColor(segId, color);
            });
        });
    }

    pulseWave(color1: Color, color2: Color, speed: number = 1000, runTime: number = 0): void {
        this.startUpdateLoop((elapsed) => {
            if (runTime > 0 && Date.now() > this.effectStartTime + runTime) {
                this.stopCurrentEffect();
                return;
            }

            const phase = (elapsed % speed) / speed;
            this.hueLightControl.segments.forEach((segId, index) => {
                const segPhase = (phase + index * 0.25) % 1;
                const pulseFactor = Math.sin(segPhase * Math.PI) ** 2;
                const color = interpolateColor(color1, color2, pulseFactor);
                this.hueLightControl.setSegmentColor(segId, color);
            });
        });
    }

    countdownPulse(totalSeconds: number): void {
        this.countdownPulseWithColors(totalSeconds, COLORS.darkRed, COLORS.brightGreen);
    }

    countdownPulseWithColors(totalSeconds: number, startColor: Color = COLORS.darkRed, endColor: Color = COLORS.brightGreen): void {
        const totalMs = totalSeconds * 1000;
        const midColor = { r: 255, g: 200, b: 0 }; // Yellow/orange transition color

        this.startUpdateLoop((elapsed) => {
            if (elapsed > totalMs) {
                this.stopCurrentEffect();
                this.hueLightControl.setAllSegments(COLORS.white);
                this.hueLightControl.sendToDevice();

                setTimeout(() => {
                    this.hueLightControl.setAllSegments(endColor);
                    this.hueLightControl.sendToDevice();
                }, 200);
                return;
            }

            const timeLeft = 1 - (elapsed / totalMs);
            const pulseSpeed = 2000 * timeLeft + 200;
            const phase = (elapsed % pulseSpeed) / pulseSpeed;
            const brightness = 0.2 + 0.8 * Math.sin(phase * Math.PI);

            let color;
            if (timeLeft > 0.66) {
                // First third: use start color
                color = startColor;
            } else if (timeLeft > 0.33) {
                // Middle third: interpolate from start color to mid color
                color = interpolateColor(startColor, midColor, (0.66 - timeLeft) * 3);
            } else {
                // Final third: interpolate from mid color to end color
                color = interpolateColor(midColor, endColor, (0.33 - timeLeft) * 3);
            }

            const dimmedColor = {
                r: Math.round(color.r * brightness),
                g: Math.round(color.g * brightness),
                b: Math.round(color.b * brightness)
            };
            this.hueLightControl.setAllSegments(dimmedColor);
        });
    }

    segmentedCountdownPulse(totalSeconds: number): void {
        // Default colors for each segment
        this.segmentedCountdownPulseWithColors(
            totalSeconds,
            COLORS.red, COLORS.green,           // Segment 0: Red to Green
            COLORS.purple, COLORS.cyan,          // Segment 1: Purple to Cyan
            COLORS.blue, COLORS.yellow           // Segment 2: Blue to Yellow
        );
    }

    segmentedCountdownPulseWithColors(
        totalSeconds: number,
        seg0StartColor: Color, seg0EndColor: Color,
        seg1StartColor: Color, seg1EndColor: Color,
        seg2StartColor: Color, seg2EndColor: Color
    ): void {
        const totalMs = totalSeconds * 1000;
        const midColor = { r: 255, g: 200, b: 0 }; // Yellow/orange transition color

        // Store segment colors in an array for easier access
        const segmentConfigs = [
            { start: seg0StartColor, end: seg0EndColor },
            { start: seg1StartColor, end: seg1EndColor },
            { start: seg2StartColor, end: seg2EndColor }
        ];

        this.startUpdateLoop((elapsed) => {
            if (elapsed > totalMs) {
                this.stopCurrentEffect();

                // Flash white on all segments
                this.hueLightControl.setAllSegments(COLORS.white);
                this.hueLightControl.sendToDevice();

                // After 200ms, show each segment's end color
                setTimeout(() => {
                    segmentConfigs.forEach((config, index) => {
                        this.hueLightControl.setSegmentColor(index, config.end);
                    });
                    this.hueLightControl.sendToDevice();
                }, 200);
                return;
            }

            const timeLeft = 1 - (elapsed / totalMs);

            // Process each segment independently
            this.hueLightControl.segments.forEach((segId, index) => {
                const config = segmentConfigs[index];
                if (!config) {
                    return;
                }

                // Add phase offset for each segment to create variety
                const phaseOffset = (index * 0.33) * Math.PI;
                const pulseSpeed = 2000 * timeLeft + 200;
                const phase = ((elapsed % pulseSpeed) / pulseSpeed) + phaseOffset;
                const brightness = 0.2 + 0.8 * Math.sin(phase * Math.PI);

                let color;
                if (timeLeft > 0.66) {
                    // First third: use start color
                    color = config.start;
                } else if (timeLeft > 0.33) {
                    // Middle third: interpolate from start color to mid color
                    color = interpolateColor(config.start, midColor, (0.66 - timeLeft) * 3);
                } else {
                    // Final third: interpolate from mid color to end color
                    color = interpolateColor(midColor, config.end, (0.33 - timeLeft) * 3);
                }

                const dimmedColor = {
                    r: Math.round(color.r * brightness),
                    g: Math.round(color.g * brightness),
                    b: Math.round(color.b * brightness)
                };

                this.hueLightControl.setSegmentColor(segId, dimmedColor);
            });
        });
    }

    flashColor(color: Color, duration: number = 500): void {
        const steps = Math.floor(duration / 16);
        let step = 0;

        this.startUpdateLoop((_elapsed) => {
            if (step >= steps) {
                this.stopCurrentEffect();
                this.hueLightControl.clearAllSegments();
                this.hueLightControl.sendToDevice();
                return;
            }

            const factor = 1 - (step / steps);
            const brightness = factor ** 2;

            this.hueLightControl.segments.forEach((segId, index) => {
                const segmentFactor = Math.max(0, brightness - (index * 0.1));
                const dimmedColor = {
                    r: Math.round(color.r * segmentFactor),
                    g: Math.round(color.g * segmentFactor),
                    b: Math.round(color.b * segmentFactor)
                };
                this.hueLightControl.setSegmentColor(segId, dimmedColor);
            });

            step++;
        });
    }

    bouncingWave(color1: Color, color2: Color, speed: number = 2000, runTime: number = 0): void {
        this.startUpdateLoop((elapsed) => {
            if (runTime > 0 && Date.now() > this.effectStartTime + runTime) {
                this.stopCurrentEffect();
                this.hueLightControl.clearAllSegments();
                this.hueLightControl.sendToDevice();
                return;
            }

            const cyclePosition = (elapsed % speed) / speed;
            let activeSegment;
            if (cyclePosition < 0.5) {
                activeSegment = Math.floor(cyclePosition * 8) % 4;
            } else {
                activeSegment = 3 - Math.floor((cyclePosition - 0.5) * 8) % 4;
            }

            this.hueLightControl.segments.forEach((segId, index) => {
                if (index === activeSegment) {
                    const colorFactor = index / Math.max(1, this.hueLightControl.segments.length - 1);
                    const color = interpolateColor(color1, color2, colorFactor);
                    this.hueLightControl.setSegmentColor(segId, color);
                } else {
                    this.hueLightControl.clearSegment(segId);
                }
            });
        });
    }

    pulsingBounce(color1: Color, color2: Color, bounceSpeed: number = 2000, pulseSpeed: number = 500, runTime: number = 0): void {
        this.startUpdateLoop((elapsed) => {
            if (runTime > 0 && Date.now() > this.effectStartTime + runTime) {
                this.stopCurrentEffect();
                this.hueLightControl.clearAllSegments();
                this.hueLightControl.sendToDevice();
                return;
            }

            const cyclePosition = (elapsed % bounceSpeed) / bounceSpeed;
            const pulsePhase = (elapsed % pulseSpeed) / pulseSpeed;
            const brightness = 0.5 + 0.5 * Math.sin(pulsePhase * Math.PI * 2);

            let activeSegment;
            if (cyclePosition < 0.5) {
                activeSegment = Math.floor(cyclePosition * 8) % 4;
            } else {
                activeSegment = 3 - Math.floor((cyclePosition - 0.5) * 8) % 4;
            }

            this.hueLightControl.segments.forEach((segId, index) => {
                if (index === activeSegment) {
                    const colorFactor = index / Math.max(1, this.hueLightControl.segments.length - 1);
                    const color = interpolateColor(color1, color2, colorFactor);
                    const dimmedColor = {
                        r: Math.round(color.r * brightness),
                        g: Math.round(color.g * brightness),
                        b: Math.round(color.b * brightness)
                    };
                    this.hueLightControl.setSegmentColor(segId, dimmedColor);
                } else {
                    this.hueLightControl.clearSegment(segId);
                }
            });
        });
    }

    fadeBounce(color1: Color, color2: Color, speed: number = 2000, runTime: number = 0): void {
        const trailBrightness: number[] = [0, 0, 0, 0];

        this.startUpdateLoop((elapsed) => {
            if (runTime > 0 && Date.now() > this.effectStartTime + runTime) {
                this.stopCurrentEffect();
                this.hueLightControl.clearAllSegments();
                this.hueLightControl.sendToDevice();
                return;
            }

            const cyclePosition = (elapsed % speed) / speed;
            let activeSegment;
            if (cyclePosition < 0.5) {
                activeSegment = Math.floor(cyclePosition * 8) % 4;
            } else {
                activeSegment = 3 - Math.floor((cyclePosition - 0.5) * 8) % 4;
            }

            this.hueLightControl.segments.forEach((segId, index) => {
                if (index === activeSegment) {
                    trailBrightness[index] = 1.0;
                } else {
                    trailBrightness[index] = (trailBrightness[index] ?? 0) * 0.85;
                }

                const colorFactor = index / 3;
                const color = interpolateColor(color1, color2, colorFactor);
                const brightness = trailBrightness[index] ?? 0;
                const dimmedColor = {
                    r: Math.round(color.r * brightness),
                    g: Math.round(color.g * brightness),
                    b: Math.round(color.b * brightness)
                };
                this.hueLightControl.setSegmentColor(segId, dimmedColor);
            });
        });
    }

    doubleBounce(color1: Color, color2: Color, speed: number = 2000, runTime: number = 0): void {
        this.startUpdateLoop((elapsed) => {
            if (runTime > 0 && Date.now() > this.effectStartTime + runTime) {
                this.stopCurrentEffect();
                this.hueLightControl.clearAllSegments();
                this.hueLightControl.sendToDevice();
                return;
            }

            const cyclePosition = (elapsed % speed) / speed;

            let wave1Segment;
            if (cyclePosition < 0.5) {
                wave1Segment = Math.floor(cyclePosition * 8) % 4;
            } else {
                wave1Segment = 3 - Math.floor((cyclePosition - 0.5) * 8) % 4;
            }

            let wave2Segment;
            if (cyclePosition < 0.5) {
                wave2Segment = 3 - Math.floor(cyclePosition * 8) % 4;
            } else {
                wave2Segment = Math.floor((cyclePosition - 0.5) * 8) % 4;
            }

            this.hueLightControl.segments.forEach((segId, index) => {
                let brightness = 0;
                let useColor1 = false;

                if (index === wave1Segment) {
                    brightness = 1.0;
                    useColor1 = true;
                }
                if (index === wave2Segment) {
                    brightness = Math.max(brightness, 0.8);
                    useColor1 = false;
                }

                if (brightness > 0) {
                    const color = useColor1 ? color1 : color2;
                    const dimmedColor = {
                        r: Math.round(color.r * brightness),
                        g: Math.round(color.g * brightness),
                        b: Math.round(color.b * brightness)
                    };
                    this.hueLightControl.setSegmentColor(segId, dimmedColor);
                } else {
                    this.hueLightControl.clearSegment(segId);
                }
            });
        });
    }

    flashingColorSequence(colorSequence: Color[], flashCount: number = 6, flashSpeed: number = 150): void {
        let currentFlash = 0;
        let colorIndex = 0;

        this.startUpdateLoop((elapsed) => {
            const flashNumber = Math.floor(elapsed / flashSpeed);

            if (flashNumber >= flashCount * colorSequence.length) {
                this.stopCurrentEffect();
                this.hueLightControl.clearAllSegments();
                this.hueLightControl.sendToDevice();
                return;
            }

            if (flashNumber > currentFlash) {
                currentFlash = flashNumber;
                colorIndex = flashNumber % colorSequence.length;
                const color = colorSequence[colorIndex] || COLORS.black;
                this.hueLightControl.setAllSegments(color);
                this.hueLightControl.sendToDevice();
            }
        });
    }

    policeFlash(flashCount: number = 6, flashSpeed: number = 150): void {
        this.flashingColorSequence([COLORS.red, COLORS.white, COLORS.blue, COLORS.white], flashCount, flashSpeed);
    }

    mexicanFlag(flashCount: number = 6, flashSpeed: number = 150): void {
        this.flashingColorSequence([COLORS.red, COLORS.white, COLORS.emerald, COLORS.white], flashCount, flashSpeed);
    }

    fadeToBlack(): void {
        const steps = 60;
        let step = 0;

        this.startUpdateLoop((_elapsed) => {
            if (step >= steps) {
                this.stopCurrentEffect();
                this.hueLightControl.clearAllSegments();
                this.hueLightControl.sendToDevice();
                return;
            }

            const factor = 1 - (step / steps);
            const color = COLORS.bloodRed;
            const dimmedColor = {
                r: Math.round(color.r * factor),
                g: Math.round(color.g * factor),
                b: Math.round(color.b * factor)
            };
            this.hueLightControl.setAllSegments(dimmedColor);
            step++;
        });
    }

    /**
     * Pulses between a color and black with accelerating speed
     * Starts slow and speeds up with each pulse
     */
    acceleratingPulse(color: Color, pulseCount: number = 5, startSpeed: number = 800, endSpeed: number = 100): void {
        let currentPulse = 0;
        let pulseStartTime = 0;
        let isOn = true;

        this.startUpdateLoop((elapsed) => {
            if (currentPulse >= pulseCount) {
                this.stopCurrentEffect();
                this.hueLightControl.clearAllSegments();
                this.hueLightControl.sendToDevice();
                return;
            }

            // Calculate current pulse speed (exponential acceleration)
            const progress = currentPulse / Math.max(1, pulseCount - 1);
            const currentSpeed = startSpeed * Math.pow(endSpeed / startSpeed, progress);

            // Check if we should toggle
            if (elapsed - pulseStartTime >= currentSpeed) {
                if (isOn) {
                    // Turn off
                    this.hueLightControl.clearAllSegments();
                    isOn = false;
                } else {
                    // Turn on with color
                    this.hueLightControl.setAllSegments(color);
                    isOn = true;
                    currentPulse++;
                }
                this.hueLightControl.sendToDevice();
                pulseStartTime = elapsed;
            }
        });
    }

    /**
     * Fast strobe light effect with consistent speed
     * @param color - Color to strobe
     * @param duration - Total duration in milliseconds (default 1000ms)
     * @param strobeSpeed - Speed of each on/off cycle in milliseconds (default 50ms = 20Hz)
     */
    strobeLight(color: Color, duration: number = 1000, strobeSpeed: number = 50): void {
        let isOn = false;
        let lastToggle = 0;

        this.startUpdateLoop((elapsed) => {
            if (elapsed >= duration) {
                this.stopCurrentEffect();
                this.hueLightControl.clearAllSegments();  // End in OFF
                this.hueLightControl.sendToDevice();
                return;
            }

            if (elapsed - lastToggle >= strobeSpeed) {
                if (!isOn) {
                    this.hueLightControl.setAllSegments(color);
                    isOn = true;
                } else {
                    this.hueLightControl.clearAllSegments();
                    isOn = false;
                }
                this.hueLightControl.sendToDevice();
                lastToggle = elapsed;
            }
        });
    }

    randomColorSequence(duration: number = 3000): void {
        // Pick 4-6 random colors for variety (same as generateRandomColorEffect)
        const sequenceLength = Math.floor(Math.random() * 3) + 4;

        // Pick random colors ensuring no duplicates for variety
        const colorNames = Object.keys(COLORS) as (keyof typeof COLORS)[];
        const shuffled = [...colorNames].sort(() => Math.random() - 0.5);
        const selectedColors = shuffled.slice(0, sequenceLength);

        // Create the color sequence
        const colorSequence: Color[] = selectedColors.map(name => COLORS[name]);

        // Calculate flash parameters (matching generateRandomColorEffect logic)
        const flashSpeed = 150;
        const flashCount = Math.floor(duration / (sequenceLength * flashSpeed));

        console.log('Random Color Sequence effect:');
        console.log('  Colors picked: ' + selectedColors.join(', '));
        console.log('  Sequence: [' + selectedColors.join(' -> ') + ']');
        console.log(`  Flash count: ${flashCount}`);
        console.log(`  Total duration: ${duration}ms`);

        // Use the existing flashingColorSequence method
        this.flashingColorSequence(colorSequence, flashCount, flashSpeed);
    }

    explosionFlash(baseColor: Color = COLORS.orange, flashColor: Color = COLORS.white, duration: number = 1500): void {
        // Start with an intense white flash using alpha blending
        let alpha = 1.0;  // Start fully opaque
        const fadeSteps = 30;  // Number of fade steps
        let currentStep = 0;

        // First set the base color
        this.hueLightControl.setAllSegments(baseColor);
        this.hueLightControl.sendToDevice();

        // Then overlay the flash with alpha blending
        this.startUpdateLoop((elapsed) => {
            if (elapsed >= duration || currentStep >= fadeSteps) {
                this.stopCurrentEffect();
                // Final state: just the base color
                this.hueLightControl.setAllSegments(baseColor);
                this.hueLightControl.sendToDevice();
                return;
            }

            // Calculate alpha for fade-out (starts at 1, goes to 0)
            alpha = 1.0 - (currentStep / fadeSteps);

            // Apply exponential decay for more realistic explosion
            alpha = Math.pow(alpha, 2);

            // Create flash color with current alpha
            const flashWithAlpha: Color = {
                r: flashColor.r,
                g: flashColor.g,
                b: flashColor.b,
                alpha: alpha
            };

            // Send to all lights with alpha blending
            this.hueLightControl.setAllSegments(flashWithAlpha);
            this.hueLightControl.sendToDevice();

            currentStep++;
        });
    }

    explosionFlashRipple(baseColor: Color = COLORS.orange, flashColor: Color = COLORS.white, duration: number = 2000): void {
        // Explosion that ripples outward from center
        const waveSpeed = duration / 4;  // Time for wave to travel across all segments

        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                this.hueLightControl.setAllSegments(baseColor);
                this.hueLightControl.sendToDevice();
                return;
            }

            this.hueLightControl.segments.forEach((segId, index) => {
                // Calculate distance-based delay for ripple effect
                const distanceFromCenter = Math.abs(index - 1.5);
                const wavePosition = elapsed / waveSpeed;
                const segmentIntensity = Math.max(0, 1 - Math.abs(wavePosition - distanceFromCenter));

                // Apply exponential decay over time
                const timeDecay = Math.pow(1 - (elapsed / duration), 2);
                const alpha = segmentIntensity * timeDecay;

                if (alpha > 0.01) {
                    // Blend flash with base color using alpha
                    const color: Color = {
                        r: flashColor.r,
                        g: flashColor.g,
                        b: flashColor.b,
                        alpha: alpha
                    };
                    this.hueLightControl.setSegmentColor(segId, color);
                } else {
                    this.hueLightControl.setSegmentColor(segId, baseColor);
                }
            });

            this.hueLightControl.sendToDevice();
        });
    }

    /**
     * Sunrise Effect - Uses color temperature to simulate sunrise
     * Goes from candlelight (2000K) to daylight (6500K)
     */
    sunriseEffect(duration: number = 3000): void {
        const startCT = 500;  // Very warm (2000K in mireds)
        const endCT = 153;    // Daylight (6500K in mireds)
        const startBrightness = 0.1;
        const endBrightness = 1.0;

        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                // End at bright daylight
                this.hueWrapper.setColorCT(endCT, endBrightness);
                return;
            }

            const progress = elapsed / duration;
            // Exponential brightness curve for more realistic sunrise
            const brightness = startBrightness + (endBrightness - startBrightness) * Math.pow(progress, 2);
            // Linear color temperature transition
            const ct = Math.round(startCT - (startCT - endCT) * progress);

            // Set all lights to same color temperature
            this.hueWrapper.setColorCT(ct, brightness);
        });
    }

    /**
     * Candlelight Flicker - Realistic candle flame simulation
     * Uses color temperature and brightness variations
     */
    candlelightFlicker(duration: number = 3000): void {
        const baseCT = 450;  // Candle color temperature (2200K)
        const baseBrightness = 0.6;

        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                this.hueLightControl.clearAllSegments();
                this.hueLightControl.sendToDevice();
                return;
            }

            this.hueLightControl.segments.forEach((segId) => {
                // Random flicker for each light
                const flicker = Math.random() * 0.3 - 0.15;  // ±15% variation
                const brightness = Math.max(0.2, Math.min(1, baseBrightness + flicker));

                // Slight color temperature variation for realism
                const ctVariation = Math.random() * 50 - 25;  // ±25 mireds
                const ct = baseCT + ctVariation;

                this.hueWrapper.setLightColorCT(segId, ct, brightness);
            });
        });
    }

    /**
     * XY Precision Rainbow - Uses CIE XY color space for accurate colors
     * Cycles through scientifically precise color points
     */
    xyPrecisionRainbow(duration: number = 3000): void {
        // Define precise XY coordinates for pure colors
        const colors = [
            { x: 0.640, y: 0.330, brightness: 1.0 },  // Pure Red
            { x: 0.450, y: 0.450, brightness: 1.0 },  // Orange
            { x: 0.400, y: 0.500, brightness: 1.0 },  // Yellow
            { x: 0.300, y: 0.600, brightness: 1.0 },  // Pure Green
            { x: 0.150, y: 0.300, brightness: 1.0 },  // Cyan
            { x: 0.150, y: 0.060, brightness: 1.0 },  // Pure Blue
            { x: 0.280, y: 0.150, brightness: 1.0 },  // Purple
        ];

        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                this.hueLightControl.clearAllSegments();
                this.hueLightControl.sendToDevice();
                return;
            }

            const cycleTime = 1000;  // 1 second per full cycle
            const phase = (elapsed % cycleTime) / cycleTime;
            const colorIndex = Math.floor(phase * colors.length);
            const nextIndex = (colorIndex + 1) % colors.length;
            const interpolation = (phase * colors.length) % 1;

            const currentColor = colors[colorIndex];
            const nextColor = colors[nextIndex];

            // Interpolate between colors (unused but calculated for reference)
            if (currentColor && nextColor) {
                const _x = currentColor.x + (nextColor.x - currentColor.x) * interpolation;
                const _y = currentColor.y + (nextColor.y - currentColor.y) * interpolation;
            }

            // Apply wave pattern across segments
            this.hueLightControl.segments.forEach((segId, index) => {
                const segmentPhase = (phase + index * 0.33) % 1;
                const segColorIndex = Math.floor(segmentPhase * colors.length);
                const segNextIndex = (segColorIndex + 1) % colors.length;
                const segInterpolation = (segmentPhase * colors.length) % 1;

                const segCurrent = colors[segColorIndex];
                const segNext = colors[segNextIndex];

                if (segCurrent && segNext) {
                    const segX = segCurrent.x + (segNext.x - segCurrent.x) * segInterpolation;
                    const segY = segCurrent.y + (segNext.y - segCurrent.y) * segInterpolation;
                    this.hueWrapper.setLightColorXY(segId, segX, segY, 1.0);
                }
            });
        });
    }

    /**
     * Multi-Layer Alpha Blend - Demonstrates effect layering with alpha
     * Creates complex color patterns using transparency
     */
    multiLayerAlphaBlend(duration: number = 3000): void {
        // Base layer: warm orange
        this.hueLightControl.setAllSegments(COLORS.orange);

        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                this.hueLightControl.setAllSegments(COLORS.orange);
                this.hueLightControl.sendToDevice();
                return;
            }

            // Layer 1: Pulsing blue overlay
            const pulse1 = Math.sin(elapsed * 0.003) * 0.5 + 0.5;
            const blueOverlay: Color = {
                r: COLORS.blue.r,
                g: COLORS.blue.g,
                b: COLORS.blue.b,
                alpha: pulse1 * 0.5  // Max 50% opacity
            };

            // Layer 2: Sweeping white highlight
            const sweepPosition = (elapsed % 1500) / 1500;

            this.hueLightControl.segments.forEach((segId, index) => {
                const segmentPosition = index / this.hueLightControl.segments.length;
                const distance = Math.abs(segmentPosition - sweepPosition);

                if (distance < 0.3) {
                    // White highlight with distance-based alpha
                    const alpha = (0.3 - distance) / 0.3 * 0.7;
                    const whiteHighlight: Color = {
                        r: 255,
                        g: 255,
                        b: 255,
                        alpha: alpha
                    };
                    this.hueLightControl.setSegmentColor(segId, whiteHighlight);
                } else {
                    // Blue pulse layer
                    this.hueLightControl.setSegmentColor(segId, blueOverlay);
                }
            });

            this.hueLightControl.sendToDevice();
        });
    }

    /**
     * Brightness Wave - Demonstrates pure brightness control
     * Maintains color while varying intensity
     */
    brightnessWave(baseColor: Color = COLORS.purple, duration: number = 3000): void {
        // First set the base color on all lights
        this.hueWrapper.setColorRGB(baseColor.r, baseColor.g, baseColor.b);

        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                this.hueWrapper.setColorRGB(baseColor.r, baseColor.g, baseColor.b);
                return;
            }

            this.hueLightControl.segments.forEach((segId, index) => {
                // Create a wave pattern
                const phase = (elapsed / 500) + (index * Math.PI / 2);
                const brightness = Math.sin(phase) * 0.4 + 0.6;  // Range: 0.2 to 1.0

                // Use setBrightness to control intensity without changing color
                this.hueWrapper.setLightBrightness(segId, brightness);
            });
        });
    }

    /**
     * Day-Night Cycle - Simulates full day cycle using color temperature
     * Morning -> Noon -> Evening -> Night
     */
    dayNightCycle(duration: number = 3000): void {
        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                this.hueWrapper.setColorCT(370, 0.3);  // End at warm evening
                return;
            }

            const progress = elapsed / duration;
            let ct: number;
            let brightness: number;

            if (progress < 0.25) {
                // Morning: warm to neutral
                const phase = progress * 4;
                ct = Math.round(400 - 150 * phase);
                brightness = 0.3 + 0.7 * phase;
            } else if (progress < 0.5) {
                // Noon: bright daylight
                const phase = (progress - 0.25) * 4;
                ct = Math.round(250 - 97 * phase);
                brightness = 1.0;
            } else if (progress < 0.75) {
                // Evening: cooling down
                const phase = (progress - 0.5) * 4;
                ct = Math.round(153 + 217 * phase);
                brightness = 1.0 - 0.5 * phase;
            } else {
                // Night: warm and dim
                const phase = (progress - 0.75) * 4;
                ct = Math.round(370 + 80 * phase);
                brightness = 0.5 - 0.3 * phase;
            }

            this.hueWrapper.setColorCT(ct, brightness);
        });
    }

    /**
     * Meteor Shower - Rapid cascading lights like stars falling
     * Creates a downward motion effect across segments
     */
    meteorShower(color1: Color, color2: Color, duration: number = 2500): void {
        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                return;
            }

            const cycleTime = 500; // Time for one meteor to fall
            const progress = (elapsed % cycleTime) / cycleTime;

            // Create cascading effect across segments
            this.hueLightControl.segments.forEach((segmentId, index) => {
                const segmentPhase = (progress + index * 0.3) % 1;

                if (segmentPhase < 0.2) {
                    // Bright flash as meteor passes
                    const intensity = 1 - (segmentPhase / 0.2);
                    const color = index % 2 === 0 ? color1 : color2;
                    this.hueLightControl.setSegmentColor(segmentId, {
                        r: color.r * intensity,
                        g: color.g * intensity,
                        b: color.b * intensity
                    });
                } else {
                    // Fade to dark
                    const fadeProgress = (segmentPhase - 0.2) / 0.8;
                    const intensity = Math.max(0, 0.3 * (1 - fadeProgress));
                    this.hueLightControl.setSegmentColor(segmentId, {
                        r: color2.r * intensity,
                        g: color2.g * intensity,
                        b: color2.b * intensity
                    });
                }
            });
        });
    }

    /**
     * Double Strike - Two quick impacts with slight color variation
     * Perfect for abilities that hit twice
     */
    doubleStrike(color: Color, duration: number = 500): void {
        const strikeTime = duration / 2;

        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                return;
            }

            let intensity = 0;

            if (elapsed < strikeTime) {
                // First strike
                const strikeProgress = elapsed / strikeTime;
                if (strikeProgress < 0.3) {
                    intensity = strikeProgress / 0.3;
                } else {
                    intensity = 1 - ((strikeProgress - 0.3) / 0.7);
                }
            } else {
                // Second strike (slightly different shade)
                const strikeProgress = (elapsed - strikeTime) / strikeTime;
                if (strikeProgress < 0.3) {
                    intensity = strikeProgress / 0.3;
                } else {
                    intensity = 1 - ((strikeProgress - 0.3) / 0.7);
                }

                // Slightly modify color for second strike
                const modifiedColor = {
                    r: Math.min(255, color.r * 1.2),
                    g: color.g * 0.9,
                    b: color.b * 0.9
                };

                this.hueLightControl.setAllSegments({
                    r: modifiedColor.r * intensity,
                    g: modifiedColor.g * intensity,
                    b: modifiedColor.b * intensity
                });
                return;
            }

            this.hueLightControl.setAllSegments({
                r: color.r * intensity,
                g: color.g * intensity,
                b: color.b * intensity
            });
        });
    }

    /**
     * Time Rewind - Reverse color progression with temporal distortion
     * Creates a time-warping effect
     */
    timeRewind(color1: Color, color2: Color, duration: number = 3000): void {
        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                return;
            }

            const progress = elapsed / duration;

            // Create temporal distortion with varying speeds
            const distortedTime = Math.sin(progress * Math.PI * 4) * 0.3 + progress;

            // Reverse color progression
            const reverseProgress = 1 - (distortedTime % 1);
            const color = interpolateColor(color1, color2, reverseProgress);

            // Apply with flickering for distortion effect
            const flicker = Math.sin(elapsed * 0.02) * 0.2 + 0.8;

            this.hueLightControl.segments.forEach((segmentId, index) => {
                const segmentPhase = (reverseProgress + index * 0.2) % 1;
                this.hueLightControl.setSegmentColor(segmentId, {
                    r: color.r * flicker * (0.5 + segmentPhase * 0.5),
                    g: color.g * flicker * (0.5 + segmentPhase * 0.5),
                    b: color.b * flicker * (0.5 + segmentPhase * 0.5)
                });
            });
        });
    }

    /**
     * Shockwave - Expanding ring effect
     * Creates an outward expanding wave
     */
    shockwave(color: Color, duration: number = 1500): void {
        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                return;
            }

            const progress = elapsed / duration;
            const wavePosition = progress * (this.hueLightControl.segments.length + 1);

            this.hueLightControl.segments.forEach((segmentId, index) => {
                const distance = Math.abs(index - wavePosition);
                let intensity = 0;

                if (distance < 1) {
                    // Wave is at this segment
                    intensity = 1 - distance;
                    intensity *= (1 - progress); // Fade as it expands
                }

                this.hueLightControl.setSegmentColor(segmentId, {
                    r: color.r * intensity,
                    g: color.g * intensity,
                    b: color.b * intensity
                });
            });
        });
    }

    /**
     * Energy Burst - Quick bright expansion then fade
     * Instant powerful flash effect
     */
    energyBurst(color: Color, duration: number = 800): void {
        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                return;
            }

            const progress = elapsed / duration;
            let intensity = 0;

            if (progress < 0.1) {
                // Instant bright flash
                intensity = 1;
            } else if (progress < 0.3) {
                // Hold bright briefly
                intensity = 0.9;
            } else {
                // Rapid fade out
                intensity = Math.max(0, 1 - ((progress - 0.3) / 0.7) * 1.5);
            }

            // Add slight over-brightness for burst effect
            const burstMultiplier = progress < 0.1 ? 1.3 : 1;

            this.hueLightControl.setAllSegments({
                r: Math.min(255, color.r * intensity * burstMultiplier),
                g: Math.min(255, color.g * intensity * burstMultiplier),
                b: Math.min(255, color.b * intensity * burstMultiplier)
            });
        });
    }

    /**
     * Spiral Vortex - Rotating color spiral
     * Creates a spinning vortex effect
     */
    spiralVortex(color1: Color, color2: Color, duration: number = 2000): void {
        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                return;
            }

            const rotationSpeed = 3; // Rotations per duration
            const rotation = (elapsed / duration) * rotationSpeed * Math.PI * 2;

            this.hueLightControl.segments.forEach((segmentId, index) => {
                const angle = rotation + (index * Math.PI * 2 / this.hueLightControl.segments.length);
                const intensity = (Math.sin(angle) + 1) / 2;

                const color = interpolateColor(color1, color2, intensity);

                // Add vortex depth effect
                const depthFactor = Math.sin(elapsed * 0.003) * 0.3 + 0.7;

                this.hueLightControl.setSegmentColor(segmentId, {
                    r: color.r * depthFactor,
                    g: color.g * depthFactor,
                    b: color.b * depthFactor
                });
            });
        });
    }

    /**
     * Lightning Strike - Sharp white flash with electric blue afterglow
     * Simulates a lightning bolt effect
     */
    lightningStrike(duration: number = 1000): void {
        const strikeColor = COLORS.white;
        const glowColor = COLORS.electricBlue;

        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                return;
            }

            const progress = elapsed / duration;

            if (progress < 0.05) {
                // Initial bright white flash
                this.hueLightControl.setAllSegments(strikeColor);
            } else if (progress < 0.15) {
                // Secondary flash (slightly dimmer)
                const intensity = 0.7;
                this.hueLightControl.setAllSegments({
                    r: strikeColor.r * intensity,
                    g: strikeColor.g * intensity,
                    b: strikeColor.b * intensity
                });
            } else {
                // Electric blue afterglow with decay
                const glowProgress = (progress - 0.15) / 0.85;
                const intensity = Math.max(0, 1 - glowProgress);

                // Add electrical flickering
                const flicker = Math.random() > 0.7 ? 1.2 : 1;

                this.hueLightControl.setAllSegments({
                    r: glowColor.r * intensity * flicker,
                    g: glowColor.g * intensity * flicker,
                    b: glowColor.b * intensity * flicker
                });
            }
        });
    }

    /**
     * Poison Drip - Slow green-to-black fade with toxic feel
     * Creates a toxic, poisonous effect
     */
    poisonDrip(duration: number = 3000): void {
        const toxicGreen = COLORS.emerald;

        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                this.hueLightControl.setAllSegments(COLORS.black);
                return;
            }

            const progress = elapsed / duration;

            // Dripping effect - different segments fade at different rates
            this.hueLightControl.segments.forEach((segmentId, index) => {
                const segmentDelay = index * 0.15;
                const segmentProgress = Math.max(0, Math.min(1, (progress - segmentDelay) / (1 - segmentDelay)));

                // Fade from toxic green to black
                const intensity = 1 - segmentProgress;

                // Add bubbling effect
                const bubble = Math.sin((elapsed + index * 500) * 0.005) * 0.2 + 0.8;

                this.hueLightControl.setSegmentColor(segmentId, {
                    r: toxicGreen.r * intensity * bubble * 0.3, // Reduce red for more toxic look
                    g: toxicGreen.g * intensity * bubble,
                    b: toxicGreen.b * intensity * bubble * 0.1  // Minimal blue
                });
            });
        });
    }

    /**
     * Ice Shatter - Bright ice blue that fragments into darker blues
     * Creates a freezing and shattering effect
     */
    iceShatter(duration: number = 1500): void {
        const iceBlue = COLORS.iceBlue;
        const darkBlue = COLORS.deepBlue;

        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                return;
            }

            const progress = elapsed / duration;

            if (progress < 0.3) {
                // Initial freeze - bright ice blue
                const freezeIntensity = Math.min(1, progress / 0.1);
                this.hueLightControl.setAllSegments({
                    r: iceBlue.r * freezeIntensity,
                    g: iceBlue.g * freezeIntensity,
                    b: iceBlue.b * freezeIntensity
                });
            } else {
                // Shatter into fragments
                const shatterProgress = (progress - 0.3) / 0.7;

                this.hueLightControl.segments.forEach((segmentId, _index) => {
                    // Each segment shatters at slightly different time
                    const fragmentDelay = Math.random() * 0.2;
                    const fragmentProgress = Math.max(0, Math.min(1, (shatterProgress - fragmentDelay) / (1 - fragmentDelay)));

                    // Interpolate from ice blue to dark blue
                    const color = interpolateColor(iceBlue, darkBlue, fragmentProgress);

                    // Add sharp flickering for shatter effect
                    const shatter = fragmentProgress < 0.1 ? Math.random() : 1;

                    this.hueLightControl.setSegmentColor(segmentId, {
                        r: color.r * (1 - fragmentProgress * 0.5) * shatter,
                        g: color.g * (1 - fragmentProgress * 0.5) * shatter,
                        b: color.b * (1 - fragmentProgress * 0.3) * shatter
                    });
                });
            }
        });
    }

    /**
     * Police Flash Pro - Uses exact Hue parameters with HSB and CT values
     * Replicates settings from external project with native Hue values
     */
    policeFlashPro(duration: number = 3000): void {
        const flashSpeed = 150; // ms per color
        const sequence = [
            { type: 'hsb', hue: 0, saturation: 100, brightness: 100 },      // Red (Hue: 0°)
            { type: 'ct', ct: 366, brightness: 100 },                       // White (366 mireds)
            { type: 'hsb', hue: 46920, saturation: 100, brightness: 100 },  // Blue (Hue: 46920/65535 = ~257°)
            { type: 'ct', ct: 366, brightness: 100 }                        // White (366 mireds)
        ];

        let colorIndex = 0;
        let lastChangeTime = 0;

        this.startUpdateLoop((elapsed) => {
            if (elapsed > duration) {
                this.stopCurrentEffect();
                return;
            }

            // Change color every flashSpeed ms
            if (elapsed - lastChangeTime >= flashSpeed) {
                const setting = sequence[colorIndex % sequence.length]!;

                if (setting.type === 'ct') {
                    // Use color temperature for white
                    this.hueWrapper.setColorCT(setting.ct!, setting.brightness / 100);
                } else {
                    // Convert Hue's 0-65535 range to degrees, then to XY
                    // Hue uses 0-65535 where 0=red, 21845=green, 43690=blue
                    const hueDegrees = (setting.hue! / 65535) * 360;

                    // Convert HSB to RGB first
                    const rgb = hsvToRgb(
                        hueDegrees,
                        setting.saturation! / 100,
                        setting.brightness! / 100
                    );

                    // For better color accuracy, we could use XY color space
                    // But for simplicity, using RGB
                    this.hueWrapper.setColorRGB(rgb.r, rgb.g, rgb.b);
                }

                colorIndex++;
                lastChangeTime = elapsed;
            }
        });
    }
}

export { COLORS, type Color } from './hue-light-control';