import type { EstimatorSectionDef, EstimatorState } from './types';
import type { EstimatorSectionDefV2 } from '@hps-internal/contracts';

export const Icons: Record<string, string> = {
  dollar: 'M12 1v22m-6-10h12',
  trending: 'M23 6l-9.5 9.5-5-5L1 18',
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  wrench:
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  calculator:
    'M19 12H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m14 0h-2m-2 0h-2m-2 0h-2m-2 0h-2m-2 0h-2',
  alert:
    'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01',
  playbook:
    'M2 6s1.5-2 5-2 5 2 5 2v14s-1.5-1-5-1-5 1-5 1V6zM22 6s-1.5-2-5-2-5 2-5 2v14s1.5-1 5-1 5 1 5 1V6z',
  lightbulb: 'M9 18h6M12 22V18M9 14h6M9 11h6M12 2a5 5 0 0 1 3 9H9a5 5 0 0 1 3-9z',
  check: 'M20 6L9 17l-5-5',
  briefcase: 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
  barChart: 'M12 20V10m6 10V4M6 20v-4',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7',
  settings:
    'M12.89 1.45l.13.04c.34.1.66.27.94.46l.1.07c.27.18.52.4.74.64l.08.09c.22.24.42.5.58.78l.04.09c.17.3.3.62.4.95l.02.13c.04.36.04.72.04 1.1v.18c0 .38 0 .74-.04 1.1l-.02.13c-.1.33-.23.65-.4.95l-.04.09c-.16.28-.36.54-.58.78l-.08.09c-.22.24-.47.46-.74.64l-.1.07c-.28.19-.6.36-.94.46l-.13.04c-.36.12-.73.18-1.12.18s-.76-.06-1.12-.18l-.13-.04a3.84 3.84 0 01-.94-.46l-.1-.07a3.84 3.84 0 01-.74-.64l-.08-.09a3.84 3.84 0 01-.58-.78l-.04-.09c-.17-.3-.3-.62-.4-.95l-.02-.13c-.04-.36-.04-.72-.04-1.1v-.18c0-.38 0 .74.04-1.1l.02-.13c.1-.33.23.65.4-.95l.04-.09c.16-.28.36.54.58.78l.08-.09c.22.24.47.46.74.64l.1-.07c.28-.19.6-.36.94-.46l.13-.04c.36-.12.73-.18 1.12-.18s.76.06 1.12.18z M12 15a3 3 0 100-6 3 3 0 000 6z',
  sliders: 'M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2 0h6m2 0h6',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  mail: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
  users:
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M7 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0z M17 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  inbox:
    'M22 12h-6l-2 3h-4l-2-3H2 M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
};

