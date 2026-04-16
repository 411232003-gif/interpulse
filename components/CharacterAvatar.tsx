interface CharacterAvatarProps {
  gender: 'cowok' | 'cewek'
  bmi: number
  bodyColor: string
  animationKey: number
}

export default function CharacterAvatar({ gender, bmi, bodyColor, animationKey }: CharacterAvatarProps) {
  // Calculate proportions based on BMI
  const getBodyWidth = () => {
    if (bmi < 18.5) return 60
    if (bmi < 25) return 80
    if (bmi < 30) return 100
    return 120
  }

  const getBodyHeight = () => {
    if (bmi < 18.5) return 180
    if (bmi < 25) return 160
    if (bmi < 30) return 150
    return 140
  }

  const bodyWidth = getBodyWidth()
  const bodyHeight = getBodyHeight()
  const headSize = 50

  if (gender === 'cewek') {
    // Karakter Cewek dengan Hijab (seperti foto)
    return (
      <svg
        key={animationKey}
        width="250"
        height="450"
        viewBox="0 0 250 450"
        className="transition-all duration-1000 ease-in-out"
      >
        <defs>
          <linearGradient id="skinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fcd5b5" />
            <stop offset="100%" stopColor="#f4c4a0" />
          </linearGradient>
          <linearGradient id="hijabGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4915f" />
            <stop offset="100%" stopColor="#a67c52" />
          </linearGradient>
          <linearGradient id="dressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b6f47" />
            <stop offset="100%" stopColor="#6b5435" />
          </linearGradient>
        </defs>

        <g className="animate-float">
          {/* Shadow */}
          <ellipse cx="125" cy="420" rx="60" ry="15" fill="#ffc0cb" opacity="0.3">
            <animate attributeName="rx" values="60;65;60" dur="2s" repeatCount="indefinite" />
          </ellipse>

          {/* Legs/Pants */}
          <rect
            x={125 - bodyWidth * 0.15}
            y={280 + bodyHeight * 0.6}
            width={bodyWidth * 0.3}
            height="120"
            fill="#d4a574"
            rx="15"
            className="transition-all duration-1000"
          >
            <animate attributeName="y" values={`${280 + bodyHeight * 0.6};${278 + bodyHeight * 0.6};${280 + bodyHeight * 0.6}`} dur="2s" repeatCount="indefinite" />
          </rect>
          <rect
            x={125 + bodyWidth * 0.15 - bodyWidth * 0.3}
            y={280 + bodyHeight * 0.6}
            width={bodyWidth * 0.3}
            height="120"
            fill="#d4a574"
            rx="15"
            className="transition-all duration-1000"
          >
            <animate attributeName="y" values={`${280 + bodyHeight * 0.6};${278 + bodyHeight * 0.6};${280 + bodyHeight * 0.6}`} dur="2s" repeatCount="indefinite" />
          </rect>

          {/* Dress/Gamis */}
          <path
            d={`M ${125 - bodyWidth * 0.5} 180 
                L ${125 - bodyWidth * 0.6} ${280 + bodyHeight * 0.6}
                L ${125 + bodyWidth * 0.6} ${280 + bodyHeight * 0.6}
                L ${125 + bodyWidth * 0.5} 180 Z`}
            fill="url(#dressGradient)"
            className="transition-all duration-1000"
          >
            <animate attributeName="d" 
              values={`M ${125 - bodyWidth * 0.5} 180 L ${125 - bodyWidth * 0.6} ${280 + bodyHeight * 0.6} L ${125 + bodyWidth * 0.6} ${280 + bodyHeight * 0.6} L ${125 + bodyWidth * 0.5} 180 Z;
                       M ${125 - bodyWidth * 0.5} 178 L ${125 - bodyWidth * 0.6} ${278 + bodyHeight * 0.6} L ${125 + bodyWidth * 0.6} ${278 + bodyHeight * 0.6} L ${125 + bodyWidth * 0.5} 178 Z;
                       M ${125 - bodyWidth * 0.5} 180 L ${125 - bodyWidth * 0.6} ${280 + bodyHeight * 0.6} L ${125 + bodyWidth * 0.6} ${280 + bodyHeight * 0.6} L ${125 + bodyWidth * 0.5} 180 Z`}
              dur="2s" repeatCount="indefinite" />
          </path>

          {/* Dress Detail/Pocket */}
          <ellipse cx={125 - bodyWidth * 0.3} cy="240" rx="15" ry="20" fill="#a67c52" opacity="0.6" />
          <ellipse cx={125 + bodyWidth * 0.3} cy="240" rx="15" ry="20" fill="#a67c52" opacity="0.6" />

          {/* Body/Torso under dress */}
          <ellipse
            cx="125"
            cy="180"
            rx={bodyWidth * 0.4}
            ry={bodyHeight * 0.35}
            fill="url(#dressGradient)"
            className="transition-all duration-1000"
          >
            <animate attributeName="cy" values="180;178;180" dur="2s" repeatCount="indefinite" />
          </ellipse>

          {/* Arms */}
          <ellipse
            cx={125 - bodyWidth * 0.5}
            cy="200"
            rx="18"
            ry="60"
            fill="url(#dressGradient)"
            transform={`rotate(-20 ${125 - bodyWidth * 0.5} 200)`}
            className="transition-all duration-1000"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`-20 ${125 - bodyWidth * 0.5} 200;-25 ${125 - bodyWidth * 0.5} 200;-20 ${125 - bodyWidth * 0.5} 200`}
              dur="2s"
              repeatCount="indefinite"
            />
          </ellipse>
          <ellipse
            cx={125 + bodyWidth * 0.5}
            cy="200"
            rx="18"
            ry="60"
            fill="url(#dressGradient)"
            transform={`rotate(20 ${125 + bodyWidth * 0.5} 200)`}
            className="transition-all duration-1000"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`20 ${125 + bodyWidth * 0.5} 200;25 ${125 + bodyWidth * 0.5} 200;20 ${125 + bodyWidth * 0.5} 200`}
              dur="2s"
              repeatCount="indefinite"
            />
          </ellipse>

          {/* Hands */}
          <circle cx={125 - bodyWidth * 0.5 - 5} cy="255" r="12" fill="url(#skinGradient)">
            <animate attributeName="cy" values="255;250;255" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={125 + bodyWidth * 0.5 + 5} cy="255" r="12" fill="url(#skinGradient)">
            <animate attributeName="cy" values="255;250;255" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Neck */}
          <rect
            x="110"
            y="130"
            width="30"
            height="25"
            fill="url(#skinGradient)"
            rx="5"
          >
            <animate attributeName="y" values="130;128;130" dur="2s" repeatCount="indefinite" />
          </rect>

          {/* Hijab Back */}
          <ellipse
            cx="125"
            cy="100"
            rx="45"
            ry="55"
            fill="url(#hijabGradient)"
          >
            <animate attributeName="cy" values="100;98;100" dur="2s" repeatCount="indefinite" />
          </ellipse>

          {/* Face */}
          <ellipse
            cx="125"
            cy="100"
            rx="32"
            ry="38"
            fill="url(#skinGradient)"
          >
            <animate attributeName="cy" values="100;98;100" dur="2s" repeatCount="indefinite" />
          </ellipse>

          {/* Hijab Front */}
          <path
            d="M 93 70 Q 93 60 100 55 Q 125 50 150 55 Q 157 60 157 70 L 157 120 Q 140 130 125 130 Q 110 130 93 120 Z"
            fill="url(#hijabGradient)"
          >
            <animate attributeName="d" 
              values="M 93 70 Q 93 60 100 55 Q 125 50 150 55 Q 157 60 157 70 L 157 120 Q 140 130 125 130 Q 110 130 93 120 Z;
                      M 93 68 Q 93 58 100 53 Q 125 48 150 53 Q 157 58 157 68 L 157 118 Q 140 128 125 128 Q 110 128 93 118 Z;
                      M 93 70 Q 93 60 100 55 Q 125 50 150 55 Q 157 60 157 70 L 157 120 Q 140 130 125 130 Q 110 130 93 120 Z"
              dur="2s" repeatCount="indefinite" />
          </path>

          {/* Eyes - Cute anime style */}
          <g>
            {/* Left Eye */}
            <ellipse cx="112" cy="95" rx="8" ry="10" fill="#2d1810" />
            <ellipse cx="114" cy="93" rx="3" ry="4" fill="#ffffff" />
            <circle cx="115" cy="96" r="1.5" fill="#ffffff" />
            
            {/* Right Eye */}
            <ellipse cx="138" cy="95" rx="8" ry="10" fill="#2d1810" />
            <ellipse cx="140" cy="93" rx="3" ry="4" fill="#ffffff" />
            <circle cx="141" cy="96" r="1.5" fill="#ffffff" />
            
            {/* Blush */}
            <ellipse cx="105" cy="105" rx="6" ry="4" fill="#ffb6c1" opacity="0.5" />
            <ellipse cx="145" cy="105" rx="6" ry="4" fill="#ffb6c1" opacity="0.5" />
          </g>

          {/* Mouth - Cute smile */}
          <path
            d="M 115 110 Q 125 115 135 110"
            stroke="#d4756f"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="125" cy="113" r="1.5" fill="#d4756f" />
        </g>
      </svg>
    )
  } else {
    // Karakter Cowok dengan Kacamata (seperti foto)
    return (
      <svg
        key={animationKey}
        width="250"
        height="450"
        viewBox="0 0 250 450"
        className="transition-all duration-1000 ease-in-out"
      >
        <defs>
          <linearGradient id="skinGradientMale" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fcd5b5" />
            <stop offset="100%" stopColor="#f4c4a0" />
          </linearGradient>
          <linearGradient id="hairGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2d2d2d" />
            <stop offset="100%" stopColor="#1a1a1a" />
          </linearGradient>
          <linearGradient id="jacketGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3a3a3a" />
            <stop offset="100%" stopColor="#2a2a2a" />
          </linearGradient>
          <linearGradient id="shirtGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
        </defs>

        <g className="animate-float">
          {/* Shadow */}
          <ellipse cx="125" cy="420" rx="60" ry="15" fill="#93c5fd" opacity="0.3">
            <animate attributeName="rx" values="60;65;60" dur="2s" repeatCount="indefinite" />
          </ellipse>

          {/* Legs/Pants */}
          <rect
            x={125 - bodyWidth * 0.18}
            y={280 + bodyHeight * 0.5}
            width={bodyWidth * 0.35}
            height="130"
            fill="#4a3f35"
            rx="8"
            className="transition-all duration-1000"
          >
            <animate attributeName="y" values={`${280 + bodyHeight * 0.5};${278 + bodyHeight * 0.5};${280 + bodyHeight * 0.5}`} dur="2s" repeatCount="indefinite" />
          </rect>
          <rect
            x={125 + bodyWidth * 0.18 - bodyWidth * 0.35}
            y={280 + bodyHeight * 0.5}
            width={bodyWidth * 0.35}
            height="130"
            fill="#4a3f35"
            rx="8"
            className="transition-all duration-1000"
          >
            <animate attributeName="y" values={`${280 + bodyHeight * 0.5};${278 + bodyHeight * 0.5};${280 + bodyHeight * 0.5}`} dur="2s" repeatCount="indefinite" />
          </rect>

          {/* Shoes */}
          <ellipse cx={125 - bodyWidth * 0.15} cy="415" rx="18" ry="8" fill="#1a1a1a" />
          <ellipse cx={125 + bodyWidth * 0.15} cy="415" rx="18" ry="8" fill="#1a1a1a" />

          {/* Jacket */}
          <ellipse
            cx="125"
            cy={200 + bodyHeight * 0.3}
            rx={bodyWidth * 0.5}
            ry={bodyHeight * 0.4}
            fill="url(#jacketGradient)"
            className="transition-all duration-1000"
          >
            <animate attributeName="cy" values={`${200 + bodyHeight * 0.3};${198 + bodyHeight * 0.3};${200 + bodyHeight * 0.3}`} dur="2s" repeatCount="indefinite" />
          </ellipse>

          {/* Shirt/Inner */}
          <path
            d={`M ${125 - bodyWidth * 0.25} 170 
                L ${125 - bodyWidth * 0.25} ${220 + bodyHeight * 0.2}
                L ${125 + bodyWidth * 0.25} ${220 + bodyHeight * 0.2}
                L ${125 + bodyWidth * 0.25} 170 Z`}
            fill="url(#shirtGradient)"
            className="transition-all duration-1000"
          />

          {/* Jacket Details */}
          <line x1="125" y1="170" x2="125" y2={`${250 + bodyHeight * 0.4}`} stroke="#1a1a1a" strokeWidth="3" />
          <circle cx="125" cy="190" r="3" fill="#ffffff" opacity="0.8" />
          <circle cx="125" cy="210" r="3" fill="#ffffff" opacity="0.8" />

          {/* Arms */}
          <ellipse
            cx={125 - bodyWidth * 0.55}
            cy="200"
            rx="20"
            ry="65"
            fill="url(#jacketGradient)"
            transform={`rotate(-15 ${125 - bodyWidth * 0.55} 200)`}
            className="transition-all duration-1000"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`-15 ${125 - bodyWidth * 0.55} 200;-20 ${125 - bodyWidth * 0.55} 200;-15 ${125 - bodyWidth * 0.55} 200`}
              dur="2s"
              repeatCount="indefinite"
            />
          </ellipse>
          <ellipse
            cx={125 + bodyWidth * 0.55}
            cy="200"
            rx="20"
            ry="65"
            fill="url(#jacketGradient)"
            transform={`rotate(15 ${125 + bodyWidth * 0.55} 200)`}
            className="transition-all duration-1000"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`15 ${125 + bodyWidth * 0.55} 200;20 ${125 + bodyWidth * 0.55} 200;15 ${125 + bodyWidth * 0.55} 200`}
              dur="2s"
              repeatCount="indefinite"
            />
          </ellipse>

          {/* Hands */}
          <circle cx={125 - bodyWidth * 0.55 - 8} cy="260" r="13" fill="url(#skinGradientMale)">
            <animate attributeName="cy" values="260;255;260" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={125 + bodyWidth * 0.55 + 8} cy="260" r="13" fill="url(#skinGradientMale)">
            <animate attributeName="cy" values="260;255;260" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Neck */}
          <rect
            x="110"
            y="135"
            width="30"
            height="30"
            fill="url(#skinGradientMale)"
            rx="5"
          >
            <animate attributeName="y" values="135;133;135" dur="2s" repeatCount="indefinite" />
          </rect>

          {/* Head/Face */}
          <ellipse
            cx="125"
            cy="100"
            rx="35"
            ry="40"
            fill="url(#skinGradientMale)"
          >
            <animate attributeName="cy" values="100;98;100" dur="2s" repeatCount="indefinite" />
          </ellipse>

          {/* Hair */}
          <ellipse
            cx="125"
            cy="75"
            rx="38"
            ry="30"
            fill="url(#hairGradient)"
          >
            <animate attributeName="cy" values="75;73;75" dur="2s" repeatCount="indefinite" />
          </ellipse>
          
          {/* Hair detail - bangs */}
          <path
            d="M 95 85 Q 100 75 110 80 Q 115 75 125 78 Q 135 75 140 80 Q 150 75 155 85"
            fill="url(#hairGradient)"
            stroke="url(#hairGradient)"
            strokeWidth="2"
          />

          {/* Cap/Peci */}
          <ellipse
            cx="125"
            cy="68"
            rx="40"
            ry="15"
            fill="#2d2d2d"
          >
            <animate attributeName="cy" values="68;66;68" dur="2s" repeatCount="indefinite" />
          </ellipse>

          {/* Glasses Frame */}
          <g stroke="#1a1a1a" strokeWidth="2.5" fill="none">
            {/* Left lens */}
            <circle cx="110" cy="95" r="12" fill="#ffffff" opacity="0.2" />
            <circle cx="110" cy="95" r="12" />
            
            {/* Right lens */}
            <circle cx="140" cy="95" r="12" fill="#ffffff" opacity="0.2" />
            <circle cx="140" cy="95" r="12" />
            
            {/* Bridge */}
            <line x1="122" y1="95" x2="128" y2="95" />
            
            {/* Temples */}
            <path d="M 98 95 L 90 93" />
            <path d="M 152 95 L 160 93" />
            
            {/* Glasses shine */}
            <circle cx="106" cy="91" r="3" fill="#ffffff" opacity="0.8" />
            <circle cx="136" cy="91" r="3" fill="#ffffff" opacity="0.8" />
          </g>

          {/* Eyes behind glasses */}
          <g>
            <ellipse cx="110" cy="95" rx="5" ry="6" fill="#2d1810" />
            <circle cx="111" cy="94" r="2" fill="#ffffff" />
            
            <ellipse cx="140" cy="95" rx="5" ry="6" fill="#2d1810" />
            <circle cx="141" cy="94" r="2" fill="#ffffff" />
          </g>

          {/* Nose */}
          <path
            d="M 125 100 L 127 108"
            stroke="#d4a890"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Mouth - Slight smile */}
          <path
            d="M 115 115 Q 125 118 135 115"
            stroke="#d4756f"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </svg>
    )
  }
}
