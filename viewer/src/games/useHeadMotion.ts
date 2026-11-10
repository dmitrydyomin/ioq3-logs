import { useEffect, useRef, useState } from 'react';

export interface HeadMotion {
  yaw: number;
  pitch: number;
  time: number;
}

type OrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

export function useHeadMotion() {
  const motion = useRef<HeadMotion | null>(null);
  const [status, setStatus] = useState<'off' | 'requesting' | 'on' | 'denied'>('off');
  const available = window.isSecureContext && typeof DeviceOrientationEvent !== 'undefined';

  async function toggle() {
    if (status === 'on') {
      setStatus('off');
      return;
    }
    const orientation = DeviceOrientationEvent as OrientationWithPermission;
    setStatus('requesting');
    try {
      const permission = await orientation.requestPermission?.();
      setStatus(permission === 'denied' ? 'denied' : 'on');
    } catch {
      setStatus('denied');
    }
  }

  useEffect(() => {
    if (status !== 'on') return;

    let previous: { beta: number; gamma: number; angle: number; time: number } | undefined;
    const onOrientation = ({ beta, gamma }: DeviceOrientationEvent) => {
      if (beta === null || gamma === null) return;
      const time = performance.now();
      const angle = screen.orientation?.angle ?? window.orientation ?? 0;
      const last = previous;
      previous = { beta, gamma, angle, time };
      if (!last || angle !== last.angle) {
        motion.current = null;
        return;
      }

      const elapsed = (time - last.time) / 1000;
      if (elapsed <= 0 || elapsed > 0.25) return;

      // Convert angular velocity in device coordinates into screen coordinates.
      const radians = angle * Math.PI / 180;
      const horizontal = (gamma - last.gamma) / elapsed;
      const vertical = ((beta - last.beta + 540) % 360 - 180) / elapsed;
      const yaw = horizontal * Math.cos(radians) + vertical * Math.sin(radians);
      const pitch = vertical * Math.cos(radians) - horizontal * Math.sin(radians);
      motion.current = {
        yaw: Math.max(-0.45, Math.min(0.45, yaw * 0.005)),
        pitch: Math.max(-0.25, Math.min(0.25, pitch * 0.004)),
        time,
      };
    };

    window.addEventListener('deviceorientation', onOrientation);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation);
      motion.current = null;
    };
  }, [status]);

  return { motion, available, status, toggle };
}
