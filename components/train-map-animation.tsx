"use client";

import { useEffect, useState } from "react";

export function TrainMapAnimation() {
  // Simple state to trigger animations if needed, though CSS is often smoother for continuous movement
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      <svg
        className="w-full h-full opacity-30"
        viewBox="0 0 1000 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(226, 6, 18, 0)" />
            <stop offset="50%" stopColor="rgba(226, 6, 18, 0.4)" />
            <stop offset="100%" stopColor="rgba(226, 6, 18, 0)" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <mask id="mask-path">
            <path
              d="M100,700 C300,600 400,400 500,300 S800,100 900,100"
              fill="none"
              stroke="white"
              strokeWidth="2"
            />
             <path
              d="M500,800 C500,600 500,400 500,0"
              fill="none"
              stroke="white"
              strokeWidth="2"
            />
            <path
              d="M200,100 C300,300 600,500 900,700"
              fill="none"
              stroke="white"
              strokeWidth="2"
            />
          </mask>
        </defs>

        {/* Background Network Lines (Static-ish) */}
        <g stroke="currentColor" strokeWidth="0.5" className="text-gray-300/20">
           {/* Vertical Grid */}
           <line x1="200" y1="0" x2="200" y2="800" strokeDasharray="4 4" />
           <line x1="500" y1="0" x2="500" y2="800" strokeDasharray="4 4" />
           <line x1="800" y1="0" x2="800" y2="800" strokeDasharray="4 4" />
           {/* Horizontal Grid */}
           <line x1="0" y1="200" x2="1000" y2="200" strokeDasharray="4 4" />
           <line x1="0" y1="500" x2="1000" y2="500" strokeDasharray="4 4" />
        </g>

        {/* Main Route Lines */}
        <g filter="url(#glow)">
          {/* Route 1 */}
          <path
            d="M100,700 C300,600 400,400 500,300 S800,100 900,100"
            fill="none"
            stroke="url(#line-gradient)"
            strokeWidth="2"
            className="animate-pulse"
          />
          {/* Route 2 */}
          <path
            d="M500,800 C500,600 500,400 500,0"
            fill="none"
            stroke="rgba(226, 6, 18, 0.1)"
            strokeWidth="1.5"
          />
           {/* Route 3 */}
           <path
            d="M200,100 C300,300 600,500 900,700"
            fill="none"
            stroke="rgba(59, 130, 246, 0.1)"
            strokeWidth="1.5"
          />
        </g>

        {/* Animated Trains (Dots) */}
        <circle r="3" fill="#E20612" filter="url(#glow)">
          <animateMotion
            dur="10s"
            repeatCount="indefinite"
            path="M100,700 C300,600 400,400 500,300 S800,100 900,100"
          />
          <animate
             attributeName="opacity"
             values="0;1;1;0"
             keyTimes="0;0.1;0.9;1"
             dur="10s"
             repeatCount="indefinite"
          />
        </circle>

        <circle r="3" fill="#E20612" filter="url(#glow)">
          <animateMotion
            dur="14s"
            begin="2s"
            repeatCount="indefinite"
            path="M900,100 C800,100 500,300 400,400 S300,600 100,700"
          />
           <animate
             attributeName="opacity"
             values="0;1;1;0"
             keyTimes="0;0.1;0.9;1"
             dur="14s"
             repeatCount="indefinite"
          />
        </circle>

        <circle r="3" fill="#3b82f6" filter="url(#glow)">
          <animateMotion
            dur="12s"
            begin="0s"
            repeatCount="indefinite"
            path="M500,800 C500,600 500,400 500,0"
          />
           <animate
             attributeName="opacity"
             values="0;1;1;0"
             keyTimes="0;0.1;0.9;1"
             dur="12s"
             repeatCount="indefinite"
          />
        </circle>
         <circle r="3" fill="#3b82f6" filter="url(#glow)">
          <animateMotion
            dur="12s"
            begin="6s"
            repeatCount="indefinite"
            path="M500,0 C500,400 500,600 500,800"
          />
           <animate
             attributeName="opacity"
             values="0;1;1;0"
             keyTimes="0;0.1;0.9;1"
             dur="12s"
             repeatCount="indefinite"
          />
        </circle>

         {/* Stations (Nodes) */}
         <g fill="#1f2937" stroke="rgba(255,255,255,0.1)" strokeWidth="1">
            <circle cx="500" cy="300" r="4" />
            <circle cx="500" cy="500" r="4" />
            <circle cx="250" cy="625" r="4" />
            <circle cx="750" cy="175" r="4" />
         </g>
      </svg>
    </div>
  );
}

