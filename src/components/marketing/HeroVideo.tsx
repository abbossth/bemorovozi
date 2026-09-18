"use client";

import { useRef, useState } from "react";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function handlePlay() {
    videoRef.current?.play();
    setPlaying(true);
  }

  return (
    <div className="relative">
      <div className="relative aspect-video w-full overflow-hidden rounded-[20px] bg-navy shadow-[0_30px_60px_rgba(13,17,23,0.25)]">
        <video
          ref={videoRef}
          src="/hero-demo.mp4"
          controls={playing}
          playsInline
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          className="h-full w-full object-cover"
        />
        {!playing && (
          <button
            type="button"
            onClick={handlePlay}
            aria-label="Namoyishni ko'rish"
            className="absolute inset-0 flex items-center justify-center bg-navy/10 transition hover:bg-navy/20"
          >
            <span className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-white shadow-lg">
              <svg viewBox="0 0 24 24" width={26} height={26} fill="#E5534B">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <div className="absolute -bottom-5 left-6 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-[0_12px_28px_rgba(15,23,17,0.14)]">
        <svg viewBox="0 0 24 24" width={18} height={18} fill="#E5534B">
          <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
        </svg>
        <span className="text-[13px] font-bold text-ink">Qisqa video namoyish</span>
      </div>
    </div>
  );
}
