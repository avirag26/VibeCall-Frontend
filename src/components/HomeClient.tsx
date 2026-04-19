'use client';

import { useState } from 'react';
import VoiceChat from '@/components/VoiceChat';
import FilterWizard from '@/components/FilterWizard';
import { CombinedFilters } from '@/types/chat';

export default function HomeClient() {
    const [filters, setFilters] = useState<CombinedFilters | null>(null);
    const [savedFilters, setSavedFilters] = useState<CombinedFilters | null>(null);

    const handleComplete = (f: CombinedFilters) => {
        setSavedFilters(f);
        setFilters(f);
    };
    return (
        <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-50">
            {/* Animated background blobs */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] rounded-full bg-yellow-200/50 blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[60%] h-[60%] rounded-full bg-sky-200/60 blur-[100px] animate-pulse [animation-delay:3s]" />
                <div className="absolute top-[20%] left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-100/40 blur-[80px] animate-bounce [animation-duration:12s]" />
            </div>

            <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center">
                <header className="text-center mb-10">
                    <h1 className="text-6xl font-black tracking-tight text-slate-800 mb-2">
                        Vibe<span className="text-sky-500">Call</span>
                    </h1>
                    <div className="flex items-center justify-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
                        </span>
                        <p className="text-sm font-bold tracking-[0.2em] text-slate-500 uppercase">
                            Voice-only random chat
                        </p>
                    </div>
                </header>

                <div className="w-full max-w-md bg-white/40 backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-2">
                    {!filters ? (
                        <FilterWizard initialData={savedFilters} onComplete={handleComplete} />
                    ) : (
                        <VoiceChat filters={filters} onGoBack={() => setFilters(null)} />
                    )}
                </div>
            </div>
        </main>
    );
}