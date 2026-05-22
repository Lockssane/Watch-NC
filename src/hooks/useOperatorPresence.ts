import { useEffect, useMemo, useRef, useState } from "react";
import type { PresenceCursor } from "../types";

const COLORS = ["#00E5FF", "#8A7DFF", "#FF6B35", "#00FF9F"];
const CHANNEL_NAME = "coss-watch-operators";

function makeId() {
  return `operator-${Math.random().toString(36).slice(2, 10)}`;
}

export function useOperatorPresence() {
  const [others, setOthers] = useState<PresenceCursor[]>([]);
  const id = useMemo(() => makeId(), []);
  const label = useMemo(() => `OP-${id.slice(-4).toUpperCase()}`, [id]);
  const color = useMemo(() => COLORS[Math.floor(Math.random() * COLORS.length)], []);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<PresenceCursor>) => {
      const cursor = event.data;
      if (!cursor || cursor.id === id) return;
      setOthers((current) => {
        const next = current.filter((item) => Date.now() - item.updatedAt < 5000);
        const existing = next.find((item) => item.id === cursor.id);
        if (existing) {
          return next.map((item) => (item.id === cursor.id ? cursor : item));
        }
        return [...next, cursor];
      });
    };

    const timer = window.setInterval(() => {
      setOthers((current) => current.filter((item) => Date.now() - item.updatedAt < 5000));
    }, 1200);

    return () => {
      window.clearInterval(timer);
      channel.close();
    };
  }, [id]);

  function publishPosition(x: number, y: number) {
    const payload: PresenceCursor = {
      id,
      label,
      color,
      x,
      y,
      updatedAt: Date.now(),
    };
    channelRef.current?.postMessage(payload);
  }

  return {
    operator: { id, label, color },
    others,
    publishPosition,
  };
}
