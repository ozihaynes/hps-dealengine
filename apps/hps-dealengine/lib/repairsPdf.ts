// ============================================================================
// REPAIRS PDF GENERATION
// ============================================================================
// Principles Applied:
// - Professional Layout: HPS branding, clear hierarchy
// - Data Integrity: All values from state, no fabrication
// - Error Handling: Graceful failures with user feedback
// - Auditability: Timestamps, profile info in footer
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EnhancedEstimatorState } from '@hps-internal/contracts';
import { computeLineItemTotal, formatCurrency, formatUnit } from './repairsMathEnhanced';

/**
 * PDF Export Configuration
 */
export interface PdfExportConfig {
  property: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  deal: {
    id: string;
    sqft: number;
    rehabLevel: string;
  };
  quickEstimate?: {
    psfRate: number;
    psfTotal: number;
    big5: Array<{ label: string; rate: number; total: number }>;
    total: number;
  };
  profile: {
    name: string;
    version: string;
    asOf: string;
    source?: string;
  };
  preparedBy: string;
  date: string;
}

/**
 * PDF generation result
 */
export interface PdfGenerationResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}

/**
 * Generate professional repair estimate PDF
 *
 * @param state - Enhanced estimator state
 * @param config - PDF configuration with property/deal info
 * @returns Result object with blob or error
 */
export async function generateRepairsPdf(
  state: EnhancedEstimatorState,
  config: PdfExportConfig
): Promise<PdfGenerationResult> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // -------------------------------------------------------------------------
    // HEADER
    // -------------------------------------------------------------------------

    // HPS DealEngine branding (emerald bar)
    doc.setFillColor(16, 185, 129); // #10b981
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('HPS DEALENGINE', margin, 12);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Repair Estimate', margin, 19);

    yPos = 35;

    // -------------------------------------------------------------------------
    // PROPERTY INFO
    // -------------------------------------------------------------------------

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('Property Information', margin, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // slate-600

    const fullAddress = `${config.property.address}, ${config.property.city}, ${config.property.state} ${config.property.zip}`;
    doc.text(fullAddress, margin, yPos);
    yPos += 5;

    doc.text(`Square Feet: ${config.deal.sqft.toLocaleString()} SF`, margin, yPos);
    yPos += 5;

    doc.text(`Rehab Level: ${config.deal.rehabLevel}`, margin, yPos);
    yPos += 5;

    doc.text(`Date: ${config.date}`, margin, yPos);
    yPos += 5;

    doc.text(`Prepared By: ${config.preparedBy}`, margin, yPos);
    yPos += 12;

    // -------------------------------------------------------------------------
    // QUICK ESTIMATE (if provided)
    // -------------------------------------------------------------------------

    if (config.quickEstimate) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text('Quick Estimate', margin, yPos);
      yPos += 6;

      autoTable(doc, {
        startY: yPos,
        head: [['Method', 'Rate', 'Total']],
        body: [
          [
            'PSF Estimate',
            `$${config.quickEstimate.psfRate}/SF`,
            formatCurrency(config.quickEstimate.psfTotal),
          ],
          ...config.quickEstimate.big5.map((b) => [
            b.label,
            `$${b.rate}`,
            formatCurrency(b.total),
          ]),
          ['Quick Estimate Total', '', formatCurrency(config.quickEstimate.total)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      });

      // Get the final Y position from autoTable
      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }

    // -------------------------------------------------------------------------
    // DETAILED BREAKDOWN BY CATEGORY
    // -------------------------------------------------------------------------

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Detailed Breakdown', margin, yPos);
    yPos += 6;

    // Sort categories by displayOrder (handle missing categories gracefully)
    const categories = state.categories ?? {};
    const sortedCategories = Object.values(categories)
      .filter((cat) => cat && typeof cat === 'object')
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    for (const category of sortedCategories) {
      // Only include categories with values
      const items = category.items ?? [];
      const itemsWithValues = items.filter(
        (item) => computeLineItemTotal(item) > 0
      );
      if (itemsWithValues.length === 0) continue;

      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }

      // Category header with items table
      autoTable(doc, {
        startY: yPos,
        head: [[`${category.title} - ${formatCurrency(category.subtotal ?? 0)}`]],
        body: itemsWithValues.map((item) => {
          const total = computeLineItemTotal(item);
          const qtyUnit = item.quantity
            ? `${item.quantity} ${formatUnit(item.unit, item.quantity)}`
            : '-';
          const rate = item.unitCost ? formatCurrency(item.unitCost) : '-';
          return [item.label, qtyUnit, rate, formatCurrency(total)];
        }),
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: 255,
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
        },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      });

      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
    }

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------

    yPos += 5;

    // Check for page break
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }

    autoTable(doc, {
      startY: yPos,
      head: [['Summary', '']],
      body: [
        ['Detailed Estimate Subtotal', formatCurrency(state.grandTotal ?? 0)],
        [
          `Contingency (${state.contingencyPercent ?? 0}%)`,
          formatCurrency(state.contingencyAmount ?? 0),
        ],
        [
          'TOTAL REPAIR BUDGET',
          formatCurrency(state.totalWithContingency ?? 0),
        ],
      ],
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: 255,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 10,
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        // Highlight total row
        if (data.row.index === 2) {
          data.cell.styles.fillColor = [16, 185, 129];
          data.cell.styles.textColor = 255;
          data.cell.styles.fontSize = 12;
        }
      },
      margin: { left: margin, right: margin },
    });

    // -------------------------------------------------------------------------
    // FOOTER
    // -------------------------------------------------------------------------

    const footerY = pageHeight - 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    doc.text(
      `Rate Profile: ${config.profile.name} (${config.profile.version}) | As of: ${config.profile.asOf}`,
      margin,
      footerY
    );

    doc.text(
      `Generated by HPS DealEngine | ${new Date().toISOString()}`,
      pageWidth - margin,
      footerY,
      { align: 'right' }
    );

    // -------------------------------------------------------------------------
    // RETURN AS BLOB
    // -------------------------------------------------------------------------

    const blob = doc.output('blob');
    return { success: true, blob };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown PDF generation error';
    console.error('[repairsPdf] Generation failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Download PDF to user's device
 *
 * @param blob - PDF blob
 * @param filename - Download filename
 */
export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate safe filename for PDF
 *
 * @param address - Property address
 * @param date - Date string (YYYY-MM-DD)
 * @returns Sanitized filename
 */
export function generatePdfFilename(address: string, date: string): string {
  const sanitized = (address ?? '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);

  return `Repair_Estimate_${sanitized}_${date}.pdf`;
}
