import { describe, it, expect } from 'vitest';
import { computeDoubleClose } from '../src/double_close';

describe('double-close (FL)', () => {
  it('baseline OTHER/SFR 100k→120k, 3-day hold, $300/mo', () => {
    const r = computeDoubleClose({
      ab_price: 100000,
      bc_price: 120000,
      county: 'OTHER',
      property_type: 'SFR',
      hold_days: 3,
      monthly_carry: 300,
    });
    expect(r.side_ab.deed_stamps).toBe(700);
    expect(r.side_bc.deed_stamps).toBe(840);
    expect(r.side_ab.title_premium).toBe(575);
    expect(r.side_bc.title_premium).toBe(675);
    expect(r.side_ab.recording_fees).toBe(10);
    expect(r.side_bc.recording_fees).toBe(10);
    expect(r.dc_total_costs).toBe(2810);
    expect(r.dc_carry_cost).toBe(30);
    expect(r.dc_net_spread).toBe(17160);
    expect(r.comparison).toBe('AssignmentBetter');
  });

  it('Miami-Dade SFR vs OTHER (deed rate shift)', () => {
    const sfr = computeDoubleClose({
      ab_price: 100000,
      bc_price: 120000,
      county: 'MIAMI-DADE',
      property_type: 'SFR',
    });
    const other = computeDoubleClose({
      ab_price: 100000,
      bc_price: 120000,
      county: 'MIAMI-DADE',
      property_type: 'OTHER',
    });
    expect(sfr.side_ab.deed_stamps).toBe(600); // 0.006 * 100k
    expect(other.side_ab.deed_stamps).toBe(1050); // 0.0105 * 100k
  });

  it('notes + extra pages (recording 5 pages => $44)', () => {
    const r = computeDoubleClose({
      ab_price: 150000,
      bc_price: 160000,
      county: 'OTHER',
      property_type: 'SFR',
      ab_note_amount: 100000,
      bc_note_amount: 50000,
      ab_pages: 5,
      bc_pages: 2,
    });
    expect(r.side_ab.recording_fees).toBe(44); // 10 + 8.5*(5-1)
    expect(r.side_ab.deed_stamps).toBe(1050); // 0.007 * 150k
    expect(r.side_ab.title_premium).toBe(825); // 575 + 50k*5/1k
  });
});
