/**
 * Generate a device fingerprint based on browser characteristics
 * This creates a unique identifier for the device without storing personal data
 */
export function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') {
    return 'server-side';
  }

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
  ];

  const fingerprint = components.join('|');
  return hashString(fingerprint);
}

/**
 * Simple hash function to create a consistent ID from string
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get detailed device information
 */
export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      deviceId: 'server-side',
      userAgent: 'server',
      platform: 'server',
    };
  }

  return {
    deviceId: generateDeviceFingerprint(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
