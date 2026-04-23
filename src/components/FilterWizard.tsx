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

// ── Animated World Banner (Light Theme Dynamic Constellation) ───────────────────
function WorldBanner({ totalUsers }: { totalUsers: number }) {
  const [activeNodes, setActiveNodes] = useState(() => [
    { id: 1, country: 'India', cx: 80, cy: 50, color: '#6366f1', visible: true },
    { id: 2, country: 'United States', cx: 280, cy: 35, color: '#ec4899', visible: true },
    { id: 3, country: 'Brazil', cx: 180, cy: 90, color: '#10b981', visible: true },
    { id: 4, country: 'Germany', cx: 340, cy: 70, color: '#f59e0b', visible: true },
    { id: 5, country: 'United Kingdom', cx: 120, cy: 105, color: '#0ea5e9', visible: true },
  ]);

  useEffect(() => {
    // Dynamically blink and cycle through ALL countries
    const interval = setInterval(() => {
      setActiveNodes(current => {
        const newNodes = [...current];
        const randomIndex = Math.floor(Math.random() * newNodes.length);

        // Hide the node
        newNodes[randomIndex] = { ...newNodes[randomIndex], visible: false };

        // Bring it back 1 second later with a new random country
        setTimeout(() => {
          setActiveNodes(curr => {
            const nodes = [...curr];
            nodes[randomIndex] = {
              ...nodes[randomIndex],
              country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
              visible: true
            };
            return nodes;
          });
        }, 1000);

        return newNodes;
      });
    }, 3000); // Trigger a blink every 2.5 seconds

    return () => clearInterval(interval);
  }, []);

  // Soft background dots
  const dots = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    delay: `${Math.random() * 3}s`
  }));

  return (
    // Visual Separation added here: bg-slate-100, bottom border, and inset shadow
    <div className="relative w-full h-[140px] bg-slate-100 rounded-t-[2.5rem] overflow-hidden border-b-[3px] border-slate-200 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.02)]">

      {/* Twinkling Background Dots */}
      {dots.map((dot) => (
        <div
          key={dot.id}
          className="absolute bg-slate-300 rounded-full animate-twinkle"
          style={{
            top: dot.top,
            left: dot.left,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            animationDelay: dot.delay
          }}
        />
      ))}

      {/* SVG Connecting Lines (Persistent) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50" viewBox="0 0 400 140" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <path
          d="M 80 50 Q 180 10 280 35 T 340 70 T 180 90 T 120 105 T 80 50"
          stroke="url(#lineGrad)"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          fill="none"
          className="animate-dash"
        />
      </svg>

      {/* Dynamic Floating Nodes */}
      {activeNodes.map((stat, i) => (
        <div
          key={stat.id}
          className={`absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-700 ease-in-out ${stat.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
          style={{
            top: `${(stat.cy / 140) * 100}%`,
            left: `${(stat.cx / 400) * 100}%`,
            animation: `float-node 3s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.4}s`
          }}
        >
          {/* Node Dot */}
          <div className="relative flex items-center justify-center mb-1">
            <div className="absolute w-6 h-6 rounded-full opacity-20 animate-ping" style={{ backgroundColor: stat.color, animationDuration: '2s', animationDelay: `${i * 0.3}s` }} />
            <div className="w-2.5 h-2.5 rounded-full shadow-sm border-[1.5px] border-white" style={{ backgroundColor: stat.color }} />
          </div>

          {/* Node Label (Country Only) */}
          <div className="bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-slate-700 border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)] max-w-[80px] truncate text-center">
            {stat.country}
          </div>
        </div>
      ))}

      {/* Bottom Title */}
      <div className="absolute bottom-3 w-full text-center pointer-events-none">
        <span className="text-[7px] font-black tracking-[0.25em] text-slate-400 uppercase drop-shadow-sm">
          Connecting Voices Worldwide
        </span>
      </div>

      <style>{`
        @keyframes float-node {
          0% { transform: translate(-50%, -50%) translateY(0px); }
          100% { transform: translate(-50%, -50%) translateY(-5px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes dash {
          to { stroke-dashoffset: -24; }
        }
        .animate-dash {
          animation: dash 2s linear infinite;
        }
        .animate-twinkle {
          animation: twinkle 4s ease-in-out infinite;
        }
      `}</style>
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