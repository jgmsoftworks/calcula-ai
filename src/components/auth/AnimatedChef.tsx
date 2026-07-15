/**
 * AnimatedChef — personagens chefs em SVG articulado.
 * Cada parte do corpo (cabeça, tronco, braços, antebraços, coxas, canelas) é um <g>
 * separado com transform-origin nas articulações, animado por CSS keyframes.
 * Isso produz movimento humano real: passada alternada, braços em contra-tempo, etc.
 */

type Variant = 'walking' | 'talking' | 'running';

interface AnimatedChefProps {
  variant: Variant;
  /** Cor do uniforme (jaqueta) */
  jacket: string;
  /** Cor da pele */
  skin: string;
  /** Cor do cabelo (visível abaixo do gorro) */
  hair: string;
  /** Cor das calças */
  pants: string;
  /** Cor do avental / detalhe */
  accent?: string;
  className?: string;
}

export function AnimatedChef({
  variant,
  jacket,
  skin,
  hair,
  pants,
  accent = '#f96e0c',
  className = '',
}: AnimatedChefProps) {
  const speedClass =
    variant === 'running' ? 'chef--running' :
    variant === 'talking' ? 'chef--talking' :
    'chef--walking';

  return (
    <svg
      viewBox="0 0 200 400"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${speedClass}`}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {/* Sombra no chão */}
      <ellipse cx="100" cy="392" rx="45" ry="6" fill="rgba(0,0,0,0.18)" className="chef-shadow" />

      {/* CORPO — tronco balança levemente */}
      <g className="chef-body">
        {/* PERNA TRASEIRA (esquerda no viewBox) */}
        <g className="chef-leg chef-leg--back" style={{ transformOrigin: '90px 250px' }}>
          {/* Coxa */}
          <rect x="82" y="250" width="18" height="70" rx="8" fill={pants} />
          {/* Canela — dobra no joelho */}
          <g className="chef-shin" style={{ transformOrigin: '91px 318px' }}>
            <rect x="82" y="318" width="18" height="60" rx="8" fill={pants} />
            {/* Sapato */}
            <ellipse cx="91" cy="382" rx="16" ry="7" fill="#1a1a1a" />
          </g>
        </g>

        {/* PERNA DA FRENTE (direita no viewBox) */}
        <g className="chef-leg chef-leg--front" style={{ transformOrigin: '110px 250px' }}>
          <rect x="100" y="250" width="18" height="70" rx="8" fill={pants} />
          <g className="chef-shin" style={{ transformOrigin: '109px 318px' }}>
            <rect x="100" y="318" width="18" height="60" rx="8" fill={pants} />
            <ellipse cx="109" cy="382" rx="16" ry="7" fill="#1a1a1a" />
          </g>
        </g>

        {/* TRONCO — jaqueta chef */}
        <g className="chef-torso">
          {/* Corpo jaqueta */}
          <path
            d="M 62 160 Q 60 155 65 152 L 135 152 Q 140 155 138 160 L 142 258 Q 100 268 58 258 Z"
            fill={jacket}
          />
          {/* Botões duplos da jaqueta */}
          <circle cx="88" cy="180" r="3" fill={accent} />
          <circle cx="88" cy="200" r="3" fill={accent} />
          <circle cx="88" cy="220" r="3" fill={accent} />
          <circle cx="112" cy="180" r="3" fill={accent} />
          <circle cx="112" cy="200" r="3" fill={accent} />
          <circle cx="112" cy="220" r="3" fill={accent} />
          {/* Lenço no pescoço */}
          <path d="M 78 150 L 122 150 L 118 165 L 82 165 Z" fill={accent} opacity="0.9" />
        </g>

        {/* BRAÇO TRASEIRO */}
        <g className="chef-arm chef-arm--back" style={{ transformOrigin: '70px 165px' }}>
          {/* Ombro/braço superior */}
          <rect x="60" y="160" width="18" height="55" rx="8" fill={jacket} />
          {/* Antebraço — dobra no cotovelo */}
          <g className="chef-forearm" style={{ transformOrigin: '69px 213px' }}>
            <rect x="60" y="213" width="18" height="55" rx="8" fill={jacket} />
            {/* Mão */}
            <circle cx="69" cy="272" r="9" fill={skin} />
          </g>
        </g>

        {/* BRAÇO FRENTE */}
        <g className="chef-arm chef-arm--front" style={{ transformOrigin: '130px 165px' }}>
          <rect x="122" y="160" width="18" height="55" rx="8" fill={jacket} />
          <g className="chef-forearm" style={{ transformOrigin: '131px 213px' }}>
            <rect x="122" y="213" width="18" height="55" rx="8" fill={jacket} />
            <circle cx="131" cy="272" r="9" fill={skin} />
          </g>
        </g>

        {/* CABEÇA — leve movimento de fala/olhar */}
        <g className="chef-head" style={{ transformOrigin: '100px 130px' }}>
          {/* Pescoço */}
          <rect x="92" y="140" width="16" height="14" fill={skin} />
          {/* Cabelo (aparece na base) */}
          <path d="M 74 128 Q 74 145 82 148 L 118 148 Q 126 145 126 128 Z" fill={hair} />
          {/* Rosto */}
          <ellipse cx="100" cy="120" rx="24" ry="27" fill={skin} />
          {/* Orelhas */}
          <ellipse cx="76" cy="122" rx="4" ry="6" fill={skin} />
          <ellipse cx="124" cy="122" rx="4" ry="6" fill={skin} />
          {/* Olhos */}
          <circle cx="91" cy="118" r="2.2" fill="#1a1a1a" />
          <circle cx="109" cy="118" r="2.2" fill="#1a1a1a" />
          {/* Sobrancelhas */}
          <path d="M 87 111 L 95 110" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 105 110 L 113 111" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
          {/* Bochecha — rosinha */}
          <circle cx="86" cy="128" r="3" fill="#ff9aa2" opacity="0.5" />
          <circle cx="114" cy="128" r="3" fill="#ff9aa2" opacity="0.5" />
          {/* Sorriso — abre e fecha (fala) */}
          <path
            className="chef-mouth"
            d="M 92 132 Q 100 138 108 132"
            stroke="#1a1a1a"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
          {/* GORRO DE CHEF */}
          <g>
            <rect x="76" y="88" width="48" height="14" rx="2" fill="#ffffff" />
            <ellipse cx="88" cy="78" rx="14" ry="16" fill="#ffffff" />
            <ellipse cx="100" cy="72" rx="16" ry="18" fill="#ffffff" />
            <ellipse cx="112" cy="78" rx="14" ry="16" fill="#ffffff" />
          </g>
        </g>
      </g>
    </svg>
  );
}
