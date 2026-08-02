"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "../lib/socket";

/** Subscribes to a socket event for the lifetime of the component */
export function useSocketEvent(event, handler) {
  const savedHandler = useRef(handler);
  savedHandler.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const listener = (...args) => savedHandler.current(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [event]);
}

export function useSocket() {
  return getSocket();
}
