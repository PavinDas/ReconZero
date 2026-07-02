import { useEffect } from "react";
import { io } from "socket.io-client";

export function useScanSocket(scanId, { onEvent }) {
  useEffect(() => {
    if (!scanId) return undefined;
    const socket = io("/", { transports: ["websocket", "polling"] });
    socket.emit("scan:join", scanId);
    socket.on("scan:event", onEvent);
    return () => {
      socket.off("scan:event", onEvent);
      socket.disconnect();
    };
  }, [onEvent, scanId]);
}
