/**
 * Robust Certificate Printing Utility
 * Opens an isolated print window with full styling, landscape orientation (A4),
 * custom Google fonts, and high-DPI vector elements, using the official StudyAsan
 * certificate background template (/certificate_background.png).
 *
 * Strict single-page A4 landscape constraints prevent multi-page PDF generation.
 */

export interface PrintCertificateOptions {
  title: string;
  candidateName: string;
  certificateTitle?: string;
  certificateBodyText?: string;
  certificateCode: string;
  dateStr?: string;
}

export function formatCertificateDate(dateInput?: string | Date | null): string {
  if (!dateInput) {
    return new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const parsed = new Date(dateInput);
  if (isNaN(parsed.getTime())) {
    return String(dateInput);
  }
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function printCertificateDocument(options: PrintCertificateOptions) {
  const printWindow = window.open('', '_blank', 'width=1123,height=794');
  if (!printWindow) {
    // Fallback if popup blocked
    window.print();
    return;
  }

  // Parse title into Main Heading and Subheading
  const rawTitle = options.certificateTitle || 'Certificate of Completion';
  let certMainHeading = 'CERTIFICATE';
  let certSubHeading = 'OF COMPLETION';

  const match = rawTitle.match(/^certificate\s+(of\s+.*)/i);
  if (match && match[1]) {
    certSubHeading = match[1].toUpperCase();
  } else if (/^certificate$/i.test(rawTitle.trim())) {
    certSubHeading = 'OF COMPLETION';
  } else {
    certSubHeading = rawTitle.toUpperCase();
  }

  const formattedDate = formatCertificateDate(options.dateStr);
  const examOrCourseName = options.title || 'Certification Assessment';
  const customBody = options.certificateBodyText?.trim();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${examOrCourseName} - ${options.candidateName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 landscape;
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 297mm;
      height: 210mm;
      max-width: 297mm;
      max-height: 210mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #ffffff;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .cert-page {
      width: 297mm;
      height: 210mm;
      max-width: 297mm;
      max-height: 210mm;
      position: relative;
      overflow: hidden;
      page-break-inside: avoid !important;
      page-break-after: avoid !important;
      page-break-before: avoid !important;
      background-image: url('/certificate_background.png');
      background-size: 100% 100%;
      background-repeat: no-repeat;
      background-position: center center;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-sizing: border-box;
      padding: 0 55mm;
    }

    /* Content Layout Container */
    .cert-content {
      position: absolute;
      top: 17%;
      left: 14%;
      right: 14%;
      bottom: 28%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      z-index: 10;
    }

    /* Certificate Header */
    .cert-title-main {
      font-size: 34pt;
      font-weight: 900;
      color: #002b5b;
      text-transform: uppercase;
      letter-spacing: 5px;
      line-height: 1;
      margin: 0;
    }
    .cert-title-sub {
      font-size: 15pt;
      font-weight: 700;
      color: #002b5b;
      text-transform: uppercase;
      letter-spacing: 7px;
      line-height: 1.2;
      margin-top: 5px;
    }
    .cert-pill {
      width: 44px;
      height: 4px;
      background: #0276D3;
      border-radius: 3px;
      margin: 9px auto 10px auto;
    }

    /* Lead Text */
    .cert-lead {
      font-family: 'Playfair Display', serif;
      font-size: 11.5pt;
      font-style: italic;
      color: #475569;
      margin-bottom: 5px;
    }

    /* Candidate Name */
    .candidate-name {
      font-size: 27pt;
      font-weight: 800;
      color: #002b5b;
      letter-spacing: 0.5px;
      line-height: 1.15;
      padding: 0 20px;
    }
    .name-divider {
      width: 280px;
      height: 1px;
      background: #cbd5e1;
      margin: 7px auto 10px auto;
    }

    /* Course / Assessment Details */
    .completion-lead {
      font-size: 10.5pt;
      color: #475569;
      line-height: 1.35;
    }
    .course-title {
      font-size: 13.5pt;
      font-weight: 800;
      color: #0276D3;
      margin: 2.5px 0;
      line-height: 1.25;
    }
    .offered-by {
      font-size: 10.5pt;
      color: #475569;
      font-weight: 500;
    }
    .offered-by strong {
      color: #002b5b;
      font-weight: 700;
    }

    /* Appreciation Note */
    .appreciation-text {
      font-size: 9pt;
      line-height: 1.45;
      color: #64748b;
      max-width: 620px;
      margin: 9px auto 0 auto;
      padding: 0 10px;
    }

    /* Bottom-Left Meta: Date of Issue & Certificate ID */
    .cert-meta-left {
      position: absolute;
      bottom: 12%;
      left: 6%;
      display: flex;
      align-items: center;
      gap: 18px;
      text-align: left;
      z-index: 15;
    }
    .meta-group {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: capitalize;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }
    .meta-value {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.2px;
    }
    .meta-sep {
      width: 1px;
      height: 28px;
      background: #cbd5e1;
    }
  </style>
</head>
<body>
  <div class="cert-page">
    <div class="cert-content">
      <h1 class="cert-title-main">${certMainHeading}</h1>
      <h2 class="cert-title-sub">${certSubHeading}</h2>
      <div class="cert-pill"></div>

      <p class="cert-lead">This is to certify that</p>
      <div class="candidate-name">${options.candidateName}</div>
      <div class="name-divider"></div>

      <p class="completion-lead">has successfully completed the course</p>
      <div class="course-title">${examOrCourseName}</div>
      <p class="offered-by">offered by <strong>StudyAsan</strong></p>

      <p class="appreciation-text">
        ${customBody || 'We appreciate your dedication, curiosity and consistent effort in achieving this milestone. We wish you continued success in your learning journey.'}
      </p>
    </div>

    <!-- Bottom Left Metadata -->
    <div class="cert-meta-left">
      <div class="meta-group">
        <span class="meta-label">Date of Issue</span>
        <span class="meta-value">${formattedDate}</span>
      </div>
      <div class="meta-sep"></div>
      <div class="meta-group">
        <span class="meta-label">Certificate ID</span>
        <span class="meta-value">${options.certificateCode}</span>
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      // Ensure background template image is loaded before triggering print dialog
      var bg = new Image();
      bg.src = '/certificate_background.png';
      var printed = false;

      function doPrint() {
        if (printed) return;
        printed = true;
        setTimeout(function() {
          window.focus();
          window.print();
        }, 250);
      }

      if (bg.complete) {
        doPrint();
      } else {
        bg.onload = doPrint;
        bg.onerror = doPrint;
      }
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

