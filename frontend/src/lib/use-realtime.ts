"use client";

import { useEffect } from "react";
import { WS_BASE } from "./api";

/**
 * Connects to the backend WebSocket for real-time 0ms queue synchronization.
 * When any queue event occurs, fires the callback and broadcasts "opd-refresh".
 */
export function useRealtimeQueue(onEvent?: (event: { type: string; data: unknown }) => void) {
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    function connect() {
      try {
        ws = new WebSocket(WS_BASE);

        ws.onopen = () => {
          console.log("Connected to OPD Realtime Queue WebSocket");
        };

        ws.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload.type && payload.type !== "INITIAL_STATE") {
              // Dispatch global refresh event
              window.dispatchEvent(new CustomEvent("opd-refresh", { detail: payload }));
              if (onEvent) {
                onEvent(payload);
              }
            }
          } catch (err) {
            console.error("WS message parse error:", err);
          }
        };

        ws.onerror = () => {
          // Fallback to polling silently
        };

        ws.onclose = () => {
          // Attempt reconnect after 4 seconds
          reconnectTimer = setTimeout(connect, 4000);
        };
      } catch {
        // Fallback to polling
      }
    }

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [onEvent]);
}

