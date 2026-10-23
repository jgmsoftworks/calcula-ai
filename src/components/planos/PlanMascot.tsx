import mascot from '@/assets/plan-mascot.webp';
import './plan-mascot.css';

export type MascotMood = 'neutral' | 'sad' | 'happy';

export function PlanMascot({ mood }: { mood: MascotMood }) {
  return <div className="plan-mascot relative mx-auto h-44 w-44 sm:h-48 sm:w-48" data-mood={mood} aria-hidden="true">
    <img src={mascot} alt="" width="512" height="512" className="h-full w-full object-contain" draggable={false} />
    <svg viewBox="0 0 1280 1280" className="pointer-events-none absolute inset-0 h-full w-full">
      <defs><radialGradient id="plan-eye"><stop stopColor="#34416b" /><stop offset="0.65" stopColor="#131829" /><stop offset="1" stopColor="#080a12" /></radialGradient></defs>
      <g className="mascot-face">
        <ellipse className="mascot-cheek" cx="380" cy="965" rx="50" ry="25" fill="#ff92b1" opacity="0.55" />
        <ellipse className="mascot-cheek" cx="870" cy="965" rx="50" ry="25" fill="#ff92b1" opacity="0.55" />
        <g className="mascot-open-eyes">
          {[470, 780].map(x => <g key={x}><ellipse cx={x} cy="855" rx="67" ry="86" fill="url(#plan-eye)" /><ellipse cx={x - 18} cy="823" rx="23" ry="28" fill="white" /><circle cx={x + 22} cy="890" r="10" fill="#bdc7ef" opacity="0.8" /></g>)}
        </g>
        <g className="mascot-happy-eyes" fill="none" stroke="#182038" strokeWidth="25" strokeLinecap="round"><path d="M407 872 Q470 774 533 872" /><path d="M717 872 Q780 774 843 872" /></g>
        <g className="mascot-sad-brows" fill="none" stroke="#33364d" strokeWidth="16" strokeLinecap="round"><path d="M420 750 Q468 758 505 722" /><path d="M745 722 Q785 758 830 750" /></g>
        <path className="mascot-mouth-neutral" d="M572 990 Q625 1040 678 990" fill="none" stroke="#182038" strokeWidth="19" strokeLinecap="round" />
        <g className="mascot-mouth-happy"><path d="M550 980 Q625 1000 700 980 Q688 1085 625 1082 Q562 1080 550 980" fill="#321b40" /><path d="M584 1064 Q625 1018 668 1064 Q625 1094 584 1064" fill="#ff659c" /></g>
        <path className="mascot-mouth-sad" d="M577 1040 Q625 1002 673 1040" fill="none" stroke="#182038" strokeWidth="17" strokeLinecap="round" />
      </g>
    </svg>
  </div>;
}
