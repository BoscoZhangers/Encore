import { Camera, Headphones, Shirt, Armchair, Infinity as InfinityIcon, Check } from 'lucide-react';

export function WelcomeOrbit() {
  return (
    <div className="welcome-orbit" aria-hidden="true">
      <div className="welcome-orbit-glow" />
      <svg className="welcome-orbit-track" viewBox="0 0 640 230" fill="none">
        <defs>
          <linearGradient id="welcome-loop-gradient">
            <stop stopColor="#e0f2b4" />
            <stop offset=".5" stopColor="#7fad88" />
            <stop offset="1" stopColor="#d9ed9d" />
          </linearGradient>
        </defs>
        <path
          className="welcome-orbit-base"
          d="M320 115C250 15 75 10 75 115S250 215 320 115S565 10 565 115S390 215 320 115Z"
        />
        <path
          className="welcome-orbit-flow"
          d="M320 115C250 15 75 10 75 115S250 215 320 115S565 10 565 115S390 215 320 115Z"
        />
      </svg>
      <div className="welcome-orbit-core">
        <InfinityIcon size={44} strokeWidth={1.6} />
        <span>Cora</span>
      </div>
      <span className="welcome-orbit-item orbit-chair">
        <Armchair />
      </span>
      <span className="welcome-orbit-item orbit-camera">
        <Camera />
      </span>
      <span className="welcome-orbit-item orbit-headphones">
        <Headphones />
      </span>
      <span className="welcome-orbit-item orbit-shirt">
        <Shirt />
      </span>
      <span className="welcome-orbit-status">
        <span>
          <Check size={13} />
        </span>{' '}
        Another chapter, ready to begin.
      </span>
    </div>
  );
}
