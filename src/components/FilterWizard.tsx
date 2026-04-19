'use client';

import { useState } from 'react';
import { Gender, Country, CombinedFilters } from '../types/chat';

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

interface FilterWizardProps {
  initialData?: CombinedFilters | null;
  onComplete: (filters: CombinedFilters) => void;
}

export default function FilterWizard({ initialData, onComplete }: FilterWizardProps) {
  const [step, setStep] = useState<'my-profile' | 'preferences'>(initialData ? 'preferences' : 'my-profile');
  const [myGender, setMyGender] = useState<Gender>(initialData?.myGender || '');
  const [myCountry, setMyCountry] = useState<Country>(initialData?.myCountry || '');
  const [targetGender, setTargetGender] = useState<Gender>(initialData?.targetGender || 'random');
  const [targetCountry, setTargetCountry] = useState<Country>(initialData?.targetCountry || 'random');

  const selectStyle = `w-full bg-white border border-slate-100 shadow-sm rounded-2xl p-4 text-slate-700
    font-bold focus:ring-4 focus:ring-sky-100 outline-none transition-all appearance-none cursor-pointer`;

  return (
    <div className="w-full flex flex-col items-center px-4 py-8">

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step === 'my-profile' ? 'bg-sky-500 scale-125' : 'bg-slate-300'}`} />
        <div className="w-8 h-px bg-slate-200" />
        <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step === 'preferences' ? 'bg-sky-500 scale-125' : 'bg-slate-300'}`} />
      </div>

      {/* ── Step 1: My Profile ── */}
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
                  <option key={c} value={c}>{c}</option>
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

      {/* ── Step 2: Preferences ── */}
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
                  { val: 'random' as Gender, label: '✦ Anyone', active: 'bg-amber-500 shadow-amber-200' },
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
                  <option key={c} value={c}>{c}</option>
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
  );
}