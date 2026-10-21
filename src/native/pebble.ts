import { requireOptionalNativeModule } from 'expo-modules-core';

export type OutfitOptions = {
  hat?: string | null;
  plant?: string | null;
  furniture?: string | null;
  background?: string | null;
};

export type OverlayModule = {
  canDrawOverlays: () => boolean;
  openPermissionSettings: () => void;
  start: (options: OutfitOptions) => Promise<void>;
  stop: () => Promise<void>;
  update: (options: OutfitOptions) => Promise<void>;
  isRunning: () => boolean;
};

export type WidgetBridgeModule = {
  setSnapshot: (json: string) => void;
  startLiveActivity: (json: string) => Promise<void>;
  endLiveActivity: () => Promise<void>;
};

export type OutsideSnapshot = OutfitOptions & {
  coins: number;
  todayDone: number;
  todayOpen: number;
  displayName: string;
};

function optional<T>(name: string): T | null {
  try {
    return requireOptionalNativeModule<T>(name);
  } catch {
    return null;
  }
}

/** Null in Expo Go, in the browser, and on iPhone. Present in a full Android build. */
export function getOverlay(): OverlayModule | null {
  return optional<OverlayModule>('PebbleOverlay');
}

/** Null in Expo Go and on Android. Present in a full iPhone build that includes the widget. */
export function getWidgetBridge(): WidgetBridgeModule | null {
  return optional<WidgetBridgeModule>('PebbleWidgetBridge');
}

export async function syncOutside(snapshot: OutsideSnapshot) {
  const bridge = getWidgetBridge();
  if (bridge) {
    try {
      bridge.setSnapshot(JSON.stringify(snapshot));
    } catch {
      // The widget bridge is not in this build.
    }
  }
  const overlay = getOverlay();
  if (!overlay) return;
  try {
    if (overlay.isRunning()) {
      await overlay.update(snapshot);
    }
  } catch {
    // The floating pet was closed.
  }
}
