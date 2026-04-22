'use client';

import { useState, useEffect, useRef } from 'react';
import { Gender, Country, CombinedFilters } from '../types/chat';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vibecall-backend-t5we.onrender.com';

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium',
  'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Cambodia',
  'Canada', 'Chile', 'China', 'Colombia', 'Croatia', 'Cuba', 'Czech Republic',
  'Denmark', 'Ecuador', 'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France',
  'Georgia', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Hungary', 'India',
  'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica',
  'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon',
  'Libya', 'Lithuania', 'Luxembourg', 'Malaysia', 'Mexico', 'Moldova',
  'Morocco', 'Myanmar', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria',
  'Norway', 'Oman', 'Pakistan', 'Panama', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Qatar', 'Romania', 'Russia', 'Saudi Arabia', 'Serbia',
  'Singapore', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain',
  'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Taiwan',
  'Tanzania', 'Thailand', 'Tunisia', 'Turkey', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
  'Uzbekistan', 'Venezuela', 'Vietnam', 'Yemen', 'Zimbabwe',
];

// ── Animated World Banner (new) ──────────────────────────────────────────────
function WorldBanner({ totalUsers }: { totalUsers: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let raf: number;

    const stars = Array.from({ length: 55 }, () => ({
      x: Math.random() * 400, y: Math.random() * 110,
      r: Math.random() * 1.2 + 0.4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 0.8,
    }));

    const arcs = [
      { x1: 72, y1: 42, cx: 160, cy: 10, x2: 288, y2: 30, color: '#6c63ff', delay: 40 },
      { x1: 192, y1: 60, cx: 240, cy: 20, x2: 340, y2: 52, color: '#f472b6', delay: 90 },
      { x1: 72, y1: 42, cx: 160, cy: 80, x2: 192, y2: 60, color: '#34d399', delay: 150 },
      { x1: 120, y1: 68, cx: 250, cy: 30, x2: 340, y2: 52, color: '#fbbf24', delay: 210 },
    ];

    const cities = [
      { x: 72, y: 42, color: '#6c63ff', label: 'IN', phase: 0 },
      { x: 288, y: 30, color: '#f472b6', label: 'US', phase: 60 },
      { x: 192, y: 60, color: '#34d399', label: 'BR', phase: 120 },
      { x: 340, y: 52, color: '#fbbf24', label: 'DE', phase: 180 },
      { x: 120, y: 68, color: '#6c63ff', label: 'UK', phase: 90 },
    ];

    function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.arcTo(x + w, y, x + w, y + r, r);
      c.lineTo(x + w, y + h - r);
      c.arcTo(x + w, y + h, x + w - r, y + h, r);
      c.lineTo(x + r, y + h);
      c.arcTo(x, y + h, x, y + h - r, r);
      c.lineTo(x, y + r);
      c.arcTo(x, y, x + r, y, r);
      c.closePath();
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, 400, 110);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, 400, 110);

      // Grid dot texture
      ctx.fillStyle = 'rgba(108,99,255,0.12)';
      for (let gx = 8; gx < 400; gx += 18) {
        for (let gy = 8; gy < 110; gy += 14) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Stars twinkle
      stars.forEach(s => {
        const alpha = 0.15 + 0.75 * Math.abs(Math.sin(s.phase + frame * 0.008 * s.speed));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      });

      // Sweep line
      const sweepX = (frame * 1.2) % 400;
      const sweepGrad = ctx.createLinearGradient(sweepX - 8, 0, sweepX + 8, 0);
      sweepGrad.addColorStop(0, 'transparent');
      sweepGrad.addColorStop(0.5, 'rgba(108,99,255,0.25)');
      sweepGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(sweepX - 8, 0, 16, 110);

      // Arc connections
      arcs.forEach(a => {
        const t = ((frame - a.delay) % 220) / 180;
        if (t <= 0 || t > 1.1) return;
        const progress = Math.min(t, 1);
        const alpha = t < 0.3 ? t / 0.3 : t > 0.8 ? 1 - (t - 0.8) / 0.3 : 1;
        ctx.save();
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = alpha * 0.6;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const steps = Math.floor(progress * 40);
        for (let i = 0; i <= steps; i++) {
          const tt = i / 40;
          const bx = (1 - tt) * (1 - tt) * a.x1 + 2 * (1 - tt) * tt * a.cx + tt * tt * a.x2;
          const by = (1 - tt) * (1 - tt) * a.y1 + 2 * (1 - tt) * tt * a.cy + tt * tt * a.y2;
          i === 0 ? ctx.moveTo(bx, by) : ctx.lineTo(bx, by);
        }
        ctx.stroke();
        ctx.restore();
      });

      // City pulsing rings + dots
      cities.forEach(c => {
        const t = (frame + c.phase) % 160 / 80;
        const r = t * 10;
        const alpha = Math.max(0, 1 - t);
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(c.x, c.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
      });

      // Floating labels
      cities.forEach((c, i) => {
        const floatY = Math.sin(frame * 0.02 + i) * 2.5;
        ctx.save();
        ctx.fillStyle = c.color;
        ctx.globalAlpha = 0.9;
        roundRect(ctx, c.x + 5, c.y - 10 + floatY, 22, 12, 6);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 7px system-ui';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 1;
        ctx.fillText(c.label, c.x + 16, c.y - 2 + floatY);
        ctx.restore();
      });

      // Bottom text
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '700 8px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('CONNECTING VOICES WORLDWIDE', 200, 103);

      frame++;
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="w-full rounded-t-[1.75rem] overflow-hidden" style={{ height: '110px', background: '#1a1a2e' }}>
      <canvas
        ref={canvasRef}
        width={400}
        height={110}
        style={{ width: '100%', height: '110px', display: 'block' }}
      />
    </div>
  );
}

