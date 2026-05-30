/**
 * Utility to export AI strategic, operations, and sales reports as clean, print-ready PDFs.
 */
export function exportReportToPDF(title: string, contentHtml: string) {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export this report as a PDF.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&family=JetBrains+Mono:wght@450;700&display=swap');
          
          body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            padding: 40px;
            line-height: 1.6;
            margin: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .header {
            border-bottom: 3px solid #6366f1;
            padding-bottom: 24px;
            margin-bottom: 32px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }

          .header-brand h1 {
            font-size: 26px;
            font-weight: 900;
            text-transform: uppercase;
            color: #1e1b4b;
            margin: 0;
            letter-spacing: 0.05em;
          }

          .header-brand p {
            font-size: 10px;
            text-transform: uppercase;
            color: #6366f1;
            letter-spacing: 0.2em;
            margin: 6px 0 0 0;
            font-weight: 800;
          }

          .header-meta {
            text-align: right;
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            color: #64748b;
            font-weight: bold;
          }

          .report-title {
            font-size: 20px;
            font-weight: 850;
            color: #0f172a;
            margin: 0 0 24px 0;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }

          .summary-box {
            background-color: #f8fafc;
            border-left: 4px solid #6366f1;
            padding: 20px;
            border-radius: 8px;
            font-style: italic;
            font-size: 14px;
            line-height: 1.7;
            margin-bottom: 36px;
            color: #334155;
          }

          .section {
            margin-bottom: 32px;
            page-break-inside: avoid;
          }

          .section-title {
            font-size: 13px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #4f46e5;
            margin: 0 0 16px 0;
            border-bottom: 1.5px solid #e2e8f0;
            padding-bottom: 6px;
          }

          .grid-2 {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 24px;
          }

          ul, ol {
            padding-left: 20px;
            margin: 0;
          }

          li {
            margin-bottom: 12px;
            font-size: 13px;
            color: #334155;
            font-weight: 500;
            line-height: 1.6;
          }

          .bullet-point {
            display: flex;
            gap: 10px;
            font-size: 13px;
            color: #334155;
            margin-bottom: 12px;
            font-weight: 500;
            line-height: 1.6;
            align-items: flex-start;
          }

          .bullet-icon {
            color: #6366f1;
            font-weight: 900;
            margin-top: 2px;
          }

          .action-badge {
            background: #e0e7ff;
            color: #4338ca;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 900;
            margin-right: 10px;
            flex-shrink: 0;
          }

          .meta-grid {
            display: grid;
            grid-template-cols: repeat(4, 1fr);
            gap: 16px;
            background: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            margin-bottom: 32px;
          }

          .meta-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 10px;
            background: #ffffff;
            border-radius: 6px;
            border: 1px solid #f1f5f9;
          }

          .meta-label {
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.08em;
            margin-bottom: 4px;
          }

          .meta-value {
            font-weight: 900;
            font-family: 'JetBrains Mono', monospace;
            color: #1e1b4b;
            font-size: 14px;
          }

          @page {
            size: A4;
            margin: 20mm;
          }

          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-brand">
            <h1>Crabster Technology</h1>
            <p>FoundersOS Strategic Suite</p>
          </div>
          <div class="header-meta">
            PRINTED: ${new Date().toLocaleDateString()}<br/>
            SYSTEM GENERATED REPORT
          </div>
        </div>
        <div class="report-title">${title}</div>
        ${contentHtml}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 750);
}
