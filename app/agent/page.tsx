import GeminiAgent from "@/components/gemini-agent";

export default function AgentPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[linear-gradient(-45deg,#050505,#1a1a1a,#2e0202,#000000)] bg-[length:400%_400%] animate-gradient-slow text-white p-4">
      <main className="flex flex-col items-center w-full flex-1">
        <GeminiAgent />
      </main>
    </div>
  );
}
