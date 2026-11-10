import { useEffect, useRef, type RefObject } from 'react';
import type { HeadMotion } from './useHeadMotion';

interface PlayerHeadProps {
  name: string;
  model?: string;
  icon?: string;
  index: number;
  motion: RefObject<HeadMotion | null>;
}

export function PlayerHead({ name, model, icon, index, motion }: PlayerHeadProps) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const [character, skin = 'default'] = model?.toLowerCase().split('/') ?? [];
    if (!element || (character !== 'ranger' && character !== 'sarge')) return;

    const controller = new AbortController();
    let dispose: (() => void) | undefined;

    import('./renderPlayerHead')
      .then(async ({ renderPlayerHead }) => {
        dispose = await renderPlayerHead(
          element, character, skin, index === 1 ? -1 : 1, controller.signal, motion,
        );
      })
      .catch(() => {
        // Leave the original portrait in place when the 3D preview is unavailable.
      });

    return () => {
      controller.abort();
      dispose?.();
    };
  }, [model, index, motion]);

  return (
    <div className={`player-head icon-${index}`} role="img" aria-label={`${name}'s portrait`}>
      <canvas ref={canvas} width={96} height={96} hidden aria-hidden="true" />
      {icon && <img src={icon} alt="" />}
    </div>
  );
}
