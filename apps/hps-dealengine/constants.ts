import type { EstimatorSectionDef, EstimatorState } from './types';

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
