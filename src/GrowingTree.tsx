interface GrowingTreeProps {
  value: number  // 0-12
  maxValue: number
}

export function GrowingTree({ value, maxValue }: GrowingTreeProps) {
  // Normalize to 0-1 range for smooth interpolation
  const t = value / maxValue
  
  // Calculate stage progress (0-4 continuous)
  const stageProgress = t * 4
  
  // Helper to get opacity/scale for each stage element
  const getStageVisibility = (stage: number) => {
    const stageStart = (stage - 1) / 4
    const stageEnd = stage / 4
    const progress = Math.max(0, Math.min(1, (t - stageStart) / (stageEnd - stageStart)))
    return progress
  }
  
  // Trunk height grows continuously
  const trunkHeight = Math.min(80, t * 100)
  
  return (
    <div className="relative w-full h-40 flex items-end justify-center">
      <svg 
        viewBox="0 0 200 140" 
        className="w-full h-full max-w-xs"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
      >
        {/* Ground */}
        <ellipse 
          cx="100" 
          cy="130" 
          rx="80" 
          ry="10" 
          className="fill-amber-900/60"
        />
        
        {/* Soil mound */}
        <ellipse 
          cx="100" 
          cy="125" 
          rx="40" 
          ry="8" 
          className="fill-amber-800/80"
        />

        {/* Main trunk - grows continuously */}
        {value > 0 && (
          <rect
            x="97"
            y={125 - trunkHeight}
            width={4 + Math.min(4, stageProgress)}
            height={trunkHeight}
            rx="3"
            className="fill-green-700 transition-all duration-200 ease-out"
          />
        )}

        {/* Stage 1: First sprout leaves */}
        <g 
          className="transition-all duration-300"
          style={{ 
            opacity: getStageVisibility(1),
            transform: `scale(${0.5 + getStageVisibility(1) * 0.5})`,
            transformOrigin: '100px 115px'
          }}
        >
          <ellipse cx="90" cy="112" rx="8" ry="5" className="fill-green-500" transform="rotate(-35 90 112)" />
          <ellipse cx="110" cy="112" rx="8" ry="5" className="fill-green-500" transform="rotate(35 110 112)" />
        </g>

        {/* Stage 1.5: Additional small leaves */}
        <g 
          className="transition-all duration-300"
          style={{ 
            opacity: Math.max(0, (stageProgress - 0.5) * 2),
            transform: `scale(${Math.max(0, (stageProgress - 0.5))})`,
            transformOrigin: '100px 105px'
          }}
        >
          <ellipse cx="95" cy="105" rx="6" ry="4" className="fill-lime-500" transform="rotate(-20 95 105)" />
          <ellipse cx="105" cy="105" rx="6" ry="4" className="fill-lime-500" transform="rotate(20 105 105)" />
        </g>

        {/* Stage 2: More leaves growing */}
        <g 
          className="transition-all duration-300"
          style={{ 
            opacity: getStageVisibility(2),
            transform: `scale(${0.5 + getStageVisibility(2) * 0.5})`,
            transformOrigin: '100px 90px'
          }}
        >
          <ellipse cx="82" cy="92" rx="12" ry="6" className="fill-lime-500" transform="rotate(-40 82 92)" />
          <ellipse cx="118" cy="92" rx="12" ry="6" className="fill-lime-500" transform="rotate(40 118 92)" />
        </g>

        {/* Stage 2.5: Upper leaves */}
        <g 
          className="transition-all duration-300"
          style={{ 
            opacity: Math.max(0, (stageProgress - 1.5) * 2),
            transform: `scale(${Math.max(0, Math.min(1, stageProgress - 1.5))})`,
            transformOrigin: '100px 80px'
          }}
        >
          <ellipse cx="88" cy="80" rx="10" ry="5" className="fill-green-400" transform="rotate(-25 88 80)" />
          <ellipse cx="112" cy="80" rx="10" ry="5" className="fill-green-400" transform="rotate(25 112 80)" />
        </g>

        {/* Stage 3: Branches forming */}
        <g 
          className="transition-all duration-300"
          style={{ 
            opacity: getStageVisibility(3),
            transform: `scale(${0.5 + getStageVisibility(3) * 0.5})`,
            transformOrigin: '100px 60px'
          }}
        >
          {/* Branches */}
          <path d="M100 65 L72 45" className="stroke-green-600" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M100 65 L128 45" className="stroke-green-600" strokeWidth="4" strokeLinecap="round" fill="none" />
          
          {/* Side canopy */}
          <circle cx="70" cy="42" r="14" className="fill-emerald-500" />
          <circle cx="130" cy="42" r="14" className="fill-emerald-500" />
        </g>

        {/* Stage 3.5: Center canopy */}
        <g 
          className="transition-all duration-300"
          style={{ 
            opacity: Math.max(0, (stageProgress - 2.5) * 2),
            transform: `scale(${Math.max(0, Math.min(1, stageProgress - 2.5))})`,
            transformOrigin: '100px 45px'
          }}
        >
          <circle cx="100" cy="38" r="18" className="fill-emerald-400" />
          <circle cx="85" cy="52" r="12" className="fill-green-400" />
          <circle cx="115" cy="52" r="12" className="fill-green-400" />
        </g>

        {/* Stage 4: Fruits appearing one by one */}
        <g className="transition-all duration-300">
          {/* Fruit 1 */}
          <g style={{ 
            opacity: Math.max(0, Math.min(1, (stageProgress - 3) * 3)),
            transform: `scale(${Math.max(0, Math.min(1, (stageProgress - 3) * 3))})`,
            transformOrigin: '68px 50px'
          }}>
            <circle cx="68" cy="50" r="7" className="fill-red-500" />
            <circle cx="66" cy="48" r="2" className="fill-red-300/60" />
          </g>
          
          {/* Fruit 2 */}
          <g style={{ 
            opacity: Math.max(0, Math.min(1, (stageProgress - 3.2) * 3)),
            transform: `scale(${Math.max(0, Math.min(1, (stageProgress - 3.2) * 3))})`,
            transformOrigin: '132px 50px'
          }}>
            <circle cx="132" cy="50" r="7" className="fill-red-500" />
            <circle cx="130" cy="48" r="2" className="fill-red-300/60" />
          </g>
          
          {/* Fruit 3 */}
          <g style={{ 
            opacity: Math.max(0, Math.min(1, (stageProgress - 3.4) * 3)),
            transform: `scale(${Math.max(0, Math.min(1, (stageProgress - 3.4) * 3))})`,
            transformOrigin: '88px 36px'
          }}>
            <circle cx="88" cy="36" r="6" className="fill-red-400" />
            <circle cx="86" cy="34" r="2" className="fill-red-300/60" />
          </g>
          
          {/* Fruit 4 */}
          <g style={{ 
            opacity: Math.max(0, Math.min(1, (stageProgress - 3.6) * 3)),
            transform: `scale(${Math.max(0, Math.min(1, (stageProgress - 3.6) * 3))})`,
            transformOrigin: '112px 36px'
          }}>
            <circle cx="112" cy="36" r="6" className="fill-red-400" />
            <circle cx="110" cy="34" r="2" className="fill-red-300/60" />
          </g>
          
          {/* Fruit 5 - top center */}
          <g style={{ 
            opacity: Math.max(0, Math.min(1, (stageProgress - 3.8) * 5)),
            transform: `scale(${Math.max(0, Math.min(1, (stageProgress - 3.8) * 5))})`,
            transformOrigin: '100px 26px'
          }}>
            <circle cx="100" cy="26" r="8" className="fill-red-500" />
            <circle cx="98" cy="24" r="2.5" className="fill-red-300/60" />
          </g>
        </g>

        {/* Prompt text when empty */}
        {value === 0 && (
          <text x="100" y="70" textAnchor="middle" className="fill-slate-500 text-[10px] font-medium">
            Drag slider to grow
          </text>
        )}
      </svg>
    </div>
  )
}
