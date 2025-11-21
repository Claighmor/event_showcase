import { EnvVarWarning } from "@/components/env-var-warning";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import { TrainFront, Zap, Map, Radio } from "lucide-react";
import { TrainMapAnimation } from "@/components/train-map-animation";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center bg-background relative overflow-hidden selection:bg-[#E20612] selection:text-white">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-dot-pattern text-foreground/5 pointer-events-none" />
      <TrainMapAnimation />
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#E20612]/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex-1 w-full flex flex-col gap-20 items-center relative z-10">
        <nav className="w-full flex justify-center border-b border-foreground/5 h-16 backdrop-blur-sm bg-background/50 sticky top-0 z-50">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold text-lg">
              <Link href={"/"} className="flex items-center gap-2 group">
                <div className="bg-[#E20612] p-1.5 rounded-lg text-white group-hover:scale-110 transition-transform">
                  <TrainFront className="w-5 h-5" />
                </div>
                <span className="uppercase tracking-tight font-bold group-hover:text-[#E20612] transition-colors">Caltrain Voice</span>
              </Link>
            </div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <div className="flex items-center gap-2">
                 {/* Auth removed for public access */}
              </div>
            )}
          </div>
        </nav>
        
        <div className="flex-1 flex flex-col gap-16 max-w-5xl p-5 w-full items-center justify-center text-center">
          <div className="flex flex-col gap-8 items-center max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E20612]/10 text-[#E20612] text-sm font-medium border border-[#E20612]/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E20612] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E20612]"></span>
              </span>
              Now Live: Gemini 2.0 Integration
            </div>
            
            <h1 className="text-6xl sm:text-7xl font-bold leading-tight tracking-tight">
              Your Personal <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E20612] to-orange-600 relative">
                Caltrain Conductor
                <svg className="absolute w-full h-3 bottom-2 left-0 text-[#E20612]/20 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span>
            </h1>
            
            <p className="text-xl text-foreground/60 max-w-2xl leading-relaxed">
              Get real-time schedules, track trains, and learn new routes with a voice agent that actually understands you. 
              Powered by Gemini Multimodal Live.
            </p>
            
            <div className="flex gap-4 items-center flex-col sm:flex-row mt-4">
              <Link
                href="/agent"
                className="px-8 py-4 bg-[#E20612] text-white rounded-full font-bold text-lg hover:bg-red-700 transition-all shadow-lg hover:shadow-[#E20612]/40 flex items-center gap-2 group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start "The Conductor" <Radio className="w-5 h-5 animate-pulse" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              
              {/* Dashboard link removed for public access */}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full text-left">
            <div className="group p-8 rounded-3xl border border-foreground/10 bg-background/50 backdrop-blur-sm hover:border-[#E20612]/30 hover:bg-[#E20612]/5 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl">
              <div className="w-12 h-12 bg-[#E20612]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#E20612] transition-colors">
                <Zap className="w-6 h-6 text-[#E20612] group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                Smart Caching
              </h3>
              <p className="text-foreground/60 leading-relaxed">
                The agent learns schedules as you ask. Frequent queries become instant, powered by Supabase.
              </p>
            </div>
            
            <div className="group p-8 rounded-3xl border border-foreground/10 bg-background/50 backdrop-blur-sm hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500 transition-colors">
                <Map className="w-6 h-6 text-blue-500 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                Live Web Search
              </h3>
              <p className="text-foreground/60 leading-relaxed">
                If a schedule isn't cached, the agent searches the live web to find real-time data for you.
              </p>
            </div>
            
            <div className="group p-8 rounded-3xl border border-foreground/10 bg-background/50 backdrop-blur-sm hover:border-orange-500/30 hover:bg-orange-500/5 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-500 transition-colors">
                <TrainFront className="w-6 h-6 text-orange-500 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                Dynamic Board
              </h3>
              <p className="text-foreground/60 leading-relaxed">
                Watch the departure board update in real-time as the agent finds and learns your trains.
              </p>
            </div>
          </div>
        </div>

        <footer className="w-full flex flex-col md:flex-row items-center justify-center border-t border-foreground/5 mx-auto text-center text-xs gap-8 py-12 text-foreground/50 bg-background/30 backdrop-blur-sm">
          <p>
            Built with <span className="font-bold text-foreground">Next.js</span>, <span className="font-bold text-foreground">Supabase</span> & <span className="font-bold text-foreground">Gemini</span>
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
