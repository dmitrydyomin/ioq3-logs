import { useEffect, useRef } from 'react';

interface PlayerHeadProps {
  name: string;
  model?: string;
  icon?: string;
  index: number;
}

export function PlayerHead({ name, model, icon, index }: PlayerHeadProps) {
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
          element, character, skin, index === 1 ? -1 : 1, controller.signal,
        );
      })
      .catch(() => {
        // Leave the original portrait in place when the 3D preview is unavailable.
      });

    return () => {
      controller.abort();
      dispose?.();
    };
  }, [model, index]);

  return (
    <div className={`player-head icon-${index}`} role="img" aria-label={`${name}'s portrait`}>
      <canvas ref={canvas} width={96} height={96} hidden aria-hidden="true" />
      {icon && <img src={icon} alt="" />}
    </div>
  );
}
