import React, { useEffect } from 'react';
import { io } from 'socket.io-client';

enum EventType {
  Lamo = 1,
  Armor = 2,
  GameEnd = 2,
}

const playSound = (id: number) => {
  const audio = document.getElementById(`snd${id}`);
  if (audio) {
    (audio as HTMLAudioElement).play();
  }
};

export const Notify: React.FC = () => {
  useEffect(() => {
    const s = io('/notify');
    s.on('event', ({ type }: { type: EventType }) => {
      if (type === EventType.GameEnd) {
        // eslint-disable-next-line no-self-assign
        window.location.href = window.location.href;
      } else {
        playSound(type);
      }
    });
    return () => {
      s.close();
    };
  }, []);

  return (
    <>
      <audio src="/sounds/1.ogg" id="snd1" />
      <audio src="/sounds/2.ogg" id="snd2" />
    </>
  );
};