export const estimatorSections: Record<string, EstimatorSectionDef> = {
  exterior: {
    title: 'Exterior & Structural',
    icon: 'wrench',
    items: {
      roof: {
        label: 'Roof (Replacement)',
        isPerUnit: true,
        unitName: 'sq (100 sf)',
        options: {
          'Good (0–15 yrs)': 0,
          'Replace – Low ($525/sq)': 525,
          'Replace – Mid ($600/sq)': 600,
          'Replace – High ($675/sq)': 675,
        },
      },
      roofRepair: {
        label: 'Roof Repair',
        isPerUnit: true,
        unitName: 'repair',
        options: { None: 0, 'Minor Leak': 600, Moderate: 1700, Major: 3800 },
      },
      exteriorPaint: {
        label: 'Exterior Painting',
        isPerUnit: true,
        unitName: 'sf',
        options: { None: 0, Low: 2.0, Mid: 3.2, High: 5.5 },
      },
      windows: {
        label: 'Window Replacement',
        isPerUnit: true,
        unitName: 'window',
        options: {
          'All Intact': 0,
          'Replace – Low': 450,
          'Replace – Mid': 850,
          'Replace – High': 1400,
        },
      },
      siding: {
        label: 'Exterior Siding Replacement',
        isPerUnit: true,
        unitName: 'sf',
        options: { None: 0, Low: 5, Mid: 8, High: 12 },
      },
      landscaping: {
        label: 'Landscaping',
        options: { 'Minimal Work': 0, 'Cleanup & Trimming': 1200, 'Full Sod/Clear': 3500 },
      },
    },
  },
  interior: {
    title: 'Interior Rooms & Finishes',
    icon: 'home',
    items: {
      interiorPaint: {
        label: 'Interior Painting',
        isPerUnit: true,
        unitName: 'sf (wall)',
        options: { None: 0, Low: 2.0, Mid: 3.0, High: 4.5 },
      },
      floorVinylLaminate: {
        label: 'Vinyl/Laminate Installation',
        isPerUnit: true,
        unitName: 'sf',
        options: { None: 0, Low: 3.5, Mid: 5.5, High: 8.5 },
      },
      floorHardwoodInstall: {
        label: 'Hardwood Installation',
        isPerUnit: true,
        unitName: 'sf',
        options: { None: 0, Low: 9, Mid: 13, High: 16 },
      },
      floorHardwoodRefinish: {
        label: 'Hardwood Refinishing',
        isPerUnit: true,
        unitName: 'sf',
        options: { None: 0, Low: 3.25, Mid: 4.25, High: 5.5 },
      },
      lightFixtures: {
        label: 'Lighting Fixtures',
        isPerUnit: true,
        unitName: 'fixture',
        options: {
          'All Functional/Modern': 0,
          'Replace – Std': 175,
          'Replace – Mid': 275,
          'Replace – Designer': 525,
        },
      },
    },
  },
  kitchenBath: {
    title: 'Kitchen & Bathrooms',
    icon: 'home',
    items: {
      kitchenFullRemodel: {
        label: 'Kitchen – Full Remodel',
        options: { None: 0, Low: 20000, Mid: 35000, High: 60000 },
      },
      kitchenCabinets: {
        label: 'Kitchen Cabinets',
        options: { None: 0, Good: 0, 'Refinish/Paint': 3000, Replace: 12000 },
      },
      countertops: {
        label: 'Countertops',
        options: { None: 0, Good: 0, Laminate: 2200, 'Quartz/Granite': 5500 },
      },
      appliances: {
        label: 'Appliances',
        options: { 'None Needed': 0, 'Provide Stainless Package': 5500 },
      },
      bathrooms: {
        label: 'Bathrooms (Full Remodel)',
        options: { 'No Work': 0, 'Minor Update': 2500, 'Full Gut & Remodel': 8500 },
        isPerUnit: true,
        unitName: 'each',
      },
    },
  },
  systems: {
    title: 'Systems & Major Components',
    icon: 'wrench',
    items: {
      hvacAC: {
        label: 'AC Installation (Central)',
        options: { 'No Work': 0, Low: 7500, Mid: 11000, High: 15000 },
      },
      furnace: {
        label: 'Furnace Replacement',
        options: { 'No Work': 0, Low: 3500, Mid: 5500, High: 9000 },
      },
      waterHeater: {
        label: 'Water Heater',
        options: { '<10 Yrs Old': 0, 'Replace (10+ Yrs)': 1700 },
      },
      plumbingFixtures: {
        label: 'Plumbing – Fixture Replacement',
        isPerUnit: true,
        unitName: 'fixture',
        options: { None: 0, Basic: 175, Mid: 400, High: 1100 },
      },
      plumbing: {
        label: 'Plumbing (Supply/Drain)',
        options: { 'No Issues': 0, 'Leaks / Repairs Needed': 1500, 'Full Repipe': 8500 },
      },
      electricalRewire: {
        label: 'Electrical – Rewiring (Whole House)',
        options: { 'No Work': 0, Low: 7500, Mid: 12000, High: 17500 },
      },
      electricalPanel: {
        label: 'Electrical Panel',
        options: { 'Modern Breakers': 0, 'Update Needed (FPE/Zinsco)': 3500 },
      },
    },
  },
  structural: {
    title: 'Structural & Envelope',
    icon: 'wrench',
    items: {
      foundationRepair: {
        label: 'Foundation Repair',
        options: { None: 0, Low: 6000, Mid: 18000, High: 45000 },
      },
      drywallRepair: {
        label: 'Wall Repair (Drywall)',
        isPerUnit: true,
        unitName: 'sf',
        options: { None: 0, 'Minor Patches': 2.5, Moderate: 4, Extensive: 7 },
      },
    },
  },
};

