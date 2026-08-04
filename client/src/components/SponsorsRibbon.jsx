import { useSettings } from '../hooks/useFixtures.js';
import { Star } from 'lucide-react';

// Default sponsors shown when no custom ones are configured
const DEFAULT_SPONSORS = [
  { name: 'Official Sponsor', tag: 'Platinum Partner' },
  { name: 'Gold Partner', tag: 'Gold Partner' },
  { name: 'Media Partner', tag: 'Media Partner' },
  { name: 'Technical Partner', tag: 'Technical Partner' },
  { name: 'Community Sponsor', tag: 'Community Partner' },
];

/** Inline SVG recreation of the eTechZim brand logo */
function EtechZimLogo({ height = 18 }) {
  return (
    <svg viewBox="0 0 260 50" height={height} xmlns="http://www.w3.org/2000/svg" aria-label="eTechZim">
      {/* e - olive green */}
      <text x="0" y="40" fontFamily="'Segoe UI', Arial, sans-serif" fontSize="42" fontWeight="400" fill="#8DB629">e</text>
      {/* tech - dark navy */}
      <text x="22" y="40" fontFamily="'Segoe UI', Arial, sans-serif" fontSize="42" fontWeight="600" fill="#0D4F7A">tech</text>
      {/* z - teal */}
      <text x="120" y="40" fontFamily="'Segoe UI', Arial, sans-serif" fontSize="42" fontWeight="600" fill="#0097A7">z</text>
      {/* location pin for 'i' */}
      <g transform="translate(147, 6)">
        {/* wifi waves */}
        <path d="M12 0 C8 2, 6 5, 6 5" stroke="#4CAF50" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M15 0 C10 3, 7 7, 7 7" stroke="#4CAF50" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M18 0 C12 4, 8 9, 8 9" stroke="#4CAF50" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* pin shape */}
        <path d="M5 14 C5 8, 10 5, 15 5 C20 5, 25 8, 25 14 C25 22, 15 36, 15 36 C15 36, 5 22, 5 14Z" fill="#0097A7" />
        {/* small car icon inside pin */}
        <rect x="10" y="12" width="10" height="6" rx="2" fill="white" opacity="0.9" />
        <circle cx="12" cy="19" r="1.5" fill="white" opacity="0.9" />
        <circle cx="18" cy="19" r="1.5" fill="white" opacity="0.9" />
      </g>
      {/* m - dark navy */}
      <text x="178" y="40" fontFamily="'Segoe UI', Arial, sans-serif" fontSize="42" fontWeight="600" fill="#0D4F7A">m</text>
    </svg>
  );
}

function SponsorBadge({ name, logoUrl, tag }) {
  return (
    <div className="sponsor-badge">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className="h-7 w-auto object-contain"
          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
      ) : null}
      <div
        className="sponsor-text-badge"
        style={{ display: logoUrl ? 'none' : 'flex' }}
      >
        <Star className="w-3 h-3 text-yellow-400 shrink-0" />
        <div className="flex flex-col leading-none">
          <span className="font-bold text-[11px] text-white tracking-wide">{name}</span>
          {tag && <span className="text-[9px] text-white/50 uppercase tracking-widest mt-0.5">{tag}</span>}
        </div>
      </div>
    </div>
  );
}

