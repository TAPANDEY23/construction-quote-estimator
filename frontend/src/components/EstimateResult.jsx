import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CopilotChat from './CopilotChat';
import { getCouncilData } from '../data/councils';

function fmt(n) {
  return n != null ? '$' + Math.round(n).toLocaleString('en-AU') : '—';
}

export default function EstimateResult({ estimate, formData, onRestart, userName = '' }) {
  const e = estimate;
  const [chatMessages, setChatMessages] = useState([]);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const council = getCouncilData(formData.postcode, formData.state);
  const councilMeta = council.council
    ? `${council.council} · FSR ${council.fsr}×`
    : `FSR ${council.fsr}×${council.approx ? ' (approx.)' : ''}`;

  function downloadPDF() {
    setPdfGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;
      const contentW = pageW - margin * 2;

      const PRIMARY = [26, 86, 219];
      const DARK = [30, 41, 59];
      const MUTED = [100, 116, 139];
      const LIGHT_BG = [240, 245, 255];

      // ── Header bar ──────────────────────────────────────────────────────────
      doc.setFillColor(...PRIMARY);
      doc.rect(0, 0, pageW, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Construction Cost Estimate', margin, 13);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
        pageW - margin,
        13,
        { align: 'right' }
      );

      let y = 28;

      // ── Prepared for ────────────────────────────────────────────────────────
      if (userName) {
        doc.setTextColor(...MUTED);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Prepared for: ${userName}`, margin, y);
        y += 5;
      }

      // ── Project meta line ────────────────────────────────────────────────────
      doc.setTextColor(...MUTED);
      doc.setFontSize(8.5);
      doc.text(
        `${formData.suburb}, ${formData.state}  ·  ${formData.houseSize}m²  ·  ${formData.bedrooms}bd ${formData.bathrooms}ba  ·  ${e.buildTimeEstimate}  ·  ${councilMeta}`,
        margin,
        y
      );
      y += 9;

      // ── Summary ─────────────────────────────────────────────────────────────
      doc.setTextColor(...DARK);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Project Summary', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const summaryLines = doc.splitTextToSize(e.summary, contentW);
      doc.text(summaryLines, margin, y);
      y += summaryLines.length * 5 + 8;

      // ── Total cost banner ────────────────────────────────────────────────────
      doc.setFillColor(...LIGHT_BG);
      doc.roundedRect(margin, y - 2, contentW, 24, 3, 3, 'F');
      doc.setDrawColor(...PRIMARY);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y - 2, contentW, 24, 3, 3, 'S');

      doc.setTextColor(...PRIMARY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Estimated Build Cost', pageW / 2, y + 5, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      doc.text(
        `Budget: ${fmt(e.totalRange?.low)}   ·   Mid-range: ${fmt(e.totalRange?.mid)}   ·   Premium: ${fmt(e.totalRange?.high)}`,
        pageW / 2,
        y + 13,
        { align: 'center' }
      );

      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(
        `Cost/m²: ${fmt(e.costPerSqm?.low)} – ${fmt(e.costPerSqm?.high)}`,
        pageW / 2,
        y + 20,
        { align: 'center' }
      );
      y += 30;

      // ── Breakdown table ──────────────────────────────────────────────────────
      autoTable(doc, {
        startY: y,
        head: [['Category', 'Budget', 'Mid-range', 'Premium']],
        body: (e.breakdown || []).map(row => [
          { content: row.category + (row.notes ? `\n${row.notes}` : ''), styles: { fontSize: 8 } },
          fmt(row.low),
          fmt(row.mid),
          fmt(row.high),
        ]),
        foot: [['TOTAL', fmt(e.totalRange?.low), fmt(e.totalRange?.mid), fmt(e.totalRange?.high)]],
        headStyles: {
          fillColor: PRIMARY,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'left',
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: DARK,
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        bodyStyles: { fontSize: 8, textColor: DARK, valign: 'top' },
        columnStyles: {
          0: { cellWidth: 82 },
          1: { halign: 'right', cellWidth: 28 },
          2: { halign: 'right', cellWidth: 28 },
          3: { halign: 'right', cellWidth: 28 },
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: DARK,
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'left',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
        styles: {
          cellPadding: 3,
          lineColor: [226, 232, 240],
          lineWidth: 0.3,
          overflow: 'linebreak',
        },
      });

      y = doc.lastAutoTable.finalY + 10;

      function checkPage(needed = 20) {
        if (y + needed > 275) { doc.addPage(); y = 20; }
      }

      // ── Assumptions ──────────────────────────────────────────────────────────
      if (e.assumptions?.length > 0) {
        checkPage(30);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text('Assumptions', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        e.assumptions.forEach(a => {
          const lines = doc.splitTextToSize(`• ${a}`, contentW);
          checkPage(lines.length * 4.5 + 2);
          doc.setTextColor(...DARK);
          doc.text(lines, margin, y);
          y += lines.length * 4.5 + 1;
        });
        y += 6;
      }

      // ── Key considerations ───────────────────────────────────────────────────
      if (e.keyConsiderations?.length > 0) {
        checkPage(30);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text('Key Considerations', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        e.keyConsiderations.forEach(c => {
          const lines = doc.splitTextToSize(`• ${c}`, contentW);
          checkPage(lines.length * 4.5 + 2);
          doc.setTextColor(...DARK);
          doc.text(lines, margin, y);
          y += lines.length * 4.5 + 1;
        });
        y += 6;
      }

      // ── Copilot insights ─────────────────────────────────────────────────────
      const assistantMsgs = chatMessages.filter(m => m.role === 'assistant' && !m.hidden);
      if (assistantMsgs.length > 0) {
        checkPage(30);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text('Homeygo AI Insights', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);

        assistantMsgs.forEach(msg => {
          if (msg.stepLabel) {
            checkPage(8);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(...PRIMARY);
            doc.text(msg.stepLabel, margin, y);
            y += 4;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...MUTED);
          }
          const plainText = msg.content.replace(/\*\*/g, '');
          const lines = doc.splitTextToSize(plainText, contentW);
          checkPage(lines.length * 4.2 + 4);
          doc.text(lines, margin, y);
          y += lines.length * 4.2 + 4;
        });
        y += 4;
      }

      // ── Disclaimer ───────────────────────────────────────────────────────────
      if (e.disclaimer) {
        checkPage(20);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MUTED);
        const dLines = doc.splitTextToSize(`Disclaimer: ${e.disclaimer}`, contentW);
        doc.text(dLines, margin, y);
      }

      // ── Footer on each page ──────────────────────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(
          `Construction Cost Estimator  ·  Page ${p} of ${totalPages}`,
          pageW / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      }

      const suburb = formData.suburb?.replace(/\s+/g, '-').toLowerCase() || 'estimate';
      const date = new Date().toISOString().slice(0, 10);
      doc.save(`construction-estimate-${suburb}-${date}.pdf`);
    } finally {
      setPdfGenerating(false);
    }
  }

  return (
    <div className="result-layout">

      {/* ── LEFT: scrollable breakdown ──────────────────────────────────── */}
      <div className="result-left">
        <div className="result-left-inner">

          {/* Header */}
          <div className="result-header">
            <h2>Your Construction Estimate</h2>
            <p className="result-summary">{e.summary}</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
              {formData.suburb}, {formData.state} · {formData.houseSize}m² · {formData.bedrooms}bd {formData.bathrooms}ba · {e.buildTimeEstimate} · {councilMeta}
            </p>
          </div>

          {/* Total range banner */}
          <div className="total-banner">
            <div className="banner-title">Total Estimated Build Cost</div>
            <div className="total-range-values">
              <div className="range-item">
                <div className="range-label">Budget</div>
                <div className="range-value" style={{ color: 'rgba(255,255,255,0.85)' }}>{fmt(e.totalRange?.low)}</div>
              </div>
              <div className="range-divider">–</div>
              <div className="range-item mid">
                <div className="range-label">Mid-range</div>
                <div className="range-value">{fmt(e.totalRange?.mid)}</div>
              </div>
              <div className="range-divider">–</div>
              <div className="range-item">
                <div className="range-label">Premium</div>
                <div className="range-value" style={{ color: 'rgba(255,255,255,0.85)' }}>{fmt(e.totalRange?.high)}</div>
              </div>
            </div>
            <div className="banner-meta">
              <span>📐 {fmt(e.costPerSqm?.low)}–{fmt(e.costPerSqm?.high)} per m²</span>
              <span>⏱️ {e.buildTimeEstimate}</span>
              <span>📍 {formData.suburb}, {formData.state}</span>
            </div>
          </div>

          {/* Breakdown table */}
          <div className="breakdown-section">
            <h3 className="section-title">📊 Cost Breakdown by Category</h3>
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="num low-val">Budget</th>
                  <th className="num mid-val">Mid</th>
                  <th className="num high-val">Premium</th>
                </tr>
              </thead>
              <tbody>
                {(e.breakdown || []).map((row, i) => (
                  <tr key={i}>
                    <td>
                      <div className="category-name">{row.category}</div>
                      {row.notes && <div className="category-notes">{row.notes}</div>}
                    </td>
                    <td className="num low-val">{fmt(row.low)}</td>
                    <td className="num mid-val">{fmt(row.mid)}</td>
                    <td className="num high-val">{fmt(row.high)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                  <td><strong>TOTAL</strong></td>
                  <td className="num low-val"><strong>{fmt(e.totalRange?.low)}</strong></td>
                  <td className="num mid-val"><strong>{fmt(e.totalRange?.mid)}</strong></td>
                  <td className="num high-val"><strong>{fmt(e.totalRange?.high)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Assumptions & considerations */}
          <div className="info-grid">
            {e.assumptions?.length > 0 && (
              <div className="info-box">
                <h4>Assumptions Made</h4>
                <ul>
                  {e.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
            {e.keyConsiderations?.length > 0 && (
              <div className="info-box">
                <h4>Key Considerations</h4>
                <ul>
                  {e.keyConsiderations.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="disclaimer">
            <strong>Disclaimer</strong>
            {e.disclaimer}
          </div>

          {/* Actions */}
          <div className="result-actions">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Want to adjust your inputs or try a different configuration?
            </p>
            <div className="result-action-buttons">
              <button
                className="btn btn-pdf"
                onClick={downloadPDF}
                disabled={pdfGenerating}
                title="Download this estimate as a PDF"
              >
                {pdfGenerating ? '⏳ Generating...' : '⬇️ Download PDF'}
              </button>
              <button className="btn btn-primary btn-large" onClick={onRestart}>
                Start New Estimate
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── RIGHT: Builders (top) + Copilot (bottom) ────────────────────── */}
      <div className="result-right">

        <div className="result-builders-wrap">
          <BuildersSection
            suburb={formData.suburb}
            state={formData.state}
            qualityTier={formData.qualityTier}
            houseSize={formData.houseSize}
          />
        </div>

        <div className="result-copilot-wrap">
          <CopilotChat
            formData={formData}
            estimate={estimate}
            isFloating={false}
            userName={userName}
            onMessagesChange={setChatMessages}
          />
        </div>

      </div>

    </div>
  );
}

/* ── Builders Section ──────────────────────────────────────────────────────── */

const BADGE_STYLES = {
  'Best Value':          { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  'Most Popular':        { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  'Custom Specialist':   { bg: '#f3e8ff', color: '#7e22ce', border: '#d8b4fe' },
  'Premium Choice':      { bg: '#fff7ed', color: '#c2410c', border: '#fdba74' },
  'Best for First Home': { bg: '#fef9c3', color: '#a16207', border: '#fde047' },
};

const TYPE_ICONS = {
  'Volume Builder':       '🏭',
  'Project Home Builder': '📋',
  'Custom Builder':       '✏️',
  'Semi-Custom Builder':  '🎨',
};

function BuildersSection({ suburb, state, qualityTier, houseSize }) {
  const [builders, setBuilders] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/builders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suburb, state, qualityTier, houseSize }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setBuilders(data.builders || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [suburb, state, qualityTier, houseSize]);

  return (
    <div className="builders-section">
      <div className="builders-section-header">
        <h3 className="section-title">🏢 Recommended Builders in {suburb}</h3>
        <p className="builders-subtitle">
          Top builders for a <strong>{houseSize}m²</strong> {qualityTier === 'budget' ? 'budget' : qualityTier === 'premium' ? 'premium' : 'mid-range'} home in {suburb}, {state}
        </p>
      </div>

      {loading && (
        <div className="builders-grid">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="builder-card builder-card-skeleton">
              <div className="skeleton-badge" />
              <div className="skeleton-name" />
              <div className="skeleton-type" />
              <div className="skeleton-price" />
              <div className="skeleton-strength" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="builders-error">
          Unable to load builder recommendations right now.
        </div>
      )}

      {builders && builders.length > 0 && (
        <div className="builders-grid">
          {builders.map((b, i) => <BuilderCard key={i} builder={b} />)}
        </div>
      )}

      <p className="builders-disclaimer">
        ⚠️ Builder information is AI-generated based on market data and may not reflect current availability or exact pricing. Always obtain formal quotes directly from builders before making decisions.
      </p>
    </div>
  );
}

function BuilderCard({ builder: b }) {
  const badgeStyle = BADGE_STYLES[b.badge] || BADGE_STYLES['Most Popular'];
  const typeIcon = TYPE_ICONS[b.type] || '🏗️';

  return (
    <div className="builder-card">
      <div className="builder-card-top">
        <div
          className="builder-badge"
          style={{ background: badgeStyle.bg, color: badgeStyle.color, borderColor: badgeStyle.border }}
        >
          {b.badge}
        </div>
        <span className="builder-type-icon" title={b.type}>{typeIcon}</span>
      </div>

      <div className="builder-name">{b.name}</div>
      <div className="builder-type">{b.type}</div>

      <div className="builder-price-row">
        <div className="builder-price-block">
          <div className="builder-price-label">Total project range</div>
          <div className="builder-price-value">
            {fmt(b.totalRange?.low)} – {fmt(b.totalRange?.high)}
          </div>
        </div>
        <div className="builder-price-block">
          <div className="builder-price-label">Per m²</div>
          <div className="builder-price-sqm">
            {fmt(b.pricePerSqm?.low)} – {fmt(b.pricePerSqm?.high)}
          </div>
        </div>
      </div>

      <div className="builder-strength">
        <span className="builder-strength-icon">⭐</span>
        {b.strength}
      </div>

      <div className="builder-coverage">
        <span>📍</span> {b.coverage}
      </div>
    </div>
  );
}
