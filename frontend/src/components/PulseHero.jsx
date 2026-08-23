import "./PulseHero.css";

// Ilustrasi hero yang di-inline langsung (bukan <img src>) supaya path SVG-nya
// bisa dianimasikan lewat CSS (draw-in stroke-dashoffset + node yang berdenyut) --
// gambar eksternal tidak bisa ditembus CSS sampai ke elemen di dalamnya.
// Palet & komposisi sengaja dipertahankan sama seperti assets/hero-illustration.svg
// (logo Activity/EKG ChurnGuard), cuma sekarang hidup.
export default function PulseHero() {
  return (
    <svg
      className="pulse-hero"
      viewBox="0 0 680 340"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ilustrasi denyut risiko churn pelanggan ChurnGuard"
    >
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1739" />
          <stop offset="100%" stopColor="#17244b" />
        </linearGradient>
        <linearGradient id="pulseGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4f6ef7" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#8fa4ff" stopOpacity="1" />
          <stop offset="100%" stopColor="#4f6ef7" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="680" height="340" fill="url(#bgGrad)" />
      <circle cx="90" cy="70" r="120" fill="#16234a" opacity="0.55" />
      <circle cx="600" cy="290" r="150" fill="#121e42" opacity="0.5" />
      <circle cx="560" cy="60" r="60" fill="#1b2c57" opacity="0.4" />

      <g className="pulse-hero-stars" opacity="0.35">
        <circle cx="130" cy="60" r="2" fill="#8fa4ff" />
        <circle cx="230" cy="300" r="2" fill="#8fa4ff" />
        <circle cx="480" cy="50" r="2" fill="#8fa4ff" />
        <circle cx="610" cy="180" r="2" fill="#8fa4ff" />
        <circle cx="340" cy="40" r="2" fill="#8fa4ff" />
        <circle cx="60" cy="260" r="2" fill="#8fa4ff" />
      </g>

      <path
        d="M40,200 L140,200 L160,140 L180,260 L200,200 L320,200 L340,150 L360,250 L380,200 L500,200 L520,130 L540,270 L560,200 L640,200"
        fill="none"
        stroke="#4f6ef7"
        strokeWidth="14"
        opacity="0.1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M40,200 L140,200 L160,140 L180,260 L200,200 L320,200 L340,150 L360,250 L380,200 L500,200 L520,130 L540,270 L560,200 L640,200"
        fill="none"
        stroke="#4f6ef7"
        strokeWidth="7"
        opacity="0.22"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        className="pulse-hero-line"
        d="M40,200 L140,200 L160,140 L180,260 L200,200 L320,200 L340,150 L360,250 L380,200 L500,200 L520,130 L540,270 L560,200 L640,200"
        fill="none"
        stroke="url(#pulseGrad)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      <g className="pulse-hero-node pulse-hero-node-safe" style={{ "--delay": "0s" }}>
        <circle cx="100" cy="200" r="16" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.35" />
        <circle cx="100" cy="200" r="9" fill="#16234a" stroke="#22c55e" strokeWidth="2" />
      </g>
      <g className="pulse-hero-node pulse-hero-node-safe" style={{ "--delay": "0.4s" }}>
        <circle cx="220" cy="200" r="16" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.35" />
        <circle cx="220" cy="200" r="9" fill="#16234a" stroke="#22c55e" strokeWidth="2" />
      </g>
      <g className="pulse-hero-node pulse-hero-node-risk" style={{ "--delay": "0.15s" }}>
        <circle cx="170" cy="140" r="22" fill="none" stroke="#f5a623" strokeWidth="1" opacity="0.3" />
        <circle cx="170" cy="140" r="14" fill="none" stroke="#f5a623" strokeWidth="1" opacity="0.5" />
        <circle cx="170" cy="140" r="9" fill="#16234a" stroke="#f5a623" strokeWidth="2.5" />
      </g>
      <g className="pulse-hero-node pulse-hero-node-danger" style={{ "--delay": "0.55s" }}>
        <circle cx="350" cy="150" r="22" fill="none" stroke="#f04438" strokeWidth="1" opacity="0.3" />
        <circle cx="350" cy="150" r="14" fill="none" stroke="#f04438" strokeWidth="1" opacity="0.5" />
        <circle cx="350" cy="150" r="9" fill="#16234a" stroke="#f04438" strokeWidth="2.5" />
      </g>
      <g className="pulse-hero-node pulse-hero-node-safe" style={{ "--delay": "0.7s" }}>
        <circle cx="440" cy="200" r="16" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.35" />
        <circle cx="440" cy="200" r="9" fill="#16234a" stroke="#22c55e" strokeWidth="2" />
      </g>
      <g className="pulse-hero-node pulse-hero-node-danger" style={{ "--delay": "0.3s" }}>
        <circle cx="530" cy="130" r="22" fill="none" stroke="#f04438" strokeWidth="1" opacity="0.3" />
        <circle cx="530" cy="130" r="14" fill="none" stroke="#f04438" strokeWidth="1" opacity="0.5" />
        <circle cx="530" cy="130" r="9" fill="#16234a" stroke="#f04438" strokeWidth="2.5" />
      </g>
      <g className="pulse-hero-node pulse-hero-node-safe" style={{ "--delay": "0.85s" }}>
        <circle cx="600" cy="200" r="16" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.35" />
        <circle cx="600" cy="200" r="9" fill="#16234a" stroke="#22c55e" strokeWidth="2" />
      </g>
    </svg>
  );
}
