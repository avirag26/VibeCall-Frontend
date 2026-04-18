import VoiceChat from '@/components/VoiceChat';

export default function Home() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-50">
      {/* --- Animated Light Background --- */}
      <div className="absolute inset-0 z-0">
        {/* Soft Yellow/Amber Glow */}
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] rounded-full bg-yellow-200/50 blur-[100px] animate-pulse" />

        {/* Sky Blue Glow */}
        <div className="absolute bottom-[-10%] left-[-5%] w-[60%] h-[60%] rounded-full bg-sky-200/60 blur-[100px] animate-pulse [animation-delay:3s]" />

        {/* Floating Pink/Violet accent */}
        <div className="absolute top-[20%] left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-100/40 blur-[80px] animate-bounce [animation-duration:12s]" />

        {/* Subtle Grid Pattern for a modern tech feel */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05]" />
      </div>

      {/* --- Content Layer --- */}
      <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center">
        <header className="text-center mb-10">
          <h1 className="text-6xl font-black tracking-tight text-slate-800 mb-2">
            Vibe<span className="text-sky-500">Call</span>
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
            </span>
            <p className="text-sm font-bold tracking-[0.2em] text-slate-500 uppercase">
              Voice-only random chat
            </p>
          </div>
        </header>

        {/* Card Container with soft glass effect */}
        <div className="w-full max-w-md bg-white/40 backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-2">
          <VoiceChat />
        </div>
      </div>
    </main>
  );
}