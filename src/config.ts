import type { BridgeConfig } from './native';

interface RequiredEnvironmentVariables {
    HUE_BRIDGE_ID: string;
    HUE_BRIDGE_IP: string;
    HUE_USERNAME: string;
    HUE_CLIENT_KEY: string;
}

function getEnv(key: keyof RequiredEnvironmentVariables): string {
    const value = process.env[key];
    if (!value) {
        console.error(`FATAL: ${key} not set`);
        process.exit(1);
    }
    return value;
}

export const BRIDGE_CONFIG: BridgeConfig = Object.freeze({
    id: getEnv('HUE_BRIDGE_ID'),
    ip: getEnv('HUE_BRIDGE_IP'),
    username: getEnv('HUE_USERNAME'),
    clientKey: getEnv('HUE_CLIENT_KEY')
});