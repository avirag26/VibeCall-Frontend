'use client';

import { useEffect, useRef } from 'react';

export interface VoiceOrbProps {
  isUserTalking: boolean;
  isPartnerTalking: boolean;
  isInCall: boolean;
  status: string;
}

export default function VoiceOrb({ isUserTalking, isPartnerTalking, isInCall, status }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const SIZE = 200;
    canvas.width = SIZE;
    canvas.height = SIZE;

    const draw = (ts: number) => {
      timeRef.current = ts / 1000;
      ctx.clearRect(0, 0, SIZE, SIZE);
      const cx = SIZE / 2, cy = SIZE / 2;
      const t = timeRef.current;

      if (status === 'waiting') {
        // Rotating searching rings
        for (let i = 0; i < 3; i++) {
          const angle = t * (1.2 + i * 0.4) + (i * Math.PI * 2) / 3;
          const r = 52 + i * 10;
          const alpha = 0.3 + 0.2 * Math.sin(t * 2 + i);
          ctx.beginPath();
          ctx.arc(cx, cy, r, angle, angle + Math.PI * 1.2);
          ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        // Pulsing center dot
        const pulse = 0.7 + 0.3 * Math.sin(t * 3);
        ctx.beginPath();
        ctx.arc(cx, cy, 28 * pulse, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28 * pulse);
        grad.addColorStop(0, 'rgba(251,191,36,0.9)');
        grad.addColorStop(1, 'rgba(251,191,36,0.1)');
        ctx.fillStyle = grad;
        ctx.fill();
      } else if (!isInCall) {
        // Idle — soft glow
        const pulse = 0.8 + 0.2 * Math.sin(t * 1.5);
        ctx.beginPath();
        ctx.arc(cx, cy, 44 * pulse, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 44 * pulse);
        grad.addColorStop(0, 'rgba(99,102,241,0.5)');
        grad.addColorStop(1, 'rgba(99,102,241,0)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 36, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(99,102,241,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (isUserTalking) {
        // Waveform bars around orb
        const bars = 24;
        for (let i = 0; i < bars; i++) {
          const angle = (i / bars) * Math.PI * 2;
          const wave = Math.sin(t * 8 + i * 0.7) * 0.5 + 0.5;
          const len = 8 + wave * 20;
          const r0 = 46, r1 = r0 + len;
          const alpha = 0.4 + wave * 0.6;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0);
          ctx.lineTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
          ctx.strokeStyle = `rgba(96,165,250,${alpha})`;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        // Inner glow
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 46);
        grad.addColorStop(0, 'rgba(59,130,246,0.8)');
        grad.addColorStop(0.6, 'rgba(37,99,235,0.5)');
        grad.addColorStop(1, 'rgba(29,78,216,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, 46, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      } else if (isPartnerTalking) {
        // Ripple waves
        for (let i = 0; i < 4; i++) {
          const phase = ((t * 0.8 + i * 0.25) % 1);
          const r = 36 + phase * 42;
          const alpha = (1 - phase) * 0.5;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(52,211,153,${alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        // Center glow
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 46);
        grad.addColorStop(0, 'rgba(16,185,129,0.8)');
        grad.addColorStop(0.6, 'rgba(5,150,105,0.5)');
        grad.addColorStop(1, 'rgba(4,120,87,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, 46, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      } else {
        // Connected idle — slow orbit dots
        for (let i = 0; i < 5; i++) {
          const angle = t * 0.8 + (i / 5) * Math.PI * 2;
          const r = 52;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          const alpha = 0.4 + 0.3 * Math.sin(t * 2 + i);
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(52,211,153,${alpha})`;
          ctx.fill();
        }
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
        grad.addColorStop(0, 'rgba(16,185,129,0.4)');
        grad.addColorStop(1, 'rgba(16,185,129,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, 40, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isInCall, isUserTalking, isPartnerTalking, status]);

  const orbColor = isInCall
    ? isUserTalking ? '#1d4ed8'
      : isPartnerTalking ? '#065f46'
        : '#064e3b'
    : status === 'waiting' ? '#78350f'
      : '#1e1b4b';

  const label = isInCall
    ? isUserTalking ? 'You are speaking'
      : isPartnerTalking ? 'Partner is speaking'
        : 'Connected'
    : status === 'waiting' ? 'Searching...'
      : status === 'connecting' ? 'Connecting...'
        : 'Ready';

  const labelColor = isInCall
    ? isUserTalking ? '#93c5fd'
      : isPartnerTalking ? '#6ee7b7'
        : '#6ee7b7'
    : status === 'waiting' ? '#fde68a'
      : '#a5b4fc';

  return (
    <div className="flex flex-col items-center gap-3 mb-6">
      <div className="relative" style={{ width: 200, height: 200 }}>
        {/* Main orb circle */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${orbColor}cc, ${orbColor}88)`,
            boxShadow: `0 0 40px ${orbColor}55, inset 0 1px 0 rgba(255,255,255,0.15)`,
            border: '1px solid rgba(255,255,255,0.08)',
            transition: 'background 0.5s ease, box-shadow 0.5s ease',
          }}
        >
          {/* Mic icon */}
          <svg
            width="48" height="48" viewBox="0 0 24 24" fill="none"
            className="z-10 relative"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
          >
            <rect x="9" y="2" width="6" height="12" rx="3" fill="white" fillOpacity="0.9" />
            <path d="M5 11a7 7 0 0014 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.9" />
            <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.9" />
            <line x1="9" y1="22" x2="15" y2="22" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.9" />
          </svg>
        </div>

        {/* Canvas overlay for animations */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ mixBlendMode: 'screen' }}
        />
      </div>

      {/* Status label */}
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: labelColor,
            boxShadow: `0 0 6px ${labelColor}`,
            animation: (status === 'waiting' || isUserTalking || isPartnerTalking)
              ? 'pulse 1s infinite' : 'none',
          }}
        />
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: labelColor, letterSpacing: '0.12em' }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}