// ── FilterWizard ─────────────────────────────────────────────────────────────
interface FilterWizardProps {
  initialData?: CombinedFilters | null;
  onComplete: (filters: CombinedFilters) => void;
}

export default function FilterWizard({ initialData, onComplete }: FilterWizardProps) {
  const [step, setStep] = useState<'my-profile' | 'preferences'>(
    initialData ? 'preferences' : 'my-profile'
  );
  const [myGender, setMyGender] = useState<Gender>(initialData?.myGender || '');
  const [myCountry, setMyCountry] = useState<Country>(initialData?.myCountry || '');
  const [targetGender, setTargetGender] = useState<Gender>(initialData?.targetGender || 'random');
  const [targetCountry, setTargetCountry] = useState<Country>(initialData?.targetCountry || 'random');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [totalUsers, setTotalUsers] = useState<number>(0);

  useEffect(() => {
    fetch(`${BACKEND_URL}/stats`)
      .then((res) => res.json())
      .then((data) => {
        setStats(data.counts || {});
        setTotalUsers(data.totalUsers || 0);
      })
      .catch((err) => console.error('Failed to fetch country status:', err));
  }, []);

  // Original select style from old code
  const selectStyle = `w-full bg-white border border-slate-100 shadow-sm rounded-2xl p-4 text-slate-700
    font-bold focus:ring-4 focus:ring-sky-100 outline-none transition-all appearance-none cursor-pointer`;

  return (
    <div className="w-full flex flex-col items-center">
      {/* ── New animated banner ── */}
      <WorldBanner totalUsers={totalUsers} />

      {/* ── Original bottom form UI ── */}
      <div className="w-full flex flex-col items-center px-4 py-8 relative">

        {/* Total users ping — original position/style */}
        <div className="absolute top-4 left-6 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/80">
            {totalUsers} Online
          </span>
        </div>

        {/* Step indicator — original */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step === 'my-profile' ? 'bg-sky-500 scale-125' : 'bg-slate-300'}`} />
          <div className="w-8 h-px bg-slate-200" />
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step === 'preferences' ? 'bg-sky-500 scale-125' : 'bg-slate-300'}`} />
        </div>

        {/* ── Step 1: My Profile (original) ── */}
        {step === 'my-profile' && (
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <h2 className="text-3xl font-black text-slate-800 mb-1 text-center">About You</h2>
            <p className="text-slate-400 text-sm mb-8 text-center">
              Tell us a bit so we can find better matches
            </p>

            {/* Gender */}
            <div className="w-full mb-6">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                I am a...
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setMyGender('male')}
                  className={`flex-1 py-4 rounded-2xl font-black text-base transition-all duration-200 ${myGender === 'male'
                    ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-200 -translate-y-0.5'
                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 shadow-sm'
                    }`}
                >
                  ♂ Male
                </button>
                <button
                  onClick={() => setMyGender('female')}
                  className={`flex-1 py-4 rounded-2xl font-black text-base transition-all duration-200 ${myGender === 'female'
                    ? 'bg-pink-500 text-white shadow-xl shadow-pink-200 -translate-y-0.5'
                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 shadow-sm'
                    }`}
                >
                  ♀ Female
                </button>
              </div>
            </div>

            {/* Country */}
            <div className="w-full mb-10">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                I live in...
              </label>
              <div className="relative">
                <select
                  value={myCountry}
                  onChange={(e) => setMyCountry(e.target.value)}
                  className={selectStyle}
                >
                  <option value="" disabled>Select your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}{stats[c] ? ` 🟢 ${stats[c]} online` : ''}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            <button
              onClick={() => { if (myGender && myCountry) setStep('preferences'); }}
              disabled={!myGender || !myCountry}
              className="w-full py-4 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 text-white
                font-black tracking-widest uppercase text-sm shadow-xl shadow-indigo-200/50
                disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Next →
            </button>
          </div>
        )}

        {/* ── Step 2: Preferences (original) ── */}
        {step === 'preferences' && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-3xl font-black text-slate-800 mb-1 text-center">Who to find</h2>
            <p className="text-slate-400 text-sm mb-8 text-center">
              Choose who you'd like to be matched with
            </p>

            {/* Target Gender */}
            <div className="w-full mb-6">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                Looking for...
              </label>
              <div className="flex gap-2">
                {(
                  [
                    { val: 'male' as Gender, label: '♂ Male', active: 'bg-indigo-500 shadow-indigo-200' },
                    { val: 'female' as Gender, label: '♀ Female', active: 'bg-pink-500 shadow-pink-200' },
                    { val: 'random' as Gender, label: 'Anyone', active: 'bg-amber-500 shadow-amber-200' },
                  ] as { val: Gender; label: string; active: string }[]
                ).map(({ val, label, active }) => (
                  <button
                    key={val}
                    onClick={() => setTargetGender(val)}
                    className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${targetGender === val
                      ? `${active} text-white shadow-lg -translate-y-0.5`
                      : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 shadow-sm'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Country */}
            <div className="w-full mb-10">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                From...
              </label>
              <div className="relative">
                <select
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                  className={selectStyle}
                >
                  <option value="random">🌍 Any Country</option>
                  <option disabled>──────────────</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}{stats[c] ? ` 🟢 ${stats[c]} online` : ''}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setStep('my-profile')}
                className="px-6 py-4 rounded-full bg-white border border-slate-200 text-slate-600
                  font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-[0.98]"
              >
                ← Back
              </button>
              <button
                onClick={() => onComplete({ myGender, myCountry, targetGender, targetCountry })}
                className="flex-1 py-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500
                  text-white font-black tracking-widest uppercase text-sm shadow-xl shadow-teal-200/50
                  transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}