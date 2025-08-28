"use client";

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[200]">
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Energy Vortex Rings */}
        <div className="absolute inset-0 border-2 border-cyan-500/50 rounded-full animate-vortex-spin-slow opacity-50 shadow-[0_0_20px_theme(colors.cyan.500)]"></div>
        <div className="absolute inset-4 border-2 border-blue-500/50 rounded-full animate-vortex-spin-medium opacity-60 shadow-[0_0_20px_theme(colors.blue.500)]"></div>
        <div className="absolute inset-8 border-2 border-purple-500/50 rounded-full animate-vortex-spin-fast opacity-70 shadow-[0_0_20px_theme(colors.purple.500)]"></div>
        
        {/* Pulsating Glow */}
        <div 
          className="absolute inset-0 rounded-full animate-vortex-pulse"
          style={{
            boxShadow: '0 0 40px 10px rgba(0, 255, 255, 0.4), 0 0 60px 20px rgba(76, 0, 255, 0.4)',
            filter: 'blur(15px)',
          }}
        ></div>
        <div className="z-10 text-white text-4xl font-mono font-bold animate-pulse" style={{textShadow: '0 0 10px #fff, 0 0 20px #0ff, 0 0 30px #0ff'}}>
          Loading...
        </div>
      </div>
       <div className="mt-12 text-center z-10">
        <h1 className="text-xl font-cinzel font-bold text-white tracking-wider" style={{textShadow: '0 0 8px rgba(255, 255, 255, 0.7)'}}>
          Open To Lucky Winner Game Play
        </h1>
      </div>
    </div>
  );
}
