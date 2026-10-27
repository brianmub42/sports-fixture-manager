import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  X, Download, Share2, Copy, Check, Printer, 
  ExternalLink, Smartphone, Zap, Trophy, Globe, Shield 
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext.jsx';
import { useSettings } from '../hooks/useFixtures.js';

export default function SpectatorQrModal({ isOpen, onClose }) {
  const { activeOrg } = useOrganization();
  const { data: settings } = useSettings();
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [signageMode, setSignageMode] = useState('permanent'); // 'permanent' | 'event'
  const qrRef = useRef(null);

  if (!isOpen) return null;

  const orgSlug = activeOrg?.slug || settings?.slug || settings?.org_slug || 'demo-tournament';
  const orgName = settings?.org_name || activeOrg?.name || 'Tournament';
  const eventTitle = settings?.event_title || activeOrg?.event_title || 'Live Sports Championship';
  
  const isPermanent = signageMode === 'permanent';
  const displaySubtitle = isPermanent ? 'OFFICIAL LIVE SPORTS & SCORES PORTAL' : eventTitle;
  const displayBadge = isPermanent ? 'ALL-SEASON GROUND SIGNAGE' : 'LIVE SPECTATOR FLYER';
  const displayCta = isPermanent ? "SCAN WITH YOUR PHONE TO WATCH TODAY'S LIVE MATCHES" : 'SCAN WITH YOUR PHONE CAMERA TO WATCH LIVE';

  // Public Spectator Watch URL
  const spectatorUrl = `${window.location.origin}/watch/${orgSlug}`;

  // Copy link handler
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(spectatorUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Download high-res PNG image
  const handleDownloadPng = () => {
    const canvas = document.getElementById('spectator-qr-canvas');
    if (!canvas) return;

    // Create a composite canvas with event title and branding for sharing
    const printCanvas = document.createElement('canvas');
    const width = 600;
    const height = 750;
    printCanvas.width = width;
    printCanvas.height = height;
    const ctx = printCanvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Header gradient banner
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#2563eb');
    grad.addColorStop(1, '#4f46e5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, 140);

    // Header text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(orgName.toUpperCase(), width / 2, 55);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#e0e7ff';
    ctx.fillText(displaySubtitle, width / 2, 90);

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText(displayBadge, width / 2, 118);

    // Callout badge
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(30, 165, width - 60, 50);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 165, width - 60, 50);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(displayCta, width / 2, 196);

    // Draw the QR Code centered
    const qrSize = 340;
    const qrX = (width - qrSize) / 2;
    const qrY = 235;
    ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize);

    // Instructions
    ctx.fillStyle = '#475569';
    ctx.font = '14px sans-serif';
    ctx.fillText('1. Open Camera  •  2. Scan QR  •  3. Follow Real-Time Scores', width / 2, 605);

    // Direct URL
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(spectatorUrl, width / 2, 640);

    // Footer branding
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('Powered by FixtureGrid Multi-Sport Platform · fixturegrid.co.zw', width / 2, 695);

    // Download image
    const link = document.createElement('a');
    link.download = `spectator-qr-${orgSlug}-${signageMode}.png`;
    link.href = printCanvas.toDataURL('image/png');
    link.click();
  };

  // Native mobile share sheet or fallback
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${orgName} - Live Spectator Watch`,
          text: `Scan or visit the link to follow live matches, results, and standings for ${orgName}!`,
          url: spectatorUrl,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  // Print Signage / Poster in new tab
  const handlePrintSignage = () => {
    const canvas = document.getElementById('spectator-qr-canvas');
    if (!canvas) return;
    const qrDataUrl = canvas.toDataURL('image/png');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to open the printable poster.');
      return;
    }

    const subTitleHtml = isPermanent
      ? `<h2 style="color: #2563eb; font-weight: 800; font-size: 20px; letter-spacing: 1px; margin: 0 0 10px 0;">OFFICIAL LIVE SPORTS &amp; SCORES PORTAL</h2>
         <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0;">Scan to view today's live matches, athletic heats &amp; championship standings</p>`
      : `<h2 style="color: #0f172a; font-weight: 700; font-size: 22px; margin: 0 0 24px 0;">${eventTitle}</h2>`;

    const badgeHtml = isPermanent
      ? 'All-Season Ground Signage'
      : 'Live Spectator Portal';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${orgName} - Spectator QR Signage</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 1.5cm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              text-align: center;
              margin: 0;
              padding: 20px;
            }
            .poster-box {
              border: 3px solid #1e293b;
              border-radius: 24px;
              padding: 40px 30px;
              max-width: 650px;
              margin: 0 auto;
              box-shadow: 0 10px 25px rgba(0,0,0,0.08);
            }
            .header-badge {
              display: inline-block;
              background: #2563eb;
              color: #ffffff;
              font-weight: 800;
              font-size: 13px;
              letter-spacing: 2px;
              text-transform: uppercase;
              padding: 6px 18px;
              border-radius: 999px;
              margin-bottom: 16px;
            }
            h1 {
              font-size: 38px;
              font-weight: 900;
              margin: 0 0 8px 0;
              color: #0f172a;
              line-height: 1.2;
            }
            .qr-container {
              background: #f8fafc;
              border: 2px dashed #cbd5e1;
              border-radius: 20px;
              padding: 25px;
              display: inline-block;
              margin: 10px 0 25px 0;
            }
            .qr-container img {
              width: 280px;
              height: 280px;
              display: block;
            }
            .instructions-title {
              font-size: 20px;
              font-weight: 800;
              color: #1e3a8a;
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .steps {
              display: flex;
              justify-content: space-around;
              margin: 20px 0;
              text-align: center;
              gap: 15px;
            }
            .step {
              flex: 1;
              background: #f1f5f9;
              padding: 15px 10px;
              border-radius: 14px;
            }
            .step-num {
              background: #2563eb;
              color: white;
              width: 26px;
              height: 26px;
              border-radius: 50%;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 13px;
              margin-bottom: 8px;
            }
            .step-title {
              font-weight: 700;
              font-size: 14px;
              color: #0f172a;
              margin-bottom: 4px;
            }
            .step-desc {
              font-size: 11px;
              color: #64748b;
            }
            .direct-url {
              font-family: monospace;
              font-size: 15px;
              font-weight: bold;
              color: #2563eb;
              background: #eff6ff;
              padding: 10px 20px;
              border-radius: 8px;
              display: inline-block;
              margin: 15px 0;
              word-break: break-all;
            }
            .footer {
              font-size: 11px;
              color: #94a3b8;
              margin-top: 25px;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="poster-box">
            <div class="header-badge">${badgeHtml}</div>
            <h1>${orgName}</h1>
            ${subTitleHtml}

            <div class="qr-container">
              <img src="${qrDataUrl}" alt="Spectator QR Code" />
            </div>

            <div class="instructions-title">Scan to Watch Live on Your Phone</div>

            <div class="steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-title">Open Camera</div>
                <div class="step-desc">Open your smartphone camera or QR scanner</div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-title">Scan Code</div>
                <div class="step-desc">Point at the QR code and tap the link banner</div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-title">Watch Live</div>
                <div class="step-desc">Real-time scores, athletic heats &amp; standings</div>
              </div>
            </div>

            <div class="direct-url">${spectatorUrl}</div>

            <div class="footer">
              No download or account registration needed • Instant access for all spectators &amp; parents • FixtureGrid
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 mb-3">
            <Trophy size={13} />
            <span>Spectator Web App Access</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {orgName}
          </h2>
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {displaySubtitle}
          </p>
        </div>

        {/* Signage Format Selector */}
        <div className="mb-5">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setSignageMode('permanent')}
              className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isPermanent
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Shield size={13} className="shrink-0" />
              <span>Permanent Signage</span>
            </button>
            <button
              type="button"
              onClick={() => setSignageMode('event')}
              className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                !isPermanent
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Trophy size={13} className="shrink-0" />
              <span>Matchday Flyer</span>
            </button>
          </div>

          <div className="mt-2.5 px-3 py-2 rounded-xl text-[11px] leading-relaxed transition-all">
            {isPermanent ? (
              <p className="text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Recommended for physical signs &amp; posters:</strong> Excludes the specific tournament name so printed signage on noticeboards, fields, and pavilion posts remains valid year-round. Phones display today's live event dynamically once scanned.
                </span>
              </p>
            ) : (
              <p className="text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                <Zap size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Recommended for WhatsApp &amp; day-of-event flyers:</strong> Specifically prints <strong>"{eventTitle}"</strong> on the poster and downloaded graphic.
                </span>
              </p>
            )}
          </div>
        </div>

        {/* QR Code Card */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner mb-6">
          <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
            <QRCodeCanvas
              id="spectator-qr-canvas"
              ref={qrRef}
              value={spectatorUrl}
              size={220}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="mt-3 text-center">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold break-all select-all">
              {spectatorUrl}
            </span>
          </div>
        </div>

        {/* 3 Simple Spectator Instructions */}
        <div className="space-y-2.5 mb-6">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone size={14} className="text-blue-500" />
            Simple Instructions for Spectators
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-[11px] mb-1.5">1</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">Open Camera</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">Point smartphone camera at the QR code</p>
            </div>
            
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-[11px] mb-1.5">2</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">Tap Banner</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">Tap the website link that pops up</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold inline-flex items-center justify-center text-[11px] mb-1.5">3</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">Watch Live</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">View scores, heats &amp; logs in real-time</p>
            </div>
          </div>
          
          <p className="text-[11px] text-slate-400 text-center italic">
            * No app download or sign in required. Instant access on all iOS &amp; Android devices.
          </p>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleDownloadPng}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer border-none"
            title="Download QR code graphic for printing or social media"
          >
            <Download size={14} />
            <span>Download PNG</span>
          </button>

          <button
            onClick={handlePrintSignage}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer border-none"
            title="Print ready-to-hang A4 tournament poster"
          >
            <Printer size={14} />
            <span>Print Poster</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            title="Share via WhatsApp, SMS, or Social Media"
          >
            <Share2 size={14} />
            <span>{shareSuccess ? 'Shared!' : 'Share Live Link'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            title="Copy spectator link to clipboard"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Test Open Spectator View */}
        <div className="mt-4 pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-400">Want to test how spectators see it?</span>
          <a
            href={spectatorUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <span>Open Spectator View</span>
            <ExternalLink size={12} />
          </a>
        </div>

      </div>
    </div>
  );
}