export const createInitialEstimatorState = (): EstimatorState => {
  const state: EstimatorState = { costs: {}, quantities: {} };
  Object.keys(estimatorSections).forEach((sectionKey) => {
    const section = estimatorSections[sectionKey as keyof typeof estimatorSections];
    state.costs[sectionKey] = {};
    Object.keys(section.items).forEach((itemKey) => {
      const item = section.items[itemKey as keyof typeof section.items];
      const firstCondition = Object.keys(item.options)[0];
      state.costs[sectionKey][itemKey] = {
        condition: firstCondition,
        cost: item.options[firstCondition] ?? 0,
        notes: '',
      };
      if (item.isPerUnit) {
        state.quantities[itemKey] = 0;
      }
    });
  });
  return state;
};

// ============================================================================
// ENHANCED ESTIMATOR SECTIONS v2 — 13 Categories, 64 Items
// ============================================================================
// Principles Applied:
// - Miller's Law: 7±2 items per category (avg 4.9)
// - Rehab workflow order (demolition → permits)
// - FL-specific items (stucco, impact windows, tile roof, etc.)
// - Industry-standard units and pricing
// ============================================================================

export const estimatorSectionsV2: Record<string, EstimatorSectionDefV2> = {
  // -------------------------------------------------------------------------
  // 1. DEMOLITION & CLEANUP (4 items)
  // -------------------------------------------------------------------------
  demolition: {
    title: 'Demolition & Cleanup',
    icon: 'Trash2',
    displayOrder: 0,
    items: {
      dumpster: {
        id: 'dumpster',
        label: 'Dumpster Rental (20yd)',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 450,
        options: { good: 350, fair: 450, poor: 550, replace: 650 },
      },
      selectiveDemo: {
        id: 'selectiveDemo',
        label: 'Selective Demolition',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 3,
        options: { good: 1, fair: 3, poor: 5, replace: 8 },
      },
      debrisHaulAway: {
        id: 'debrisHaulAway',
        label: 'Debris Haul-Away',
        unit: 'lump',
        unitName: 'LS',
        defaultUnitCost: 500,
        options: { good: 300, fair: 500, poor: 800, replace: 1200 },
      },
      hazmatAbatement: {
        id: 'hazmatAbatement',
        label: 'Hazmat Abatement (Asbestos/Lead)',
        unit: 'lump',
        unitName: 'LS',
        defaultUnitCost: 2500,
        options: { good: 1500, fair: 2500, poor: 4000, replace: 6000 },
      },
    },
  },

  // -------------------------------------------------------------------------
  // 2. ROOFING (5 items)
  // -------------------------------------------------------------------------
  roofing: {
    title: 'Roofing',
    icon: 'Home',
    displayOrder: 1,
    items: {
      roofTearOff: {
        id: 'roofTearOff',
        label: 'Roof Tear-Off',
        unit: 'square',
        unitName: 'SQ',
        defaultUnitCost: 125,
        options: { good: 100, fair: 125, poor: 150, replace: 175 },
      },
      shingleInstall: {
        id: 'shingleInstall',
        label: 'Shingle Install (30-yr Architectural)',
        unit: 'square',
        unitName: 'SQ',
        defaultUnitCost: 350,
        options: { good: 300, fair: 350, poor: 400, replace: 450 },
      },
      tileRoofInstall: {
        id: 'tileRoofInstall',
        label: 'Tile Roof Install (FL Standard)',
        unit: 'square',
        unitName: 'SQ',
        defaultUnitCost: 650,
        options: { good: 550, fair: 650, poor: 750, replace: 900 },
      },
      flashingRepair: {
        id: 'flashingRepair',
        label: 'Flashing Repair/Replace',
        unit: 'linear_ft',
        unitName: 'LF',
        defaultUnitCost: 15,
        options: { good: 10, fair: 15, poor: 20, replace: 30 },
      },
      gutters: {
        id: 'gutters',
        label: 'Gutters & Downspouts',
        unit: 'linear_ft',
        unitName: 'LF',
        defaultUnitCost: 12,
        options: { good: 8, fair: 12, poor: 18, replace: 25 },
      },
    },
  },

  // -------------------------------------------------------------------------
  // 3. EXTERIOR & SIDING (5 items)
  // -------------------------------------------------------------------------
  exterior: {
    title: 'Exterior & Siding',
    icon: 'Building2',
    displayOrder: 2,
    items: {
      stuccoRepair: {
        id: 'stuccoRepair',
        label: 'Stucco Repair (FL Common)',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 12,
        options: { good: 8, fair: 12, poor: 18, replace: 25 },
      },
      sidingVinyl: {
        id: 'sidingVinyl',
        label: 'Vinyl Siding Install',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 8,
        options: { good: 5, fair: 8, poor: 10, replace: 12 },
      },
      exteriorPaint: {
        id: 'exteriorPaint',
        label: 'Exterior Paint',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 2.5,
        options: { good: 1.5, fair: 2.5, poor: 3.5, replace: 4.5 },
      },
      fasciaSoffit: {
        id: 'fasciaSoffit',
        label: 'Fascia & Soffit Repair',
        unit: 'linear_ft',
        unitName: 'LF',
        defaultUnitCost: 18,
        options: { good: 12, fair: 18, poor: 25, replace: 35 },
      },
      deckPorch: {
        id: 'deckPorch',
        label: 'Deck/Porch Repair',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 25,
        options: { good: 15, fair: 25, poor: 40, replace: 60 },
      },
    },
  },

  // -------------------------------------------------------------------------
  // 4. WINDOWS & DOORS (5 items)
  // -------------------------------------------------------------------------
  windowsDoors: {
    title: 'Windows & Doors',
    icon: 'DoorOpen',
    displayOrder: 3,
    items: {
      windowsVinyl: {
        id: 'windowsVinyl',
        label: 'Vinyl Windows (Standard)',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 450,
        options: { good: 350, fair: 450, poor: 550, replace: 650 },
      },
      impactWindows: {
        id: 'impactWindows',
        label: 'Impact Windows (FL Code)',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 850,
        options: { good: 700, fair: 850, poor: 1000, replace: 1200 },
      },
      entryDoor: {
        id: 'entryDoor',
        label: 'Entry Door (Steel/Fiberglass)',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 1200,
        options: { good: 800, fair: 1200, poor: 1600, replace: 2000 },
      },
      interiorDoors: {
        id: 'interiorDoors',
        label: 'Interior Doors (Hollow Core)',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 250,
        options: { good: 175, fair: 250, poor: 325, replace: 400 },
      },
      slidingGlass: {
        id: 'slidingGlass',
        label: 'Sliding Glass Door',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 1500,
        options: { good: 1200, fair: 1500, poor: 1800, replace: 2200 },
      },
    },
  },

  // -------------------------------------------------------------------------
  // 5. FOUNDATION & STRUCTURAL (4 items)
  // -------------------------------------------------------------------------
  foundation: {
    title: 'Foundation & Structural',
    icon: 'Layers',
    displayOrder: 4,
    items: {
      foundationRepair: {
        id: 'foundationRepair',
        label: 'Foundation Crack Repair',
        unit: 'linear_ft',
        unitName: 'LF',
        defaultUnitCost: 75,
        options: { good: 50, fair: 75, poor: 125, replace: 200 },
      },
      piering: {
        id: 'piering',
        label: 'Foundation Piering/Underpinning',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 1500,
        options: { good: 1200, fair: 1500, poor: 2000, replace: 2500 },
      },
      framing: {
        id: 'framing',
        label: 'Framing Repair/Sister',
        unit: 'linear_ft',
        unitName: 'LF',
        defaultUnitCost: 25,
        options: { good: 15, fair: 25, poor: 40, replace: 60 },
      },
      subfloorRepair: {
        id: 'subfloorRepair',
        label: 'Subfloor Repair/Replace',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 8,
        options: { good: 5, fair: 8, poor: 12, replace: 18 },
      },
    },
  },

  // -------------------------------------------------------------------------
  // 6. PLUMBING (5 items)
  // -------------------------------------------------------------------------
  plumbing: {
    title: 'Plumbing',
    icon: 'Droplets',
    displayOrder: 5,
    items: {
      repipe: {
        id: 'repipe',
        label: 'Whole House Repipe (PEX)',
        unit: 'lump',
        unitName: 'LS',
        defaultUnitCost: 5500,
        options: { good: 4000, fair: 5500, poor: 7000, replace: 9000 },
      },
      waterHeater: {
        id: 'waterHeater',
        label: 'Water Heater (50 gal)',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 1500,
        options: { good: 1200, fair: 1500, poor: 1800, replace: 2200 },
      },
      drainLines: {
        id: 'drainLines',
        label: 'Drain Line Repair/Replace',
        unit: 'linear_ft',
        unitName: 'LF',
        defaultUnitCost: 45,
        options: { good: 30, fair: 45, poor: 65, replace: 90 },
      },
      fixtures: {
        id: 'fixtures',
        label: 'Plumbing Fixtures (Faucets/Valves)',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 250,
        options: { good: 150, fair: 250, poor: 350, replace: 500 },
      },
      wellPump: {
        id: 'wellPump',
        label: 'Well Pump (FL Rural)',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 2500,
        options: { good: 1800, fair: 2500, poor: 3500, replace: 4500 },
      },
    },
  },

  // -------------------------------------------------------------------------
  // 7. ELECTRICAL (5 items)
  // -------------------------------------------------------------------------
  electrical: {
    title: 'Electrical',
    icon: 'Zap',
    displayOrder: 6,
    items: {
      panelUpgrade: {
        id: 'panelUpgrade',
        label: 'Panel Upgrade (200A)',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 2500,
        options: { good: 2000, fair: 2500, poor: 3200, replace: 4000 },
      },
      rewire: {
        id: 'rewire',
        label: 'Whole House Rewire',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 6,
        options: { good: 4, fair: 6, poor: 8, replace: 12 },
      },
      outletsAndSwitches: {
        id: 'outletsAndSwitches',
        label: 'Outlets & Switches',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 75,
        options: { good: 50, fair: 75, poor: 100, replace: 150 },
      },
      lightFixtures: {
        id: 'lightFixtures',
        label: 'Light Fixtures',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 150,
        options: { good: 100, fair: 150, poor: 200, replace: 300 },
      },
      ceilingFans: {
        id: 'ceilingFans',
        label: 'Ceiling Fans (FL Essential)',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 250,
        options: { good: 175, fair: 250, poor: 350, replace: 450 },
      },
    },
  },

  // -------------------------------------------------------------------------
  // 8. HVAC (4 items)
  // -------------------------------------------------------------------------
  hvac: {
    title: 'HVAC',
    icon: 'Wind',
    displayOrder: 7,
    items: {
      acSystem: {
        id: 'acSystem',
        label: 'AC System (3-ton)',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 6500,
        options: { good: 5000, fair: 6500, poor: 8000, replace: 10000 },
      },
      furnaceHeatPump: {
        id: 'furnaceHeatPump',
        label: 'Furnace/Heat Pump',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 4500,
        options: { good: 3500, fair: 4500, poor: 6000, replace: 7500 },
      },
      ductwork: {
        id: 'ductwork',
        label: 'Ductwork Repair/Replace',
        unit: 'linear_ft',
        unitName: 'LF',
        defaultUnitCost: 35,
        options: { good: 25, fair: 35, poor: 50, replace: 70 },
      },
      miniSplit: {
        id: 'miniSplit',
        label: 'Mini-Split System (FL Popular)',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 3500,
        options: { good: 2800, fair: 3500, poor: 4500, replace: 5500 },
      },
    },
  },

  // -------------------------------------------------------------------------
  // 9. INTERIOR FINISHES (6 items)
  // -------------------------------------------------------------------------
  interior: {
    title: 'Interior Finishes',
    icon: 'PaintBucket',
    displayOrder: 8,
    items: {
      drywall: {
        id: 'drywall',
        label: 'Drywall Repair/Install',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 3.5,
        options: { good: 2, fair: 3.5, poor: 5, replace: 7 },
      },
      interiorPaint: {
        id: 'interiorPaint',
        label: 'Interior Paint',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 2.5,
        options: { good: 1.5, fair: 2.5, poor: 3.5, replace: 4.5 },
      },
      baseboardsTrim: {
        id: 'baseboardsTrim',
        label: 'Baseboards & Trim',
        unit: 'linear_ft',
        unitName: 'LF',
        defaultUnitCost: 6,
        options: { good: 4, fair: 6, poor: 8, replace: 12 },
      },
      crownMolding: {
        id: 'crownMolding',
        label: 'Crown Molding',
        unit: 'linear_ft',
        unitName: 'LF',
        defaultUnitCost: 10,
        options: { good: 7, fair: 10, poor: 14, replace: 20 },
      },
      closets: {
        id: 'closets',
        label: 'Closet Shelving/Organizers',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 350,
        options: { good: 200, fair: 350, poor: 500, replace: 750 },
      },
      insulation: {
        id: 'insulation',
        label: 'Insulation (Blown-in)',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 2,
        options: { good: 1.25, fair: 2, poor: 3, replace: 4 },
      },
    },
  },

  // -------------------------------------------------------------------------
  // 10. FLOORING (5 items)
  // -------------------------------------------------------------------------
  flooring: {
    title: 'Flooring',
    icon: 'Square',
    displayOrder: 9,
    items: {
      lvpFlooring: {
        id: 'lvpFlooring',
        label: 'LVP Flooring (Waterproof)',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 6,
        options: { good: 4, fair: 6, poor: 8, replace: 10 },
      },
      tileCeramic: {
        id: 'tileCeramic',
        label: 'Ceramic Tile',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 12,
        options: { good: 8, fair: 12, poor: 16, replace: 22 },
      },
      hardwood: {
        id: 'hardwood',
        label: 'Hardwood (Refinish/Install)',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 8,
        options: { good: 5, fair: 8, poor: 12, replace: 18 },
      },
      carpet: {
        id: 'carpet',
        label: 'Carpet (w/ Pad)',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 4,
        options: { good: 2.5, fair: 4, poor: 6, replace: 8 },
      },
      floorPrep: {
        id: 'floorPrep',
        label: 'Floor Prep/Leveling',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 3,
        options: { good: 2, fair: 3, poor: 5, replace: 8 },
      },
    },
  },

  // -------------------------------------------------------------------------
  // 11. KITCHEN (6 items)
  // -------------------------------------------------------------------------
  kitchen: {
    title: 'Kitchen',
    icon: 'ChefHat',
    displayOrder: 10,
    items: {
      cabinets: {
        id: 'cabinets',
        label: 'Kitchen Cabinets',
        unit: 'linear_ft',
        unitName: 'LF',
        defaultUnitCost: 250,
        options: { good: 150, fair: 250, poor: 400, replace: 600 },
      },
      countertops: {
        id: 'countertops',
        label: 'Countertops (Granite/Quartz)',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 65,
        options: { good: 45, fair: 65, poor: 90, replace: 125 },
      },
      backsplash: {
        id: 'backsplash',
        label: 'Backsplash Tile',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 18,
        options: { good: 12, fair: 18, poor: 25, replace: 35 },
      },
      appliances: {
        id: 'appliances',
        label: 'Appliance Package (4-pc)',
        unit: 'lump',
        unitName: 'LS',
        defaultUnitCost: 3500,
        options: { good: 2500, fair: 3500, poor: 4500, replace: 6000 },
      },
      kitchenSink: {
        id: 'kitchenSink',
        label: 'Kitchen Sink & Faucet',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 450,
        options: { good: 300, fair: 450, poor: 600, replace: 800 },
      },
      rangeHood: {
        id: 'rangeHood',
        label: 'Range Hood/Vent',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 350,
        options: { good: 200, fair: 350, poor: 500, replace: 750 },
      },
    },
  },

  // -------------------------------------------------------------------------
  // 12. BATHROOMS (6 items)
  // -------------------------------------------------------------------------
  bathrooms: {
    title: 'Bathrooms',
    icon: 'Bath',
    displayOrder: 11,
    items: {
      vanity: {
        id: 'vanity',
        label: 'Vanity w/ Top & Faucet',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 650,
        options: { good: 400, fair: 650, poor: 900, replace: 1200 },
      },
      toilet: {
        id: 'toilet',
        label: 'Toilet',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 350,
        options: { good: 250, fair: 350, poor: 450, replace: 600 },
      },
      tubShower: {
        id: 'tubShower',
        label: 'Tub/Shower Combo',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 1200,
        options: { good: 800, fair: 1200, poor: 1600, replace: 2200 },
      },
      bathroomTile: {
        id: 'bathroomTile',
        label: 'Bathroom Tile (Floor & Walls)',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 15,
        options: { good: 10, fair: 15, poor: 22, replace: 30 },
      },
      bathroomFixtures: {
        id: 'bathroomFixtures',
        label: 'Fixtures (Towel Bars, TP Holder)',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 75,
        options: { good: 50, fair: 75, poor: 100, replace: 150 },
      },
      exhaustFan: {
        id: 'exhaustFan',
        label: 'Exhaust Fan',
        unit: 'each',
        unitName: 'each',
        defaultUnitCost: 175,
        options: { good: 125, fair: 175, poor: 250, replace: 350 },
      },
    },
  },

  // -------------------------------------------------------------------------
  // 13. PERMITS & MISC (4 items)
  // -------------------------------------------------------------------------
  permits: {
    title: 'Permits & Misc',
    icon: 'FileCheck',
    displayOrder: 12,
    items: {
      buildingPermit: {
        id: 'buildingPermit',
        label: 'Building Permit',
        unit: 'lump',
        unitName: 'LS',
        defaultUnitCost: 1500,
        options: { good: 800, fair: 1500, poor: 2500, replace: 4000 },
      },
      inspections: {
        id: 'inspections',
        label: 'Inspections (4-point, Wind Mit)',
        unit: 'lump',
        unitName: 'LS',
        defaultUnitCost: 500,
        options: { good: 300, fair: 500, poor: 750, replace: 1000 },
      },
      landscaping: {
        id: 'landscaping',
        label: 'Basic Landscaping/Cleanup',
        unit: 'lump',
        unitName: 'LS',
        defaultUnitCost: 1500,
        options: { good: 800, fair: 1500, poor: 2500, replace: 4000 },
      },
      cleaning: {
        id: 'cleaning',
        label: 'Final Cleaning',
        unit: 'sq_ft',
        unitName: 'SF',
        defaultUnitCost: 0.5,
        options: { good: 0.35, fair: 0.5, poor: 0.75, replace: 1 },
      },
    },
  },
};

// Verification totals (for documentation)
// Categories: 13
// Items: 64 (4+5+5+5+4+5+5+4+6+5+6+6+4 = 64)
// Avg items/category: 4.9 (compliant with Miller's Law 7±2)

/** Helper to count total items */
export const ESTIMATOR_V2_STATS = {
  categoryCount: Object.keys(estimatorSectionsV2).length,
  itemCount: Object.values(estimatorSectionsV2).reduce(
    (sum, cat) => sum + Object.keys(cat.items).length,
    0
  ),
} as const;
