// Native Device Notifications and Haptic Vibration Engine (100% Free, Zero API Keys)

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function isVibrationSupported(): boolean {
  return typeof window !== "undefined" && "vibrate" in navigator;
}

export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("Smart OPD Service Worker registered:", reg.scope);
      })
      .catch((err) => {
        console.log("Service Worker registration failed:", err);
      });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (e) {
    console.error("Error requesting notification permission:", e);
    return false;
  }
}

export function triggerDeviceVibration(pattern: number | number[] = [200, 100, 200]) {
  if (isVibrationSupported()) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.log("Vibration failed:", e);
    }
  }
}

export async function triggerDeviceNotification(options: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  vibrate?: number[];
}) {
  const { title, body, tag = "opd-alert", url = window.location.href, vibrate = [300, 100, 300, 100, 500] } = options;

  // 1. Trigger physical haptic vibration
  triggerDeviceVibration(vibrate);

  if (!isNotificationSupported()) return;

  if (Notification.permission === "granted") {
    try {
      // Prefer Service Worker registration for mobile background notifications
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && "showNotification" in reg) {
          const notifOptions: NotificationOptions & { vibrate?: number[] } = {
            body,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag,
            vibrate,
            data: { url },
          };
          reg.showNotification(title, notifOptions as NotificationOptions);
          return;
        }
      }

      // Fallback to standard Notification API
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag,
      });
    } catch (e) {
      console.error("Device notification trigger failed:", e);
    }
  }
}
