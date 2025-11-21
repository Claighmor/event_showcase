"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Power, TrainFront, Activity, Wifi, MapPin, Clock } from "lucide-react";
import { floatTo16BitPCM, arrayBufferToBase64, base64ToUint8Array } from "@/lib/audio-utils";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MODEL = "models/gemini-2.5-flash-native-audio-preview-09-2025";
const API_URL = "wss://generativelanguage.googleapis.com/v1alpha/models/gemini-2.5-flash-native-audio-preview-09-2025:bidiGenerate";

const CALTRAIN_RED = "#E20612";

// Tool Definitions
const tools = [
  {
    function_declarations: [
      {
        name: "check_schedule_cache",
        description: "Checks the database for existing train times.",
        parameters: {
          type: "OBJECT",
          properties: {
            origin: { type: "STRING", description: "Starting station (e.g. 'Palo Alto')" },
            destination: { type: "STRING", description: "Destination station (e.g. 'San Francisco')" },
            day_type: { type: "STRING", enum: ["Weekday", "Weekend", "Saturday", "Sunday"], description: "Type of day" },
          },
          required: ["origin", "destination", "day_type"],
        },
      },
      {
        name: "cache_schedule_entry",
        description: "Saves a specific train route and time to the database.",
        parameters: {
          type: "OBJECT",
          properties: {
            origin: { type: "STRING" },
            destination: { type: "STRING" },
            departure_time: { type: "STRING", description: "Standardized HH:MM AM/PM format" },
            day_type: { type: "STRING", enum: ["Weekday", "Weekend", "Saturday", "Sunday"] },
            train_number: { type: "STRING", description: "Train number if available" },
          },
          required: ["origin", "destination", "departure_time", "day_type"],
        },
      },
      {
        name: "get_user_location",
        description: "Gets the user's current location (latitude and longitude). Use this when the user asks about routes from their current location.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
    ],
  },
  { google_search: {} },
];

const systemInstruction = {
  parts: [
    {
      text: `You are "The Conductor", a helpful, punctual, and slightly bureaucratic but efficient voice agent for Caltrain commuters. 
      Your goal is to provide train schedules. You have a unique "learning" ability.
      
      Procedure:
      1. If the user asks for a route from their current location, call 'get_user_location'.
      2. For specific station-to-station queries, ALWAYS call 'check_schedule_cache' first.
      3. If the cache is empty OR you have a user location, use your built-in Google Search to find the schedule.
      4. When you find the time(s) from the web, you MUST immediately call 'cache_schedule_entry' to save each time found to the database for future reference.
      5. Finally, answer the user.
      
      If the cache returns results, use them immediately without searching the web.
      
      Tone: Professional, transit-oriented, using terms like "on track", "departing", "schedule".
      `,
    },
  ],
};

interface ScheduleItem {
  origin: string;
  destination: string;
  time: string;
  status: "ON TIME" | "DELAYED" | "SCHEDULED";
  source: "CACHE" | "WEB";
}

export default function GeminiAgent() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState<{ type: "info" | "tool" | "error" | "agent"; message: string }[]>([]);
  const [scheduleBoard, setScheduleBoard] = useState<ScheduleItem[]>([]);
  const [volume, setVolume] = useState(0); // For visualizer

  const supabase = createClient();

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioInputRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (type: "info" | "tool" | "error" | "agent", message: string) => {
    setLogs((prev) => [...prev, { type, message }]);
  };

  const connect = async () => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      addLog("error", "API Key not found in environment variables.");
      return;
    }

    const url = `${API_URL}?key=${apiKey}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      addLog("info", "Connected to Caltrain Ops");
      setIsConnected(true);

      const setupMessage = {
        setup: {
          model: MODEL,
          generationConfig: {
            responseModalities: ["AUDIO"],
          },
          systemInstruction,
          tools,
        },
      };
      ws.send(JSON.stringify(setupMessage));

      startAudioInput();
    };

    ws.onmessage = async (event) => {
      let data;
      if (event.data instanceof Blob) {
        data = JSON.parse(await event.data.text());
      } else {
        data = JSON.parse(event.data);
      }

      handleServerMessage(data);
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
      addLog("error", "Connection Error");
    };

    ws.onclose = () => {
      addLog("info", "Disconnected");
      setIsConnected(false);
      stopAudioInput();
    };

    wsRef.current = ws;
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopAudioInput();
  };

  const startAudioInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      audioInputRef.current = source;

      // For visualizer volume
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      const updateVolume = () => {
        if (!audioContextRef.current) return;
        analyzer.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        setVolume(avg); // 0-255
        requestAnimationFrame(updateVolume);
      };
      updateVolume();

      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = floatTo16BitPCM(inputData);
        const base64Audio = arrayBufferToBase64(pcmData.buffer);

        const msg = {
          realtime_input: {
            media_chunks: [
              {
                mime_type: "audio/pcm",
                data: base64Audio,
              },
            ],
          },
        };
        wsRef.current.send(JSON.stringify(msg));
      };

      source.connect(processor);
      // Connect to mute node to avoid feedback but keep pipeline alive
      const muteNode = audioContext.createGain();
      muteNode.gain.value = 0;
      processor.connect(muteNode);
      muteNode.connect(audioContext.destination);

      processorRef.current = processor;
      setIsRecording(true);
    } catch (err) {
      console.error("Audio Input Error:", err);
      addLog("error", "Failed to start audio input");
    }
  };

  const stopAudioInput = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioInputRef.current) {
      audioInputRef.current.disconnect();
      audioInputRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setVolume(0);
  };

  const handleServerMessage = async (data: any) => {
    if (data.serverContent?.modelTurn?.parts) {
      for (const part of data.serverContent.modelTurn.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith("audio/pcm")) {
          const pcmData = base64ToUint8Array(part.inlineData.data);
          playAudioChunk(pcmData);
        }
      }
    }

    if (data.toolCall) {
      await handleToolCall(data.toolCall);
    }
  };

  const playAudioChunk = (pcmData: Uint8Array) => {
    if (!audioContextRef.current) return;
    const audioContext = audioContextRef.current;

    const int16Array = new Int16Array(pcmData.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const buffer = audioContext.createBuffer(1, float32Array.length, 24000);
    buffer.copyToChannel(float32Array, 0);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);

    const now = audioContext.currentTime;
    const playTime = Math.max(now, nextPlayTimeRef.current);
    source.start(playTime);

    nextPlayTimeRef.current = playTime + buffer.duration;
  };

  const handleToolCall = async (toolCall: any) => {
    const functionCalls = toolCall.functionCalls;
    const responses = [];

    for (const call of functionCalls) {
      addLog("tool", `Calling ${call.name}`);
      let response = {};

      try {
        if (call.name === "check_schedule_cache") {
          const { origin, destination, day_type } = call.args;
          
          const { data, error } = await supabase
            .from("schedules")
            .select("departure_time")
            .ilike("origin", origin)
            .ilike("destination", destination)
            .eq("day_type", day_type)
            .order("departure_time", { ascending: true });

          if (error) throw error;

          if (data && data.length > 0) {
            const times = data.map((d) => d.departure_time);
            response = { found: true, times };
            addLog("info", `Cache HIT: Found ${times.length} trains`);
            
            // Update Board
            const newItems = times.map(t => ({
                origin: origin.toUpperCase(),
                destination: destination.toUpperCase(),
                time: t,
                status: "ON TIME" as const,
                source: "CACHE" as const
            }));
            setScheduleBoard(newItems);

          } else {
            response = { found: false };
            addLog("info", "Cache MISS");
          }

        } else if (call.name === "cache_schedule_entry") {
          const { origin, destination, departure_time, day_type, train_number } = call.args;
          
          const { error } = await supabase
            .from("schedules")
            .insert({
              origin,
              destination,
              departure_time,
              day_type,
            });

          if (error) throw error;

          response = { success: true };
          addLog("info", `Learned: ${origin} -> ${destination} @ ${departure_time}`);
          
          // Update Board with new "Learned" item
          setScheduleBoard(prev => [
              ...prev, 
              {
                  origin: origin.toUpperCase(),
                  destination: destination.toUpperCase(),
                  time: departure_time,
                  status: "ON TIME",
                  source: "WEB"
              }
          ]);
        } else if (call.name === "get_user_location") {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            response = { 
              latitude: position.coords.latitude, 
              longitude: position.coords.longitude 
            };
            addLog("info", `Location: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
          } catch (e) {
            response = { error: "Location access denied" };
            addLog("error", "Location access denied");
          }
        }
      } catch (e: any) {
        console.error(e);
        response = { error: e.message };
        addLog("error", `Tool Error: ${e.message}`);
      }

      responses.push({
        id: call.id,
        name: call.name,
        response: { result: response },
      });
    }

    const toolResponse = {
      toolResponse: {
        functionResponses: responses,
      },
    };

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify(toolResponse));
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-6xl mx-auto p-4 relative z-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 bg-black/40 p-4 rounded-full backdrop-blur-md border border-white/10">
        <div className="bg-[#E20612] p-2 rounded-full shadow-[0_0_15px_#E20612]">
          <TrainFront className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tighter text-white uppercase">
          Caltrain <span className="text-[#E20612]">Voice Agent</span>
        </h1>
      </div>

      {/* Main Display Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
        
        {/* Visualizer / Control Center - 4 Columns */}
        <Card className="col-span-1 md:col-span-4 bg-black/80 backdrop-blur-xl border-white/10 p-6 flex flex-col items-center justify-between min-h-[400px] relative overflow-hidden shadow-2xl rounded-3xl group">
            {/* Grid Background */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 pointer-events-none"></div>
            
            {/* Pulsing Circle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div 
                    className={cn(
                        "rounded-full bg-[#E20612] blur-2xl transition-all duration-75",
                        isConnected ? "opacity-40" : "opacity-5"
                    )}
                    style={{
                        width: `${100 + (volume / 255) * 300}px`,
                        height: `${100 + (volume / 255) * 300}px`,
                    }}
                 />
            </div>

            {/* Status Header */}
            <div className="w-full flex justify-between items-center z-10 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#E20612]" />
                    <span className="text-xs font-mono uppercase tracking-widest text-gray-400">System Status</span>
                </div>
                <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500 shadow-[0_0_10px_#0f0]" : "bg-red-500")} />
            </div>

            <div className="z-20 w-full flex justify-center my-auto relative">
                {/* Ring Animations */}
                <div className="absolute inset-0 border border-[#E20612]/30 rounded-full scale-150 animate-[spin_10s_linear_infinite] pointer-events-none border-t-transparent border-l-transparent" />
                <div className="absolute inset-0 border border-white/10 rounded-full scale-125 pointer-events-none" />
                
                {!isConnected ? (
                    <Button 
                        onClick={connect}
                        className="rounded-full w-32 h-32 bg-white text-black hover:bg-gray-200 hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] flex flex-col items-center justify-center gap-2 group-hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]"
                    >
                        <Power className="w-10 h-10" />
                        <span className="text-xs font-bold tracking-widest uppercase">Connect</span>
                    </Button>
                ) : (
                    <Button 
                        onClick={disconnect}
                        className="rounded-full w-32 h-32 bg-[#E20612] hover:bg-red-600 text-white transition-all shadow-[0_0_40px_#E20612] flex flex-col items-center justify-center gap-2 animate-pulse"
                    >
                        <Mic className="w-10 h-10" />
                        <span className="text-xs font-bold tracking-widest uppercase">Listening</span>
                    </Button>
                )}
            </div>
            
            <div className="z-10 w-full flex justify-between text-xs font-mono text-gray-500 uppercase tracking-widest">
                <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    <span>{isConnected ? "Connected" : "Offline"}</span>
                </div>
                <div>
                    Model: Gemini 2.0 Flash
                </div>
            </div>
        </Card>

        {/* Live Departure Board - 8 Columns */}
        <div className="col-span-1 md:col-span-8 flex flex-col gap-6">
            <Card className="flex-1 bg-black border-4 border-[#222] p-1 shadow-2xl overflow-hidden flex flex-col relative rounded-xl">
                {/* Scanlines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 pointer-events-none bg-[length:100%_2px,3px_100%]"></div>
                
                {/* Header */}
                <div className="bg-[#111] p-4 flex justify-between items-center border-b-2 border-[#333] z-10">
                    <h2 className="text-yellow-500 font-mono text-2xl tracking-[0.2em] uppercase font-bold glow-text flex items-center gap-3">
                        <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_10px_yellow]"></span>
                        Departures
                    </h2>
                    <div className="text-yellow-500/50 font-mono text-sm">
                        {new Date().toLocaleDateString()}
                    </div>
                </div>

                {/* Board Content */}
                <div className="flex-1 bg-black p-4 font-mono text-yellow-500 space-y-2 overflow-y-auto max-h-[400px] relative z-10">
                    <div className="grid grid-cols-12 gap-4 text-xs text-yellow-500/40 border-b border-yellow-500/20 pb-2 mb-2 px-2 uppercase tracking-wider">
                        <div className="col-span-2">Time</div>
                        <div className="col-span-4">Destination</div>
                        <div className="col-span-3">Origin</div>
                        <div className="col-span-3 text-right">Status</div>
                    </div>

                    {scheduleBoard.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-yellow-500/20 space-y-4">
                            <p className="tracking-widest animate-pulse">NO SCHEDULES REQUESTED</p>
                        </div>
                    ) : (
                        scheduleBoard.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-[#111] p-2 rounded border border-[#222] hover:border-[#E20612]/50 transition-colors group animate-in fade-in slide-in-from-left-4 duration-500">
                                <div className="col-span-2 font-bold text-xl text-white glow-text">{item.time}</div>
                                <div className="col-span-4 truncate uppercase tracking-wider text-yellow-400">{item.destination}</div>
                                <div className="col-span-3 truncate uppercase text-gray-400">{item.origin}</div>
                                <div className="col-span-3 flex flex-col items-end">
                                    <span className={cn(
                                        "text-xs font-bold px-2 py-0.5 rounded tracking-wider", 
                                        item.status === "ON TIME" ? "bg-green-900/30 text-green-400 border border-green-900/50" : "bg-red-900/30 text-red-400"
                                    )}>
                                        {item.status}
                                    </span>
                                    <span className="text-[10px] text-gray-600 mt-1">{item.source}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* Logs Console */}
            <Card className="w-full bg-[#0a0a0a] border border-white/10 font-mono text-xs h-48 p-0 relative overflow-hidden rounded-xl shadow-lg">
                <div className="bg-[#1a1a1a] p-2 px-4 border-b border-white/5 flex justify-between items-center text-gray-500">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                    </div>
                    <span className="uppercase tracking-widest text-[10px]">System Logs</span>
                </div>
                <ScrollArea className="h-full p-4 pb-12">
                {logs.map((log, i) => (
                    <div key={i} className="mb-2 font-mono flex gap-2 items-start opacity-80 hover:opacity-100 transition-opacity">
                    <span className="text-gray-600 select-none">[{new Date().toLocaleTimeString()}]</span>
                    <span
                        className={cn(
                        "break-all",
                        log.type === "tool" && "text-blue-400",
                        log.type === "error" && "text-red-400",
                        log.type === "info" && "text-gray-300",
                        log.type === "agent" && "text-[#E20612]"
                        )}
                    >
                        {log.type === "tool" && <span className="text-blue-600 mr-2">$</span>}
                        {log.type === "agent" && <span className="text-[#E20612] mr-2">❯</span>}
                        {log.type === "error" && <span className="text-red-600 mr-2">✖</span>}
                        {log.message}
                    </span>
                    </div>
                ))}
                <div ref={logEndRef} />
                </ScrollArea>
            </Card>
        </div>
      </div>
    </div>
  );
}