export default function SponsorsRibbon() {
  const { data: settings } = useSettings();

  const sponsors = settings?.sponsors?.length > 0
    ? settings.sponsors
    : DEFAULT_SPONSORS;

  // Duplicate list so the marquee loops seamlessly
  const items = [...sponsors, ...sponsors, ...sponsors];

  if (sponsors.length === 0) return null;

  return (
    <div className="sponsors-ribbon">
      <div className="sponsors-ribbon-inner">
        {/* Left fade label */}
        <div className="sponsors-ribbon-label">
          <span>SPONSORS &amp; PARTNERS</span>
          <div className="sponsors-ribbon-divider" />
        </div>

        {/* Scrolling track */}
        <div className="sponsors-track-wrapper">
          <div
            className="sponsors-track"
            style={{ '--item-count': sponsors.length }}
          >
            {items.map((s, i) => (
              <a
                key={i}
                href={s.website || '#'}
                target={s.website ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="sponsor-link"
                onClick={!s.website ? (e) => e.preventDefault() : undefined}
              >
                <SponsorBadge name={s.name} logoUrl={s.logoUrl} tag={s.tag} />
              </a>
            ))}
          </div>
        </div>

        {/* Powered By badge - right side */}
        <a
          href="https://etechzim.co.zw"
          target="_blank"
          rel="noopener noreferrer"
          className="powered-by-badge"
          title="Powered by eTechZim"
        >
          <div className="powered-by-divider" />
          <div className="powered-by-content">
            <span className="powered-by-label">POWERED BY</span>
            <div className="powered-by-logo">
              <EtechZimLogo height={16} />
            </div>
          </div>
        </a>
      </div>

      <style>{`
        .sponsors-ribbon {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 50;
          height: 40px;
          background: linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,27,75,0.97) 50%, rgba(15,23,42,0.97) 100%);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255,255,255,0.07);
          overflow: hidden;
          box-shadow: 0 -4px 24px rgba(0,0,0,0.4);
        }

        .sponsors-ribbon-inner {
          display: flex;
          align-items: center;
          height: 100%;
        }

        .sponsors-ribbon-label {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          white-space: nowrap;
          flex-shrink: 0;
          z-index: 2;
          background: inherit;
        }

        .sponsors-ribbon-label span {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
        }

        .sponsors-ribbon-divider {
          width: 1px;
          height: 20px;
          background: rgba(255,255,255,0.1);
        }

        .sponsors-track-wrapper {
          flex: 1;
          overflow: hidden;
          height: 100%;
          display: flex;
          align-items: center;
          mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
        }

        .sponsors-track {
          display: flex;
          align-items: center;
          gap: 0;
          animation: sponsors-scroll 30s linear infinite;
          width: max-content;
        }

        .sponsors-track:hover {
          animation-play-state: paused;
        }

        @keyframes sponsors-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 3)); }
        }

        .sponsor-link {
          display: flex;
          align-items: center;
          text-decoration: none;
          flex-shrink: 0;
        }

        .sponsor-badge {
          display: flex;
          align-items: center;
          padding: 0 20px;
          height: 44px;
          border-right: 1px solid rgba(255,255,255,0.05);
          transition: background 0.2s;
          cursor: pointer;
        }

        .sponsor-link:hover .sponsor-badge {
          background: rgba(255,255,255,0.04);
        }

        .sponsor-text-badge {
          display: flex;
          align-items: center;
          gap: 7px;
          white-space: nowrap;
        }

        /* Powered By badge */
        .powered-by-badge {
          display: flex;
          align-items: center;
          gap: 0;
          flex-shrink: 0;
          height: 100%;
          text-decoration: none;
          padding-right: 16px;
          z-index: 2;
          background: linear-gradient(to right, transparent, rgba(15,23,42,0.98) 20%);
          padding-left: 24px;
          transition: opacity 0.2s;
        }

        .powered-by-badge:hover {
          opacity: 0.85;
        }

        .powered-by-divider {
          width: 1px;
          height: 20px;
          background: rgba(255,255,255,0.1);
          margin-right: 12px;
          flex-shrink: 0;
        }

        .powered-by-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          white-space: nowrap;
        }

        .powered-by-label {
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          line-height: 1;
        }

        .powered-by-logo {
          display: flex;
          align-items: center;
          filter: brightness(1.3) saturate(1.1);
          line-height: 1;
        }

        /* Mobile responsive adjustments */
        @media (max-width: 639px) {
          .sponsors-ribbon {
            height: 36px;
          }

          .sponsors-ribbon-label {
            display: none;
          }

          .sponsors-track-wrapper {
            mask-image: linear-gradient(to right, transparent 0%, black 3%, black 90%, transparent 100%);
            -webkit-mask-image: linear-gradient(to right, transparent 0%, black 3%, black 90%, transparent 100%);
          }

          .sponsor-badge {
            padding: 0 12px;
            height: 36px;
          }

          .sponsor-text-badge {
            gap: 5px;
          }

          .sponsor-text-badge .font-bold {
            font-size: 10px;
          }

          .powered-by-badge {
            padding-left: 12px;
            padding-right: 10px;
          }

          .powered-by-divider {
            margin-right: 8px;
            height: 16px;
          }

          .powered-by-label {
            font-size: 6px;
          }
        }
      `}</style>
    </div>
  );
}

