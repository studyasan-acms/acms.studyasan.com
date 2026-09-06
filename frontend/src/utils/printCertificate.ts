/**
 * Robust Certificate Printing Utility
 * Opens an isolated print window with full styling, landscape orientation,
 * custom Google fonts, and high-DPI vector elements, avoiding any parent modal/dialog transform issues.
 */

export interface PrintCertificateOptions {
  title: string;
  candidateName: string;
  certificateTitle: string;
  certificateBodyText: string;
  certificateCode: string;
  dateStr: string;
}

export function printCertificateDocument(options: PrintCertificateOptions) {
  const printWindow = window.open('', '_blank', 'width=1150,height=800');
  if (!printWindow) {
    // Fallback if popup blocked
    window.print();
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${options.title} - ${options.candidateName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Great+Vibes&family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    @page {
      size: landscape;
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: #ffffff;
      font-family: 'Outfit', sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .cert-container {
      width: 100vw;
      height: 100vh;
      padding: 40px 52px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      position: relative;
      background-color: #ffffff;
      background-image: radial-gradient(#0276D315 1.5px, transparent 1.5px);
      background-size: 24px 24px;
      text-align: center;
    }
    /* Frame Borders */
    .border-outer {
      position: absolute;
      top: 18px;
      left: 18px;
      right: 18px;
      bottom: 18px;
      border: 3.5px solid #0276D3;
      border-radius: 26px;
      pointer-events: none;
    }
    .border-inner {
      position: absolute;
      top: 26px;
      left: 26px;
      right: 26px;
      bottom: 26px;
      border: 1.2px solid rgba(2, 118, 211, 0.3);
      border-radius: 20px;
      pointer-events: none;
    }
    /* Corners */
    .corner {
      position: absolute;
      width: 48px;
      height: 48px;
      pointer-events: none;
    }
    .corner-tl { top: 32px; left: 32px; border-top: 4.5px solid #0276D3; border-left: 4.5px solid #0276D3; border-top-left-radius: 14px; }
    .corner-tr { top: 32px; right: 32px; border-top: 4.5px solid #0276D3; border-right: 4.5px solid #0276D3; border-top-right-radius: 14px; }
    .corner-bl { bottom: 32px; left: 32px; border-bottom: 4.5px solid #0276D3; border-left: 4.5px solid #0276D3; border-bottom-left-radius: 14px; }
    .corner-br { bottom: 32px; right: 32px; border-bottom: 4.5px solid #0276D3; border-right: 4.5px solid #0276D3; border-bottom-right-radius: 14px; }

    /* Watermark Icon */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.035;
      font-size: 380px;
      user-select: none;
      pointer-events: none;
      line-height: 1;
    }

    /* Content Elements */
    .brand-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 6px;
    }
    .brand-badge {
      width: 46px;
      height: 46px;
      background: #0276D3;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      margin-bottom: 6px;
      box-shadow: 0 4px 10px rgba(2, 118, 211, 0.25);
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      color: #0276D3;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      line-height: 1;
    }
    .brand-sub {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.26em;
      color: #64748b;
      margin-top: 4px;
    }

    .main-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: auto 0;
      width: 100%;
    }
    .cert-heading {
      font-family: 'Cinzel', serif;
      font-size: 30px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      margin: 0 0 6px 0;
    }
    .presented-text {
      font-size: 14px;
      font-style: italic;
      color: #64748b;
      font-family: 'Playfair Display', serif;
      margin-bottom: 8px;
    }
    .candidate-name {
      font-family: 'Outfit', sans-serif;
      font-size: 42px;
      font-weight: 800;
      color: #0276D3;
      padding: 0 24px;
      line-height: 1.15;
    }
    .divider-line {
      width: 200px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #0276D3, transparent);
      margin: 8px auto 16px auto;
    }
    .body-text {
      font-family: 'Playfair Display', serif;
      font-size: 15px;
      line-height: 1.65;
      color: #334155;
      max-width: 740px;
      margin: 0 auto;
      padding: 0 20px;
    }

    /* Footer / Signatures */
    .cert-footer {
      width: 100%;
      max-width: 860px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 28px;
      margin-bottom: 8px;
    }
    .sig-col {
      min-width: 170px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .sig-script {
      font-family: 'Great Vibes', cursive;
      font-size: 30px;
      color: #1e293b;
      height: 38px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      margin-bottom: 2px;
    }
    .date-display {
      font-family: 'Outfit', sans-serif;
      font-size: 13.5px;
      font-weight: 600;
      color: #1e293b;
      height: 38px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      margin-bottom: 2px;
    }
    .sig-line {
      width: 160px;
      height: 1px;
      background: #94a3b8;
      margin-bottom: 5px;
    }
    .sig-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #64748b;
    }
    .cert-code-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 6px 16px;
      margin-bottom: 3px;
    }
    .cert-code-label {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      display: block;
    }
    .cert-code-val {
      font-family: monospace;
      font-size: 12.5px;
      font-weight: 700;
      color: #0276D3;
      letter-spacing: 0.5px;
    }
    .cert-verify-text {
      font-size: 8.5px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="border-outer"></div>
    <div class="border-inner"></div>
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>
    <div class="watermark">🏆</div>

    <div class="brand-section">
      <div class="brand-badge">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="6"/>
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
        </svg>
      </div>
      <div class="brand-title">StudyAsan</div>
      <div class="brand-sub">Academy of Continuous Mastery & Skills</div>
    </div>

    <div class="main-body">
      <h1 class="cert-heading">${options.certificateTitle}</h1>
      <p class="presented-text">This is proudly presented to</p>
      <div class="candidate-name">${options.candidateName}</div>
      <div class="divider-line"></div>
      <p class="body-text">${options.certificateBodyText}</p>
    </div>

    <div class="cert-footer">
      <div class="sig-col">
        <div class="sig-script">Deepak</div>
        <div class="sig-line"></div>
        <span class="sig-label">Authorized Signature</span>
      </div>

      <div class="sig-col">
        <div class="cert-code-box">
          <span class="cert-code-label">Certificate ID</span>
          <span class="cert-code-val">${options.certificateCode}</span>
        </div>
        <span class="cert-verify-text">Verified StudyAsan Digital Credential</span>
      </div>

      <div class="sig-col">
        <div class="date-display">${options.dateStr}</div>
        <div class="sig-line"></div>
        <span class="sig-label">Date Issued</span>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
        setTimeout(function() { window.close(); }, 800);
      }, 400);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
