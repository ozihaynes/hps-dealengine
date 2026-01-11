// ============================================================================
// REPAIRS PDF — Unit Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateRepairsPdf, downloadPdf, generatePdfFilename } from './repairsPdf';
import {
  DEMO_ENHANCED_ESTIMATOR_STATE,
  DEMO_PDF_CONFIG,
} from './constants/repairsDemoData';
import type { EnhancedEstimatorState } from '@hps-internal/contracts';

describe('generateRepairsPdf', () => {
  it('generates a valid blob with demo state', async () => {
    const result = await generateRepairsPdf(
      DEMO_ENHANCED_ESTIMATOR_STATE,
      DEMO_PDF_CONFIG
    );

    expect(result.success).toBe(true);
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob?.type).toBe('application/pdf');
    expect(result.blob?.size).toBeGreaterThan(0);
  });

  it('handles empty state gracefully', async () => {
    const emptyState: EnhancedEstimatorState = {
      categories: {},
      grandTotal: 0,
      contingencyPercent: 15,
      contingencyAmount: 0,
      totalWithContingency: 0,
      version: 2,
    };

    const result = await generateRepairsPdf(emptyState, DEMO_PDF_CONFIG);

    expect(result.success).toBe(true);
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob?.size).toBeGreaterThan(0);
  });

  it('handles state with all 13 categories populated', async () => {
    const result = await generateRepairsPdf(
      DEMO_ENHANCED_ESTIMATOR_STATE,
      DEMO_PDF_CONFIG
    );

    expect(result.success).toBe(true);
    expect(result.blob).toBeInstanceOf(Blob);
    // Should be larger with more content
    expect(result.blob?.size).toBeGreaterThan(5000);
  });

  it('includes quick estimate when provided', async () => {
    const configWithQuickEstimate = {
      ...DEMO_PDF_CONFIG,
      quickEstimate: {
        psfRate: 15,
        psfTotal: 22500,
        big5: [
          { label: 'Roof', rate: 5000, total: 5000 },
          { label: 'HVAC', rate: 6500, total: 6500 },
        ],
        total: 34000,
      },
    };

    const result = await generateRepairsPdf(
      DEMO_ENHANCED_ESTIMATOR_STATE,
      configWithQuickEstimate
    );

    expect(result.success).toBe(true);
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('handles undefined categories gracefully', async () => {
    const badState = {
      categories: undefined as unknown as Record<string, never>,
      grandTotal: 0,
      contingencyPercent: 15,
      contingencyAmount: 0,
      totalWithContingency: 0,
      version: 2 as const,
    };

    const result = await generateRepairsPdf(badState, DEMO_PDF_CONFIG);

    expect(result.success).toBe(true);
  });

  it('handles null values in state', async () => {
    const stateWithNulls: EnhancedEstimatorState = {
      categories: {},
      grandTotal: null as unknown as number,
      contingencyPercent: null as unknown as number,
      contingencyAmount: null as unknown as number,
      totalWithContingency: null as unknown as number,
      version: 2,
    };

    const result = await generateRepairsPdf(stateWithNulls, DEMO_PDF_CONFIG);

    expect(result.success).toBe(true);
  });
});

describe('generatePdfFilename', () => {
  it('generates filename with sanitized address', () => {
    const filename = generatePdfFilename('123 Main St.', '2026-01-08');

    expect(filename).toBe('Repair_Estimate_123_Main_St_2026-01-08.pdf');
  });

  it('handles special characters in address', () => {
    const filename = generatePdfFilename("456 O'Brien Ave #2B", '2026-01-08');

    expect(filename).toBe('Repair_Estimate_456_OBrien_Ave_2B_2026-01-08.pdf');
  });

  it('truncates long addresses to 50 chars', () => {
    const longAddress =
      'This Is A Very Long Address That Should Be Truncated To Prevent Issues With Filenames';
    const filename = generatePdfFilename(longAddress, '2026-01-08');

    // Filename should be reasonable length
    expect(filename.length).toBeLessThanOrEqual(100);
    expect(filename).toContain('Repair_Estimate_');
    expect(filename).toContain('2026-01-08.pdf');
  });

  it('handles empty address', () => {
    const filename = generatePdfFilename('', '2026-01-08');

    expect(filename).toBe('Repair_Estimate__2026-01-08.pdf');
  });

  it('handles null/undefined address', () => {
    const filename = generatePdfFilename(null as unknown as string, '2026-01-08');

    expect(filename).toBe('Repair_Estimate__2026-01-08.pdf');
  });
});

// Note: downloadPdf tests require DOM environment (jsdom)
// These tests are skipped when running without DOM
const hasDom = typeof document !== 'undefined';

describe.skipIf(!hasDom)('downloadPdf', () => {
  let mockLink: {
    href: string;
    download: string;
    click: ReturnType<typeof vi.fn>;
  };

  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(mockLink as unknown as HTMLAnchorElement);
    appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(() => mockLink as unknown as Node);
    removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation(() => mockLink as unknown as Node);
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('creates a link element and triggers download', () => {
    const blob = new Blob(['test'], { type: 'application/pdf' });
    const filename = 'test.pdf';

    downloadPdf(blob, filename);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockLink.href).toBe('blob:mock-url');
    expect(mockLink.download).toBe(filename);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(mockLink.click).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('cleans up object URL after download', () => {
    const blob = new Blob(['test'], { type: 'application/pdf' });

    downloadPdf(blob, 'test.pdf');

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });
});
