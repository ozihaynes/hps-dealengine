// This file defines the entire structure of the Business Logic Sandbox.
// It's designed to be the single source of truth for all configurable business rules.

export type SandboxSettingDef = {
  key: string;
  pageTitle: string;
  label: string;
  description: string;
  component:
    | 'InputField'
    | 'SelectField'
    | 'ToggleSwitch'
    | 'MultiSelectChecklist'
    | 'DynamicBandEditor'
    | 'Textarea';
  props?: any;
  defaultValue: any;
};

const allSettingDefs: SandboxSettingDef[] = [
  // Page 1: Core Valuation Models
  {
    key: 'aivHardMax',
    pageTitle: 'Core Valuation Models',
    label: 'AIV (Hard Max)',
    description: 'The absolute maximum As-Is Value the system will accept, regardless of comps.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 2000000,
  },
  {
    key: 'aivHardMin',
    pageTitle: 'Core Valuation Models',
    label: 'AIV (Hard Min)',
    description: 'The absolute minimum As-Is Value the system will accept.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 10000,
  },
  {
    key: 'aivSoftMaxCompsAgeDays',
    pageTitle: 'Core Valuation Models',
    label: 'AIV (Soft Max Comps Age, Days)',
    description: 'Flags comps older than this (in days) as "stale" for AIV calculations.',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 0 },
    defaultValue: 180,
  },
  {
    key: 'aivSoftMaxVsArvMultiplier',
    pageTitle: 'Core Valuation Models',
    label: 'AIV (Soft Max vs ARV Multiplier)',
    description:
      'Flags AIV if it exceeds this multiplier of ARV (e.g., 0.9 = 90%). 1.0 = no limit.',
    component: 'InputField',
    props: { type: 'number', suffix: '(multiplier)', min: 0, max: 1.0, step: 0.01 },
    defaultValue: 0.95,
  },
  {
    key: 'aivSoftMinComps',
    pageTitle: 'Core Valuation Models',
    label: 'AIV (Soft Min Comps)',
    description: 'The minimum number of comps required to generate a high-confidence AIV.',
    component: 'InputField',
    props: { type: 'number', suffix: 'comps', min: 1 },
    defaultValue: 3,
  },
  {
    key: 'aivSoftMinCompsRadius',
    pageTitle: 'Core Valuation Models',
    label: 'AIV (Soft Min Comps Radius)',
    description: 'The default search radius (in miles) for finding AIV comps.',
    component: 'InputField',
    props: { type: 'number', suffix: 'miles', min: 0.1 },
    defaultValue: 1,
  },
  {
    key: 'aivCapOverrideApprovalRole',
    pageTitle: 'Core Valuation Models',
    label: 'AIV Cap Override Approval Role',
    description:
      "The minimum user role (e.g., 'VP') required to approve an AIV that exceeds the soft cap.",
    component: 'SelectField',
    props: { options: ['Analyst', 'Underwriter', 'Manager', 'VP', 'Admin'] },
    defaultValue: 'VP',
  },
  {
    key: 'aivCapOverrideConditionBindableInsuranceRequired',
    pageTitle: 'Core Valuation Models',
    label: 'AIV Cap Override Condition — Bindable Insurance Required',
    description:
      'If ON, requires proof of bindable insurance before an AIV cap override can be approved.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'aivCapOverrideConditionClearTitleQuoteRequired',
    pageTitle: 'Core Valuation Models',
    label: 'AIV Cap Override Condition — Clear Title Quote Required',
    description: 'If ON, requires a clear title quote before an AIV cap override can be approved.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'aivCapOverrideConditionFastZipLiquidityRequired',
    pageTitle: 'Core Valuation Models',
    label: 'AIV Cap Override Condition — Fast ZIP Liquidity Required',
    description:
      'If ON, restricts AIV cap overrides to properties in "Fast" or "Neutral" market speed ZIP codes.',
    component: 'ToggleSwitch',
    defaultValue: false,
  },
  {
    key: 'aivCapEvidenceVpApprovalLoggingRequirement',
    pageTitle: 'Core Valuation Models',
    label: 'AIV Cap Evidence — VP Approval Logging Requirement',
    description:
      'If ON, the user approving the override must provide a written justification, which is logged.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'aivSafetyCapPercentage',
    pageTitle: 'Core Valuation Models',
    label: 'AIV Safety Cap Percentage',
    description:
      'A global, final "safety" percentage reduction applied to the calculated AIV (e.g., 3%).',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0, step: 0.1 },
    defaultValue: 3,
  },
  {
    key: 'aivAsisModelingRetailRepairFrictionMethod',
    pageTitle: 'Core Valuation Models',
    label: 'AIV_asIs Modeling — Retail Repair Friction Method',
    description:
      "The formula used to model the 'repair friction' or discount a retail buyer applies to an un-repaired (As-Is) property.",
    component: 'SelectField',
    props: {
      options: ['Percentage of Repairs', 'Fixed Friction Amount', 'Blended (Repair % + Fixed)'],
    },
    defaultValue: 'Percentage of Repairs',
  },
  {
    key: 'arvCompsSetSizeForMedian',
    pageTitle: 'Core Valuation Models',
    label: 'ARV (Comps Set Size for Median)',
    description: 'The number of comps (e.g., 3 or 5) to use when calculating the median ARV.',
    component: 'InputField',
    props: { type: 'number', suffix: 'comps', min: 3 },
    defaultValue: 3,
  },
  {
    key: 'arvHardMax',
    pageTitle: 'Core Valuation Models',
    label: 'ARV (Hard Max)',
    description: 'The absolute maximum After-Repair Value the system will accept.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 3000000,
  },
  {
    key: 'arvHardMin',
    pageTitle: 'Core Valuation Models',
    label: 'ARV (Hard Min)',
    description: 'The absolute minimum After-Repair Value the system will accept.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 20000,
  },
  {
    key: 'arvMinComps',
    pageTitle: 'Core Valuation Models',
    label: 'ARV (Min Comps)',
    description: 'The minimum number of comps required to generate a high-confidence ARV.',
    component: 'InputField',
    props: { type: 'number', suffix: 'comps', min: 1 },
    defaultValue: 3,
  },
  {
    key: 'arvSoftMaxCompsAgeDays',
    pageTitle: 'Core Valuation Models',
    label: 'ARV (Soft Max Comps Age, Days)',
    description: 'Flags comps older than this (in days) as "stale" for ARV calculations.',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 0 },
    defaultValue: 180,
  },
  {
    key: 'arvSoftMaxVsAivMultiplier',
    pageTitle: 'Core Valuation Models',
    label: 'ARV (Soft Max vs AIV Multiplier)',
    description:
      'Flags ARV if it is less than this multiplier of AIV (e.g., 1.1 = 110%). 1.0 = no limit.',
    component: 'InputField',
    props: { type: 'number', suffix: '(multiplier)', min: 1.0, step: 0.01 },
    defaultValue: 1.1,
  },
  {
    key: 'buyerCeilingFormulaDefinition',
    pageTitle: 'Core Valuation Models',
    label: 'Buyer Ceiling Formula — Definition',
    description:
      'The master formula for Buyer Ceiling. Use variables like {ARV}, {AIV}, {REPAIRS}, {MARGIN}, {COSTS}.',
    component: 'Textarea',
    defaultValue: '({ARV} * (1 - {MARGIN})) - {REPAIRS} - {COSTS}',
  },
  {
    key: 'domHardMax',
    pageTitle: 'Core Valuation Models',
    label: 'DOM (Hard Max)',
    description:
      'The system will flag any property with ZIP-level Days On Market (DOM) exceeding this value.',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 0 },
    defaultValue: 180,
  },
  {
    key: 'domHardMin',
    pageTitle: 'Core Valuation Models',
    label: 'DOM (Hard Min)',
    description: 'The minimum DOM to be considered valid data.',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 0 },
    defaultValue: 1,
  },
  {
    key: 'domSoftMaxWarning',
    pageTitle: 'Core Valuation Models',
    label: 'DOM (Soft Max Warning)',
    description: "The system will show a 'slow market' warning for ZIPs with DOM above this value.",
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 0 },
    defaultValue: 90,
  },
  {
    key: 'domSoftMinWarning',
    pageTitle: 'Core Valuation Models',
    label: 'DOM (Soft Min Warning)',
    description:
      "The system will show an 'illiquid market' warning for ZIPs with DOM below this value.",
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 0 },
    defaultValue: 10,
  },
  {
    key: 'investorBenchmarkModelPostureSelectionMode',
    pageTitle: 'Core Valuation Models',
    label: 'Investor Benchmark Model — Posture Selection Mode (P30/P40/P50)',
    description:
      "Maps the selected underwriting posture (e.g., 'Conservative') to a specific data percentile (e.g., 'P30').",
    component: 'DynamicBandEditor',
    props: {
      columns: [
        {
          key: 'posture',
          label: 'Posture',
          type: 'select',
          options: ['Conservative', 'Base', 'Aggressive'],
        },
        {
          key: 'percentile',
          label: 'Percentile',
          type: 'select',
          options: ['P30', 'P40', 'P50', 'P60'],
        },
      ],
      newRowDefaults: { posture: 'Base', percentile: 'P50' },
    },
    defaultValue: [
      { id: 1, posture: 'Conservative', percentile: 'P30' },
      { id: 2, posture: 'Base', percentile: 'P40' },
      { id: 3, posture: 'Aggressive', percentile: 'P50' },
    ],
  },
  {
    key: 'maoCalculationMethodArvAivMultiplierSelection',
    pageTitle: 'Core Valuation Models',
    label: 'MAO Calculation Method — ARV/AIV Multiplier Selection',
    description:
      'Selects the primary value (ARV or AIV) that the core MAO (Max Allowable Offer) formula is based on.',
    component: 'SelectField',
    props: { options: ['ARV-Based', 'AIV-Based', 'Blended (Avg)', 'Min(ARV, AIV)'] },
    defaultValue: 'ARV-Based',
  },
  {
    key: 'moiHardMax',
    pageTitle: 'Core Valuation Models',
    label: 'MOI (Hard Max)',
    description:
      'The system will flag any property with ZIP-level Months of Inventory (MOI) exceeding this value.',
    component: 'InputField',
    props: { type: 'number', suffix: 'months', min: 0 },
    defaultValue: 8,
  },
  {
    key: 'moiHardMin',
    pageTitle: 'Core Valuation Models',
    label: 'MOI (Hard Min)',
    description: 'The minimum MOI to be considered valid data.',
    component: 'InputField',
    props: { type: 'number', suffix: 'months', min: 0 },
    defaultValue: 0.5,
  },
  {
    key: 'moiSoftMaxWarning',
    pageTitle: 'Core Valuation Models',
    label: 'MOI (Soft Max Warning)',
    description: "The system will show a 'slow market' warning for ZIPs with MOI above this value.",
    component: 'InputField',
    props: { type: 'number', suffix: 'months', min: 0 },
    defaultValue: 5,
  },
  {
    key: 'moiSoftMinWarning',
    pageTitle: 'Core Valuation Models',
    label: 'MOI (Soft Min Warning)',
    description: "The system will show a 'hot market' warning for ZIPs with MOI below this value.",
    component: 'InputField',
    props: { type: 'number', suffix: 'months', min: 0 },
    defaultValue: 1.5,
  },
  {
    key: 'marketLiquidityInputs',
    pageTitle: 'Core Valuation Models',
    label: 'Market Liquidity Inputs — DOM_zip / MOI_zip / SP:LP_pct Inclusion Toggle',
    description: 'Select which market indicators are used to calculate the "Market Temp" gauge.',
    component: 'MultiSelectChecklist',
    props: { options: ['DOM (Zip)', 'MOI (Zip)', 'SP:LP % (Zip)', 'Local Investor Discount'] },
    defaultValue: ['DOM (Zip)', 'MOI (Zip)', 'SP:LP % (Zip)'],
  },
  {
    key: 'marketPriceTieringBracketBreakpointSource',
    pageTitle: 'Core Valuation Models',
    label: 'Market Price Tiering — Bracket Breakpoint Source',
    description:
      "Defines the data source used to create price brackets (e.g., 'Low', 'Mid', 'High') for a given ZIP code.",
    component: 'SelectField',
    props: { options: ['ZIP Code Median Price', 'County Median Price', 'Internal Model'] },
    defaultValue: 'ZIP Code Median Price',
  },
  {
    key: 'postureDefaultMode',
    pageTitle: 'Core Valuation Models',
    label: 'Posture Default Mode (Conservative/Base/Aggressive)',
    description: 'The default underwriting posture for all new deals.',
    component: 'SelectField',
    props: { options: ['Conservative', 'Base', 'Aggressive'] },
    defaultValue: 'Base',
  },
  {
    key: 'priceTieringSourceZipPriceBracketsData',
    pageTitle: 'Core Valuation Models',
    label: 'Price Tiering Source — ZIP Price Brackets Data',
    description: 'The specific data provider for the ZIP code price brackets.',
    component: 'SelectField',
    props: { options: ['Internal Data', 'CoreLogic', 'ATTOM'] },
    defaultValue: 'Internal Data',
  },
  {
    key: 'providerSelectorCountyOfficialRecords',
    pageTitle: 'Core Valuation Models',
    label: 'Provider Selector — County Official Records (Cash Deeds Join)',
    description: 'The data provider for cash deed and official records data.',
    component: 'SelectField',
    props: { options: ['PropStream', 'ATTOM', 'CoreLogic', 'RealQuest'] },
    defaultValue: 'PropStream',
  },
  {
    key: 'providerSelectorMlsCompsDataSource',
    pageTitle: 'Core Valuation Models',
    label: 'Provider Selector — MLS/Comps Data Source',
    description: 'The primary data provider for all MLS and comps data.',
    component: 'SelectField',
    props: { options: ['StellarMLS', 'PropStream', 'ATTOM', 'Internal CMA Tool'] },
    defaultValue: 'PropStream',
  },
  {
    key: 'providerSelectorZipMetrics',
    pageTitle: 'Core Valuation Models',
    label: 'Provider Selector — ZIP Metrics (DOM, MOI, Price-to-List, Investor Discounts)',
    description: 'The data provider for ZIP-code-level market statistics.',
    component: 'SelectField',
    props: { options: ['Realtor.com', 'PropStream', 'ATTOM', 'Internal Data'] },
    defaultValue: 'Internal Data',
  },
  {
    key: 'retailRepairFrictionPercentage',
    pageTitle: 'Core Valuation Models',
    label: 'Retail Repair Friction Percentage (AIV_asIs Modeling)',
    description:
      "The default percentage of repairs to use as 'friction' if the 'Percentage of Repairs' method is selected.",
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 15,
  },
  {
    key: 'speedBandsBalancedMaxDom',
    pageTitle: 'Core Valuation Models',
    label: 'Speed Bands (Balanced, Max DOM)',
    description:
      'The maximum DOM for a ZIP to be considered "Balanced." Anything higher is "Slow."',
    component: 'InputField',
    props: { type: 'number', suffix: 'days' },
    defaultValue: 60,
  },
  {
    key: 'speedBandsBalancedMaxMoi',
    pageTitle: 'Core Valuation Models',
    label: 'Speed Bands (Balanced, Max MOI)',
    description:
      'The maximum MOI for a ZIP to be considered "Balanced." Anything higher is "Slow."',
    component: 'InputField',
    props: { type: 'number', suffix: 'months' },
    defaultValue: 3,
  },
  {
    key: 'speedBandsFastMaxDom',
    pageTitle: 'Core Valuation Models',
    label: 'Speed Bands (Fast, Max DOM)',
    description:
      'The maximum DOM for a ZIP to be considered "Fast." Anything higher is "Balanced."',
    component: 'InputField',
    props: { type: 'number', suffix: 'days' },
    defaultValue: 30,
  },
  {
    key: 'speedBandsFastMaxMoi',
    pageTitle: 'Core Valuation Models',
    label: 'Speed Bands (Fast, Max MOI)',
    description:
      'The maximum MOI for a ZIP to be considered "Fast." Anything higher is "Balanced."',
    component: 'InputField',
    props: { type: 'number', suffix: 'months' },
    defaultValue: 1.5,
  },
  {
    key: 'speedBandsSlowMinDom',
    pageTitle: 'Core Valuation Models',
    label: 'Speed Bands (Slow, Min DOM)',
    description:
      'The minimum DOM for a ZIP to be considered "Slow." (This is the same as \'Balanced, Max DOM\').',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', disabled: true },
    defaultValue: 60,
  },
  {
    key: 'speedBandsSlowMinMoi',
    pageTitle: 'Core Valuation Models',
    label: 'Speed Bands (Slow, Min MOI)',
    description:
      'The minimum MOI for a ZIP to be considered "Slow." (This is the same as \'Balanced, Max MOI\').',
    component: 'InputField',
    props: { type: 'number', suffix: 'months', disabled: true },
    defaultValue: 3,
  },
  {
    key: 'zipSpeedBandDerivationMethod',
    pageTitle: 'Core Valuation Models',
    label: 'ZIP Speed Band Derivation Method — From DOM/MOI',
    description: 'The logic to combine DOM and MOI into a single "Speed Band" rating.',
    component: 'SelectField',
    props: {
      options: [
        'Use Most Conservative (Slowest)',
        'Use Most Aggressive (Fastest)',
        'Use Blended Average',
      ],
    },
    defaultValue: 'Use Most Conservative (Slowest)',
  },

  // Page 2: Floor & Ceiling Formulas
  {
    key: 'ceilingSelectionConservativeUsesMin',
    pageTitle: 'Floor & Ceiling Formulas',
    label: 'Ceiling Selection — Conservative Uses Min of Eligible when Data Thin',
    description:
      "If ON, when comp data is thin, the 'Conservative' posture will use the absolute minimum of all eligible ceilings.",
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'ceilingSelectionHighestEligibleInBase',
    pageTitle: 'Floor & Ceiling Formulas',
    label: 'Ceiling Selection — Highest Eligible in Base',
    description:
      "If ON, the 'Base' posture will use the highest calculated ceiling (e.g., max of P30, P40, P50).",
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'ceilingSelectionPostureControls',
    pageTitle: 'Floor & Ceiling Formulas',
    label: 'Ceiling Selection — Posture (P30/P40/P50) Controls',
    description:
      "If ON, allows the 'Posture' selection (Conservative/Base/Aggressive) to control the P-value (P30/P40/P50) used.",
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'floorInvestorAivDiscountP20Zip',
    pageTitle: 'Floor & Ceiling Formulas',
    label: 'Floor, Investor (AIV Discount, P20 ZIP)',
    description:
      'The AIV discount percentage to use when calculating the Investor Floor in a P20 (slowest 20%) ZIP code.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 25,
  },
  {
    key: 'floorInvestorAivDiscountTypicalZip',
    pageTitle: 'Floor & Ceiling Formulas',
    label: 'Floor, Investor (AIV Discount, Typical ZIP)',
    description:
      'The standard AIV discount percentage for calculating the Investor Floor in a typical (P21-P80) ZIP code.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 15,
  },
  {
    key: 'floorPayoffMinRetainedEquityPercentage',
    pageTitle: 'Floor & Ceiling Formulas',
    label: 'Floor, Payoff (Min Retained Equity Percentage)',
    description:
      'The minimum percentage of equity (based on AIV) that a seller *must* retain, added on top of their payoff. 0% = payoff only.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 0,
  },
  {
    key: 'floorPayoffMoveOutCashDefault',
    pageTitle: 'Floor & Ceiling Formulas',
    label: 'Floor, Payoff (Move-Out Cash, Default)',
    description:
      'The default "cash for keys" or move-out assistance amount to add to the Payoff Floor.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 0,
  },
  {
    key: 'floorPayoffMoveOutCashMax',
    pageTitle: 'Floor & Ceiling Formulas',
    label: 'Floor, Payoff (Move-Out Cash, Max)',
    description: 'The maximum allowable "cash for keys" amount.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 5000,
  },
  {
    key: 'floorPayoffMoveOutCashMin',
    pageTitle: 'Floor & Ceiling Formulas',
    label: 'Floor, Payoff (Move-Out Cash, Min)',
    description: 'The minimum allowable "cash for keys" amount (can be 0).',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 0,
  },
  {
    key: 'investorFloorCompositionComponentsToggle',
    pageTitle: 'Floor & Ceiling Formulas',
    label: 'Investor Floor Composition — Components Toggle',
    description:
      "Select which components are *allowed* to be part of the 'Investor Floor' calculation.",
    component: 'MultiSelectChecklist',
    props: {
      options: ['AIV Discount', 'Local Investor Discount', 'Hard Cost Floor', 'P20 ZIP Discount'],
    },
    defaultValue: ['AIV Discount', 'Local Investor Discount'],
  },
  {
    key: 'respectFloorCompositionInvestorFloorVsPayoff',
    pageTitle: 'Floor & Ceiling Formulas',
    label: 'Respect Floor Composition — Investor Floor vs PayoffClose + Essentials',
    description:
      "If ON, the 'Respect Floor' will be the MAX of (Investor Floor, PayoffClose + Essentials). If OFF, it will be one or the other.",
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'respectFloorFormulaComponentSelector',
    pageTitle: 'Floor & Ceiling Formulas',
    label: 'Respect Floor Formula — Component Selector',
    description:
      "Selects the *final* formula used to determine the 'Respect Floor' (the lowest offer we'll make).",
    component: 'SelectField',
    props: {
      options: ['Max(Payoff Floor, Investor Floor)', 'Investor Floor Only', 'Payoff Floor Only'],
    },
    defaultValue: 'Max(Payoff Floor, Investor Floor)',
  },

  // Page 3: Cost & Expense Models
  {
    key: 'allocationToggleBuyerVsSeller',
    pageTitle: 'Cost & Expense Models',
    label: 'Allocation Toggle — Buyer vs Seller Paid Closing Costs',
    description:
      'Sets the default allocation model for closing costs when generating a Seller Net Sheet.',
    component: 'SelectField',
    props: {
      options: [
        'Buyer Pays All',
        'Seller Pays All',
        'Standard (Local Custom Split)',
        "Seller Pays Owner's Title/Stamps",
      ],
    },
    defaultValue: 'Standard (Local Custom Split)',
  },
  {
    key: 'buyerCostsAllocationDefaultSellerPays',
    pageTitle: 'Cost & Expense Models',
    label: 'Buyer Costs Allocation — Default Seller Pays Deed Stamps & Owner’s Title',
    description:
      'If ON, the "Standard Split" calculation will assume the Seller pays for Deed Stamps and the Owner\'s Title Policy.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'buyerCostsTitleQuoteEvidenceRequirement',
    pageTitle: 'Cost & Expense Models',
    label: 'Buyer Costs — Title Quote Evidence (PDF) Requirement',
    description:
      'If ON, the "Buyer Costs" calculation is locked until a Title Quote PDF is attached to the deal.',
    component: 'ToggleSwitch',
    defaultValue: false,
  },
  {
    key: 'carryMonthsFormulaDefinition',
    pageTitle: 'Cost & Expense Models',
    label: 'Carry Months — Formula Definition (DOM-based)',
    description:
      'A simple formula to calculate hold time (in months) based on market DOM. e.g., (({DOM_zip} * 1.5) + 30) / 30.',
    component: 'Textarea',
    defaultValue: '(({DOM_zip} * 1.5) + 30) / 30',
  },
  {
    key: 'carryMonthsMaximumCap',
    pageTitle: 'Cost & Expense Models',
    label: 'Carry Months — Maximum Cap',
    description:
      'The maximum number of months of carry cost to ever include in a calculation, regardless of the formula.',
    component: 'InputField',
    props: { type: 'number', suffix: 'months', min: 0 },
    defaultValue: 12,
  },
  {
    key: 'holdCostsFlipFastZip',
    pageTitle: 'Cost & Expense Models',
    label: 'Hold Costs, Flip (Fast ZIP)',
    description: 'The estimated monthly holding cost (as % of ARV) for a Flip in a "Fast" market.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 1.0,
  },
  {
    key: 'holdCostsFlipNeutralZip',
    pageTitle: 'Cost & Expense Models',
    label: 'Hold Costs, Flip (Neutral ZIP)',
    description:
      'The estimated monthly holding cost (as % of ARV) for a Flip in a "Neutral" market.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 1.25,
  },
  {
    key: 'holdCostsFlipSlowZip',
    pageTitle: 'Cost & Expense Models',
    label: 'Hold Costs, Flip (Slow ZIP)',
    description: 'The estimated monthly holding cost (as % of ARV) for a Flip in a "Slow" market.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 1.5,
  },
  {
    key: 'holdCostsWholetailFastZip',
    pageTitle: 'Cost & Expense Models',
    label: 'Hold Costs, Wholetail (Fast ZIP)',
    description:
      'The estimated monthly holding cost (as % of ARV) for a Wholetail in a "Fast" market.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 0.5,
  },
  {
    key: 'holdCostsWholetailNeutralZip',
    pageTitle: 'Cost & Expense Models',
    label: 'Hold Costs, Wholetail (Neutral ZIP)',
    description:
      'The estimated monthly holding cost (as % of ARV) for a Wholetail in a "Neutral" market.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 0.75,
  },
  {
    key: 'holdCostsWholetailSlowZip',
    pageTitle: 'Cost & Expense Models',
    label: 'Hold Costs, Wholetail (Slow ZIP)',
    description:
      'The estimated monthly holding cost (as % of ARV) for a Wholetail in a "Slow" market.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 1.0,
  },
  {
    key: 'holdingCostsMonthlyDefaultHoa',
    pageTitle: 'Cost & Expense Models',
    label: 'Holding Costs, Monthly (Default HOA)',
    description: 'The default monthly HOA fee to use when the actual value is unknown.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 50,
  },
  {
    key: 'holdingCostsMonthlyDefaultInsurance',
    pageTitle: 'Cost & Expense Models',
    label: 'Holding Costs, Monthly (Default Insurance)',
    description:
      'The default monthly insurance premium (P&I) to use when the actual value is unknown.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 150,
  },
  {
    key: 'holdingCostsMonthlyDefaultTaxes',
    pageTitle: 'Cost & Expense Models',
    label: 'Holding Costs, Monthly (Default Taxes)',
    description: 'The default monthly property tax to use when the actual value is unknown.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 400,
  },
  {
    key: 'holdingCostsMonthlyDefaultUtilities',
    pageTitle: 'Cost & Expense Models',
    label: 'Holding Costs, Monthly (Default Utilities)',
    description:
      'The default monthly utilities (electric, water, gas) to use when the actual value is unknown.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 200,
  },
  {
    key: 'listingCostModelSellerCostLineItems',
    pageTitle: 'Cost & Expense Models',
    label: 'Listing Cost Model — Seller Cost Line Items (Configurable)',
    description:
      'Define the line-item costs (and their default values) used to calculate total Resale Costs.',
    component: 'DynamicBandEditor',
    props: {
      columns: [
        { key: 'item', label: 'Item Name', type: 'text' },
        { key: 'defaultPct', label: 'Default Value (% of ARV)', type: 'number' },
        { key: 'defaultFixed', label: 'Default Value (Fixed $)', type: 'number' },
      ],
      newRowDefaults: { item: '', defaultPct: 0, defaultFixed: 0 },
    },
    defaultValue: [
      { id: 1, item: 'Commissions', defaultPct: 6, defaultFixed: 0 },
      { id: 2, item: 'Seller Concessions', defaultPct: 2, defaultFixed: 0 },
      { id: 3, item: 'Title & Stamps', defaultPct: 1.5, defaultFixed: 0 },
    ],
  },
  {
    key: 'repairsHardMax',
    pageTitle: 'Cost & Expense Models',
    label: 'Repairs (Hard Max)',
    description: 'The absolute maximum repair budget the system will accept.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 500000,
  },
  {
    key: 'repairsHardMin',
    pageTitle: 'Cost & Expense Models',
    label: 'Repairs (Hard Min)',
    description: "The absolute minimum repair budget (e.g., for a 'trash out').",
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 0,
  },
  {
    key: 'repairsSoftMaxVsArvPercentage',
    pageTitle: 'Cost & Expense Models',
    label: 'Repairs (Soft Max vs ARV Percentage)',
    description: 'Flags a repair budget that exceeds this percentage of ARV (e.g., 50%).',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 50,
  },
  {
    key: 'repairsContingencyBidsMissing',
    pageTitle: 'Cost & Expense Models',
    label: 'Repairs Contingency (Bids Missing, Additional Percentage)',
    description:
      'An *additional* contingency percentage to add *on top* of the class-based contingency if no repair bids are attached.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 10,
  },
  {
    key: 'repairsContingencyHeavyScope',
    pageTitle: 'Cost & Expense Models',
    label: 'Repairs Contingency (Heavy Scope)',
    description: 'The default contingency percentage for deals marked as "Heavy Scope."',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 20,
  },
  {
    key: 'repairsContingencyLightScope',
    pageTitle: 'Cost & Expense Models',
    label: 'Repairs Contingency (Light Scope)',
    description: 'The default contingency percentage for deals marked as "Light Scope."',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 10,
  },
  {
    key: 'repairsContingencyMediumScope',
    pageTitle: 'Cost & Expense Models',
    label: 'Repairs Contingency (Medium Scope)',
    description: 'The default contingency percentage for deals marked as "Medium Scope."',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 15,
  },
  {
    key: 'repairsContingencyPercentageByClass',
    pageTitle: 'Cost & Expense Models',
    label: 'Repairs Contingency Percentage by Class',
    description:
      'The *default* contingency percentage to add based on the Repair Class (defined in Workflow).',
    component: 'DynamicBandEditor',
    props: {
      columns: [
        {
          key: 'repairClass',
          label: 'Repair Class',
          type: 'select',
          options: ['Light', 'Medium', 'Heavy', 'Structural'],
        },
        { key: 'contingency', label: 'Contingency (%)', type: 'number' },
      ],
      newRowDefaults: { repairClass: 'Light', contingency: 10 },
    },
    defaultValue: [
      { id: 1, repairClass: 'Light', contingency: 10 },
      { id: 2, repairClass: 'Medium', contingency: 15 },
      { id: 3, repairClass: 'Heavy', contingency: 20 },
      { id: 4, repairClass: 'Structural', contingency: 25 },
    ],
  },
  {
    key: 'repairsEvidenceBidsScopeAttachmentRequirement',
    pageTitle: 'Cost & Expense Models',
    label: 'Repairs Evidence — Bids/Scope Attachment Requirement',
    description:
      "If ON, the 'Repairs' input is locked until a repair bid or scope of work is attached.",
    component: 'ToggleSwitch',
    defaultValue: false,
  },
  {
    key: 'retailListingCostPercentage',
    pageTitle: 'Cost & Expense Models',
    label: 'Retail Listing Cost Percentage (sell_close_pct) — Seller Costs',
    description:
      "The total percentage for *seller's* closing costs (e.g., commissions, title, stamps) on a retail list.",
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 8,
  },
  {
    key: 'retailMakeReadyPerRepairClass',
    pageTitle: 'Cost & Expense Models',
    label: 'Retail Make-Ready — Per Repair Class Input',
    description:
      'The default "make-ready" cost (in $) for a retail listing, based on the repair class.',
    component: 'DynamicBandEditor',
    props: {
      columns: [
        {
          key: 'repairClass',
          label: 'Repair Class',
          type: 'select',
          options: ['Light', 'Medium', 'Heavy', 'Structural'],
        },
        { key: 'makeReadyCost', label: 'Make-Ready Cost ($)', type: 'number' },
      ],
      newRowDefaults: { repairClass: 'Light', makeReadyCost: 1500 },
    },
    defaultValue: [
      { id: 1, repairClass: 'Light', makeReadyCost: 1500 },
      { id: 2, repairClass: 'Medium', makeReadyCost: 2500 },
      { id: 3, repairClass: 'Heavy', makeReadyCost: 4000 },
    ],
  },
  {
    key: 'sellerConcessionsCreditsHandlingPolicy',
    pageTitle: 'Cost & Expense Models',
    label: 'Seller Concessions/Credits Handling Policy',
    description:
      'How to treat seller concessions in the model. Are they a cost, or do they reduce the net offer?',
    component: 'SelectField',
    props: { options: ['Treat as Resale Cost', 'Reduce Net Offer', 'Do Not Model'] },
    defaultValue: 'Treat as Resale Cost',
  },
  {
    key: 'sellerNetRetailMakeReadyInputs',
    pageTitle: 'Cost & Expense Models',
    label: 'Seller Net (Retail) Make-Ready Inputs — Wholetail/List Paths',
    description:
      "If ON, includes 'Make-Ready' costs in the Seller Net calculation for Wholetail and List paths.",
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'sourcesEvidenceTitleQuotePdfItemizationRequirement',
    pageTitle: 'Cost & Expense Models',
    label: 'Sources Evidence — Title Quote PDF Itemization Requirement',
    description: 'If ON, requires the attached Title Quote PDF to be itemized for all costs.',
    component: 'ToggleSwitch',
    defaultValue: false,
  },
  {
    key: 'titleQuoteAttachmentRequiredForPublishing',
    pageTitle: 'Cost & Expense Models',
    label: 'Title Quote Attachment — Required for Publishing',
    description:
      'If ON, a deal cannot be moved to "ReadyForOffer" without an attached Title Quote.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'uninsurableAdderExtraHoldCosts',
    pageTitle: 'Cost & Expense Models',
    label: 'Uninsurable Adder (Extra Hold Costs)',
    description:
      "Additional holding cost (in months) to add to any property flagged as 'Uninsurable'.",
    component: 'InputField',
    props: { type: 'number', suffix: 'months', min: 0 },
    defaultValue: 2,
  },

  // Page 4: Debt & Payoff Logic
  {
    key: 'actual365PayoffDayCountConvention',
    pageTitle: 'Debt & Payoff Logic',
    label: 'Actual/365 Payoff Day-Count Convention',
    description:
      "The day-count convention for calculating per-diem interest. 'Actual/365' is most common.",
    component: 'SelectField',
    props: { options: ['Actual/365 (Recommended)', '30/360'] },
    defaultValue: 'Actual/365 (Recommended)',
  },
  {
    key: 'hoaEstoppelFeeCapPolicy',
    pageTitle: 'Debt & Payoff Logic',
    label: 'HOA Estoppel Fee Cap Policy',
    description:
      'The maximum HOA Estoppel Fee the system will include in the payoff. Any amount over this is flagged.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 350,
  },
  {
    key: 'hoaRushTransferFeePolicy',
    pageTitle: 'Debt & Payoff Logic',
    label: 'HOA Rush/Transfer Fee Policy',
    description: 'The maximum HOA Rush/Transfer Fee the system will include in the payoff.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 150,
  },
  {
    key: 'interestDayCountBasisDefault',
    pageTitle: 'Debt & Payoff Logic',
    label: 'Interest Day-Count Basis (Default)',
    description: 'The default interest calculation method (see Actual/365).',
    component: 'SelectField',
    props: { options: ['Actual/365', '30/360'] },
    defaultValue: 'Actual/365',
  },
  {
    key: 'paceAssessmentHandlingPayoffRequirementPolicy',
    pageTitle: 'Debt & Payoff Logic',
    label: 'PACE Assessment Handling — Payoff Requirement Policy',
    description: 'Policy on how to handle outstanding PACE liens at closing.',
    component: 'SelectField',
    props: {
      options: ['Must Be Paid in Full', 'Can Be Subordinated', 'Case-by-Case (Manual Flag)'],
    },
    defaultValue: 'Must Be Paid in Full',
  },
  {
    key: 'paceDetectionSourceTaxBillNonAdValoremSelector',
    pageTitle: 'Debt & Payoff Logic',
    label: 'PACE Detection Source — Tax Bill Non-Ad-Valorem Selector',
    description:
      'The data source used to auto-detect PACE liens from tax bill "Non-Ad-Valorem" assessments.',
    component: 'SelectField',
    props: { options: ['Tax Bill API', 'Title Quote', 'Manual Only'] },
    defaultValue: 'Tax Bill API',
  },
  {
    key: 'payoffAccrualBasisDayCountConvention',
    pageTitle: 'Debt & Payoff Logic',
    label: 'Payoff Accrual Basis — Day-Count Convention',
    description: 'The day-count convention for accruing per-diem interest on payoffs.',
    component: 'SelectField',
    props: { options: ['Actual/365', '30/360'] },
    defaultValue: 'Actual/365',
  },
  {
    key: 'payoffAccrualComponents',
    pageTitle: 'Debt & Payoff Logic',
    label: 'Payoff Accrual Components — Senior, Juniors, HOA, Municipal, PACE/UCC',
    description:
      "Select all lien types that should be included in the 'Projected Payoff' calculation.",
    component: 'MultiSelectChecklist',
    props: {
      options: [
        'Senior Lien',
        'Junior Liens',
        'HOA Arrears',
        'Municipal Fines',
        'PACE Liens',
        'UCC Filings',
      ],
    },
    defaultValue: ['Senior Lien', 'Junior Liens', 'HOA Arrears', 'Municipal Fines'],
  },
  {
    key: 'payoffLetterEvidenceRequiredAttachment',
    pageTitle: 'Debt & Payoff Logic',
    label: 'Payoff Letter Evidence — Required Attachment',
    description:
      "If ON, a deal cannot be moved to 'ReadyForOffer' without an attached Payoff Letter.",
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'perDiemAccrualInputsSeniorJuniorsUsdDay',
    pageTitle: 'Debt & Payoff Logic',
    label: 'Per-Diem Accrual Inputs — Senior/Juniors (USD/day)',
    description:
      'If ON, the system will use the per-diem $ amount. If OFF, it will calculate it from principal/interest.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'seniorPerDiemHardMax',
    pageTitle: 'Debt & Payoff Logic',
    label: 'Senior Per-Diem (Hard Max)',
    description: 'Flags any senior lien per-diem amount that exceeds this value.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 500,
  },
  {
    key: 'seniorPerDiemHardMin',
    pageTitle: 'Debt & Payoff Logic',
    label: 'Senior Per-Diem (Hard Min)',
    description: 'The minimum per-diem to be considered valid (must be > 0 if a balance exists).',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 1,
  },
  {
    key: 'seniorPerDiemSoftMaxImpliedApr',
    pageTitle: 'Debt & Payoff Logic',
    label: 'Senior Per-Diem (Soft Max Implied APR)',
    description:
      'Flags any per-diem that implies an APR (Annual Percentage Rate) higher than this value.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 25,
  },
  {
    key: 'seniorPrincipalHardMax',
    pageTitle: 'Debt & Payoff Logic',
    label: 'Senior Principal (Hard Max)',
    description: 'Flags any senior lien principal balance that exceeds this value.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 2000000,
  },
  {
    key: 'seniorPrincipalHardMin',
    pageTitle: 'Debt & Payoff Logic',
    label: 'Senior Principal (Hard Min)',
    description: 'The minimum principal balance to be considered valid (must be > 0).',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 1000,
  },
  {
    key: 'seniorPrincipalSoftMaxVsArvPercentage',
    pageTitle: 'Debt & Payoff Logic',
    label: 'Senior Principal (Soft Max vs ARV Percentage)',
    description: 'Flags any senior lien principal that exceeds this percentage of ARV (e.g., 90%).',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 90,
  },
  {
    key: 'solarLeaseUcc1GateClearanceRequirement',
    pageTitle: 'Debt & Payoff Logic',
    label: 'Solar Lease/UCC-1 Gate — Clearance Requirement',
    description: 'Policy for handling active solar leases or UCC-1 filings.',
    component: 'SelectField',
    props: {
      options: ['Must Be Paid/Terminated', 'Must Be Subordinated', 'Case-by-Case (Manual Flag)'],
    },
    defaultValue: 'Must Be Paid/Terminated',
  },
  {
    key: 'ucc1SearchSourceSelectorCountyStateRegistry',
    pageTitle: 'Debt & Payoff Logic',
    label: 'UCC-1 Search Source Selector — County & State Registry',
    description: 'The data provider for searching UCC-1 (Uniform Commercial Code) filings.',
    component: 'SelectField',
    props: { options: ['Sunbiz (FL)', 'County Registry API', 'Manual Only'] },
    defaultValue: 'Sunbiz (FL)',
  },
  {
    key: 'ucc1TerminationSubordinationClosingConditionRequirement',
    pageTitle: 'Debt & Payoff Logic',
    label: 'UCC-1 Termination/Subordination — Closing Condition Requirement',
    description:
      'If ON, requires proof of UCC-1 termination or subordination as a closing condition.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  // Page 5: Profit & Risk Policy
  {
    key: 'assignmentFeeMaxPublicizedArvPercentage',
    pageTitle: 'Profit & Risk Policy',
    label: 'Assignment Fee (Max Publicized, ARV Percentage)',
    description:
      'The maximum assignment fee (as % of ARV) that can be publicly marketed to an end buyer.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 15,
  },
  {
    key: 'assignmentFeeTarget',
    pageTitle: 'Profit & Risk Policy',
    label: 'Assignment Fee (Target)',
    description: 'The default target assignment fee to aim for on a wholesale deal.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 15000,
  },
  {
    key: 'assignmentFeeVipOverrideMaxArvPercentage',
    pageTitle: 'Profit & Risk Policy',
    label: 'Assignment Fee (VIP Override, Max ARV Percentage)',
    description:
      'The *absolute* maximum assignment fee (% of ARV) allowed for a VIP/Admin override.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 25,
  },
  {
    key: 'assignmentFeeVipOverrideMinArvPercentage',
    pageTitle: 'Profit & Risk Policy',
    label: 'Assignment Fee (VIP Override, Min ARV Percentage)',
    description: 'The *minimum* assignment fee (% of ARV) required for a VIP/Admin override.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 3,
  },
  {
    key: 'buyerSegmentationFlipperMaxMoi',
    pageTitle: 'Profit & Risk Policy',
    label: 'Buyer Segmentation (Flipper, Max MOI)',
    description:
      'The max MOI (Months of Inventory) a market can have to be considered viable for a "Flipper" buyer.',
    component: 'InputField',
    props: { type: 'number', suffix: 'months', min: 0 },
    defaultValue: 4,
  },
  {
    key: 'buyerSegmentationLandlordMinGrossYield',
    pageTitle: 'Profit & Risk Policy',
    label: 'Buyer Segmentation (Landlord, Min Gross Yield)',
    description:
      'The minimum Gross Yield (%) required for a property to be considered viable for a "Landlord" buyer.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 8,
  },
  {
    key: 'buyerSegmentationLandlordMinMoi',
    pageTitle: 'Profit & Risk Policy',
    label: 'Buyer Segmentation (Landlord, Min MOI)',
    description:
      'The minimum MOI (Months of Inventory) a market must have to be considered viable for a "Landlord" buyer.',
    component: 'InputField',
    props: { type: 'number', suffix: 'months', min: 0 },
    defaultValue: 3,
  },
  {
    key: 'buyerSegmentationWholetailMaxRepairsAsArvPercentage',
    pageTitle: 'Profit & Risk Policy',
    label: 'Buyer Segmentation (Wholetail, Max Repairs as ARV Percentage)',
    description:
      'The maximum repair cost (as % of ARV) allowed for a property to be considered a "Wholetail" deal.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 15,
  },
  {
    key: 'buyerSegmentationWholetailMinYearBuilt',
    pageTitle: 'Profit & Risk Policy',
    label: 'Buyer Segmentation (Wholetail, Min Year Built)',
    description:
      'The minimum Year Built (e.g., 1980) for a property to be considered a "Wholetail" deal.',
    component: 'InputField',
    props: { type: 'number', suffix: '(year)', min: 1900 },
    defaultValue: 1980,
  },
  {
    key: 'buyerTargetMarginFlipMoiBands',
    pageTitle: 'Profit & Risk Policy',
    label: 'Buyer Target Margin (Flip, by MOI)',
    description:
      'Defines the target profit margin for a Flip, tiered by the Market MOI (Months of Inventory).',
    component: 'DynamicBandEditor',
    props: {
      columns: [
        { key: 'bandName', label: 'Band Name', type: 'text' },
        { key: 'maxMoi', label: 'Max MOI', type: 'number' },
        { key: 'minMargin', label: 'Min Margin (%)', type: 'number' },
        { key: 'maxMargin', label: 'Max Margin (%)', type: 'number' },
      ],
      newRowDefaults: { bandName: 'Band 4', maxMoi: 99, minMargin: 20, maxMargin: 25 },
    },
    defaultValue: [
      { id: 1, bandName: 'Hot Market', maxMoi: 1.5, minMargin: 12, maxMargin: 15 },
      { id: 2, bandName: 'Balanced Market', maxMoi: 3, minMargin: 15, maxMargin: 18 },
      { id: 3, bandName: 'Slow Market', maxMoi: 5, minMargin: 18, maxMargin: 22 },
    ],
  },
  {
    key: 'buyerTargetMarginWholetailFastZip',
    pageTitle: 'Profit & Risk Policy',
    label: 'Buyer Target Margin (Wholetail, Fast ZIP)',
    description: 'The target profit margin for a Wholetail deal in a "Fast" market.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 10,
  },
  {
    key: 'buyerTargetMarginWholetailMaxPercentage',
    pageTitle: 'Profit & Risk Policy',
    label: 'Buyer Target Margin (Wholetail, Max Percentage)',
    description: 'The *maximum* acceptable margin for a Wholetail deal.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 18,
  },
  {
    key: 'buyerTargetMarginWholetailMinPercentage',
    pageTitle: 'Profit & Risk Policy',
    label: 'Buyer Target Margin (Wholetail, Min Percentage)',
    description: 'The *minimum* acceptable margin for a Wholetail deal.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 8,
  },
  {
    key: 'buyerTargetMarginWholetailNeutralZip',
    pageTitle: 'Profit & Risk Policy',
    label: 'Buyer Target Margin (Wholetail, Neutral ZIP)',
    description: 'The target profit margin for a Wholetail deal in a "Neutral" market.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 12,
  },
  {
    key: 'buyerTargetMarginWholetailSlowZip',
    pageTitle: 'Profit & Risk Policy',
    label: 'Buyer Target Margin (Wholetail, Slow ZIP)',
    description: 'The target profit margin for a Wholetail deal in a "Slow" market.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 15,
  },
  {
    key: 'buyerTargetMarginFlipBaselinePolicy',
    pageTitle: 'Profit & Risk Policy',
    label: 'Buyer Target Margin — Flip Baseline Policy',
    description:
      'The *base* target margin for a standard flip, before any MOI or ZIP speed adjustments.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 15,
  },
  {
    key: 'buyerTargetMarginMoiTierAdjusters',
    pageTitle: 'Profit & Risk Policy',
    label: 'Buyer Target Margin — MOI-Tier Adjusters',
    description: "If ON, allows the MOI-Tiers to adjust the 'Flip Baseline Policy' margin.",
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'buyerTargetMarginWholetailRangePolicy',
    pageTitle: 'Profit & Risk Policy',
    label: 'Buyer Target Margin — Wholetail Range Policy',
    description:
      "If ON, enforces the 'Min/Max Percentage' for Wholetail margins. If OFF, only uses the ZIP Speed target.",
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'concessionsLadderStep1',
    pageTitle: 'Profit & Risk Policy',
    label: 'Concessions Ladder (Step 1)',
    description: 'The default concession amount ($) for the *first* counter-offer.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 1000,
  },
  {
    key: 'concessionsLadderStep2',
    pageTitle: 'Profit & Risk Policy',
    label: 'Concessions Ladder (Step 2)',
    description: 'The default concession amount ($) for the *second* counter-offer.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 1500,
  },
  {
    key: 'concessionsLadderStep3',
    pageTitle: 'Profit & Risk Policy',
    label: 'Concessions Ladder (Step 3)',
    description: 'The default concession amount ($) for the *final* counter-offer.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 2500,
  },
  {
    key: 'counterOfferDefaultIncrement',
    pageTitle: 'Profit & Risk Policy',
    label: 'Counter-Offer (Default Increment)',
    description: 'The default $ increment to use when generating a counter-offer (e.g., $1,000).',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 1000,
  },
  {
    key: 'initialOfferSpreadMultiplier',
    pageTitle: 'Profit & Risk Policy',
    label: 'Initial Offer (Spread Multiplier)',
    description:
      'A multiplier applied to the spread (Ceiling - Floor) to determine the *initial* offer (e.g., 0.5 = 50% of the way up from the floor).',
    component: 'InputField',
    props: { type: 'number', suffix: '(multiplier)', min: 0, max: 1.0 },
    defaultValue: 0.5,
  },
  {
    key: 'maoNegotiationBandwidthAdjustmentRange',
    pageTitle: 'Profit & Risk Policy',
    label: 'MAO Negotiation Bandwidth — Adjustment Range',
    description: 'The $ amount *below* the final MAO that defines the "negotiation buffer."',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 5000,
  },
  {
    key: 'minSpreadByArvBand',
    pageTitle: 'Profit & Risk Policy',
    label: 'Spread Minimum by ARV Band Policy',
    description:
      "Defines the *absolute minimum* profit spread required, tiered by the property's ARV. This drives the 'Cash (Shortfall)' warning.",
    component: 'DynamicBandEditor',
    props: {
      columns: [
        { key: 'bandName', label: 'Band Name', type: 'text' },
        { key: 'maxArv', label: 'Max ARV ($)', type: 'number' },
        { key: 'minSpread', label: 'Min Spread ($)', type: 'number' },
        { key: 'minSpreadPct', label: 'Min Spread (%)', type: 'number' },
      ],
      newRowDefaults: { bandName: 'Band 5', maxArv: 9999999, minSpread: 50000, minSpreadPct: 8 },
    },
    defaultValue: [
      { id: 1, bandName: 'Low', maxArv: 250000, minSpread: 25000, minSpreadPct: 10 },
      { id: 2, bandName: 'Mid', maxArv: 500000, minSpread: 35000, minSpreadPct: 8 },
      { id: 3, bandName: 'High', maxArv: 750000, minSpread: 45000, minSpreadPct: 7 },
      { id: 4, bandName: 'Jumbo', maxArv: 1000000, minSpread: 60000, minSpreadPct: 6 },
    ],
  },
  {
    key: 'negotiationBufferPercentage',
    pageTitle: 'Profit & Risk Policy',
    label: 'Negotiation Buffer (Percentage)',
    description: 'A % buffer added to the MAO for negotiation room.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 2,
  },
  {
    key: 'spreadPresentationBorderlineBandHandlingPolicy',
    pageTitle: 'Profit & Risk Policy',
    label: 'Spread Presentation — Borderline Band Handling Policy',
    description:
      "How to display a deal whose spread is *above zero* but *below the minimum*. (e.g., 'Below Minimum' vs 'Warning').",
    component: 'SelectField',
    props: {
      options: ['Show as Warning (Orange)', 'Show as Negative (Red)', 'Show as OK (Green)'],
    },
    defaultValue: 'Show as Warning (Orange)',
  },
  {
    key: 'uninsurableAdderFlipMarginPercentage',
    pageTitle: 'Profit & Risk Policy',
    label: 'Uninsurable Adder (Flip Margin Percentage)',
    description: "Additional profit margin (%) to add to any property flagged as 'Uninsurable'.",
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 5,
  },
  {
    key: 'wholesaleFeeModeAssignmentVsDoubleCloseSelection',
    pageTitle: 'Profit & Risk Policy',
    label: 'Wholesale Fee Mode — Assignment vs Double-Close Selection',
    description: 'Sets the default disposition path (and fee calculation) for wholesale deals.',
    component: 'SelectField',
    props: {
      options: [
        'Default to Assignment',
        'Default to Double-Close',
        'Show Both',
        'Use Max(Assign, DC)',
      ],
    },
    defaultValue: 'Default to Assignment',
  },
  {
    key: 'wholetailMarginPolicyByZipSpeedBand',
    pageTitle: 'Profit & Risk Policy',
    label: 'Wholetail Margin Policy — By ZIP Speed Band',
    description:
      "If ON, the 'Buyer Target Margin (Wholetail, ...ZIP)' settings are used. If OFF, a single baseline is used.",
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'zipSpeedBandPostureControlsMarginHoldingAdjusters',
    pageTitle: 'Profit & Risk Policy',
    label: 'ZIP Speed Band Posture Controls — Margin & Holding Adjusters',
    description:
      "Applies automatic *adjustments* to margin and holding costs based on ZIP speed. (e.g., 'Slow' ZIP = +2% margin, +1 month hold).",
    component: 'DynamicBandEditor',
    props: {
      columns: [
        {
          key: 'zipSpeed',
          label: 'ZIP Speed',
          type: 'select',
          options: ['Fast', 'Neutral', 'Slow'],
        },
        { key: 'marginAdder', label: 'Margin Adder (%)', type: 'number' },
        { key: 'holdMonthAdder', label: 'Hold Month Adder', type: 'number' },
      ],
      newRowDefaults: { zipSpeed: 'Fast', marginAdder: 0, holdMonthAdder: 0 },
    },
    defaultValue: [
      { id: 1, zipSpeed: 'Fast', marginAdder: -2, holdMonthAdder: -1 },
      { id: 2, zipSpeed: 'Neutral', marginAdder: 0, holdMonthAdder: 0 },
      { id: 3, zipSpeed: 'Slow', marginAdder: 2, holdMonthAdder: 1 },
    ],
  },

  // Page 6: Timeline & Urgency Rules
  {
    key: 'auctionUrgencyMarginAdderPolicy',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Auction Urgency — Margin Adder Policy',
    description: 'Automatically adds a margin buffer based on how close the auction date is.',
    component: 'DynamicBandEditor',
    props: {
      columns: [
        { key: 'daysOut', label: 'Days Out (Max)', type: 'number' },
        { key: 'marginAdder', label: 'Margin Adder (%)', type: 'number' },
      ],
      newRowDefaults: { daysOut: 7, marginAdder: 5 },
    },
    defaultValue: [
      { id: 1, daysOut: 14, marginAdder: 3 },
      { id: 2, daysOut: 30, marginAdder: 1.5 },
    ],
  },
  {
    key: 'auctionUrgencyTrpMultiplierPolicy',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Auction Urgency — TRP Multiplier Policy',
    description: 'Applies a multiplier to the TRP (Title Risk Premium) based on auction proximity.',
    component: 'DynamicBandEditor',
    props: {
      columns: [
        { key: 'daysOut', label: 'Days Out (Max)', type: 'number' },
        { key: 'trpMultiplier', label: 'TRP Multiplier', type: 'number' },
      ],
      newRowDefaults: { daysOut: 7, trpMultiplier: 2 },
    },
    defaultValue: [
      { id: 1, daysOut: 14, trpMultiplier: 1.5 },
      { id: 2, daysOut: 30, trpMultiplier: 1.2 },
    ],
  },
  {
    key: 'clearToCloseBufferDays',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Clear-to-Close Buffer Days (Unresolved Title/Insurance)',
    description:
      'The number of buffer days to add to the DTM (Days-to-Money) if title or insurance is not yet clear.',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 0 },
    defaultValue: 5,
  },
  {
    key: 'daysToMoneyMaxDays',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Days-to-Money (Max Days)',
    description: 'The maximum DTM the system will allow.',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 0 },
    defaultValue: 120,
  },
  {
    key: 'daysToMoneyRollForwardRule',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Days-to-Money Roll-Forward Rule — Weekends/Holidays',
    description:
      'Policy for how to handle a calculated closing date that lands on a non-business day.',
    component: 'SelectField',
    props: {
      options: ['Roll to Next Business Day', 'Roll to Previous Business Day', 'Do Not Adjust'],
    },
    defaultValue: 'Roll to Next Business Day',
  },
  {
    key: 'daysToMoneySelectionMethod',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Days-to-Money Selection Method — Earliest Compliant Target Close',
    description: 'The logic used to determine the *default* DTM (Days-to-Money) for an offer.',
    component: 'SelectField',
    props: {
      options: [
        'Use Default Cash Close Days',
        'Use Earliest Compliant Date',
        'Use Manual Input Only',
      ],
    },
    defaultValue: 'Use Earliest Compliant Date',
  },
  {
    key: 'daysToMoneyDefaultCashCloseDays',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Days-to-Money — Default Cash Close Days',
    description: 'The standard number of days for a cash closing (e.g., 14).',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 1 },
    defaultValue: 14,
  },
  {
    key: 'defaultDaysToCashClose',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Default Days to Cash Close',
    description: 'The default DTM for a "Cash" disposition path.',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 1 },
    defaultValue: 21,
  },
  {
    key: 'defaultDaysToWholesaleClose',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Default Days to Wholesale Close',
    description: 'The default DTM for a "Wholesale" disposition path.',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 1 },
    defaultValue: 30,
  },
  {
    key: 'dispositionRecommendationListMlsMinDomZip',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Disposition Recommendation (List/MLS, Min DOM_ZIP)',
    description: 'The minimum ZIP-level DOM required to recommend a "List/MLS" disposition.',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 0 },
    defaultValue: 0,
  },
  {
    key: 'dispositionRecommendationListMlsMinDtm',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Disposition Recommendation (List/MLS, Min DTM)',
    description: 'The minimum DTM (Days-to-Money) allowed to recommend a "List/MLS" disposition.',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 0 },
    defaultValue: 45,
  },
  {
    key: 'dispositionRecommendationListMlsMinMoi',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Disposition Recommendation (List/MLS, Min MOI)',
    description: 'The minimum ZIP-level MOI required to recommend a "List/MLS" disposition.',
    component: 'InputField',
    props: { type: 'number', suffix: 'months', min: 0 },
    defaultValue: 0,
  },
  {
    key: 'dispositionRecommendationUrgentCashMaxAuctionDays',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Disposition Recommendation (Urgent/Cash, Max Auction Days)',
    description: 'The maximum number of days to an auction to still be considered "Urgent/Cash."',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 0 },
    defaultValue: 30,
  },
  {
    key: 'dispositionRecommendationUrgentCashMaxDtm',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Disposition Recommendation (Urgent/Cash, Max DTM)',
    description: 'The maximum DTM allowed to recommend an "Urgent/Cash" disposition.',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 0 },
    defaultValue: 21,
  },
  {
    key: 'dispositionRecommendationLogicDtmThresholds',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Disposition Recommendation Logic — DTM Thresholds',
    description:
      'Defines the DTM thresholds for the "Urgency Band" label (e.g., Emergency, Critical, High, Low).',
    component: 'DynamicBandEditor',
    props: {
      columns: [
        { key: 'label', label: 'Label', type: 'text' },
        { key: 'maxDtm', label: 'Max DTM (days)', type: 'number' },
      ],
      newRowDefaults: { label: 'Standard', maxDtm: 60 },
    },
    defaultValue: [
      { id: 1, label: 'Emergency', maxDtm: 10 },
      { id: 2, label: 'Critical', maxDtm: 21 },
      { id: 3, label: 'High', maxDtm: 45 },
      { id: 4, label: 'Low', maxDtm: 90 },
    ],
  },
  {
    key: 'emdTimelineDaysDeadlinePolicy',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'EMD Timeline (Days) — Deadline Policy',
    description: 'The default number of days the buyer has to deposit EMD (Earnest Money Deposit).',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 0 },
    defaultValue: 3,
  },
  {
    key: 'offerValidityPeriodDaysPolicy',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Offer Validity Period — Days Policy',
    description: 'The number of days an offer is considered valid before it expires.',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 1 },
    defaultValue: 3,
  },
  {
    key: 'rightOfFirstRefusalBoardApprovalWindowDaysInput',
    pageTitle: 'Timeline & Urgency Rules',
    label: 'Right-of-First-Refusal / Board Approval Window — Days Input',
    description:
      'The default number of buffer days to add to DTM if a Condo/HOA has a Right of First Refusal or requires board approval.',
    component: 'InputField',
    props: { type: 'number', suffix: 'days', min: 0 },
    defaultValue: 15,
  },

  // Page 7: Compliance & Risk Gates
  {
    key: 'bankruptcyStayGateLegalBlock',
    pageTitle: 'Compliance & Risk Gates',
    label: 'Bankruptcy Stay Gate (Legal Block)',
    description:
      'If ON, automatically flags and blocks any deal where the seller is in active bankruptcy.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'condoSirsMilestoneFlag',
    pageTitle: 'Compliance & Risk Gates',
    label: 'Condo SIRS/Milestone Flag (Soft Caution/Gate)',
    description:
      'If ON, flags any condo property to check for Structural Integrity Reserve Study (SIRS) and Milestone inspection compliance.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'emdPolicyEarnestMoneyStructure',
    pageTitle: 'Compliance & Risk Gates',
    label: 'EMD Policy — Earnest Money Structure (Fixed vs Percentage)',
    description: 'Sets the default EMD (Earnest Money Deposit) structure for offers.',
    component: 'SelectField',
    props: { options: ['Fixed Amount', 'Percentage of Offer'] },
    defaultValue: 'Fixed Amount',
  },
  {
    key: 'emdRefundabilityConditionsGate',
    pageTitle: 'Compliance & Risk Gates',
    label: 'EMD Refundability Conditions (Gate)',
    description: 'A comma-separated list of the *only* conditions under which EMD is refundable.',
    component: 'Textarea',
    defaultValue: 'Inspection Period, Title Not Clear, Financing Fell Through',
  },
  {
    key: 'fha90DayResaleRuleGate',
    pageTitle: 'Compliance & Risk Gates',
    label: 'FHA 90-Day Resale Rule Gate',
    description:
      'If ON, the system will flag potential FHA 90-day seasoning issues for wholetail/flip exits.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'firptaWithholdingGate',
    pageTitle: 'Compliance & Risk Gates',
    label: 'FIRPTA Withholding Gate (Seller Non-Resident Check)',
    description:
      'If ON, flags any deal where the seller is a foreign person, reminding of FIRPTA (Foreign Investment in Real Property Tax Act) withholding.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'flood50RuleGate',
    pageTitle: 'Compliance & Risk Gates',
    label: 'Flood 50% Rule Gate (Substantial Improvement)',
    description:
      "If ON, flags deals in flood zones to check if repairs exceed 50% of the home's value (FEMA 50% Rule).",
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'floodZoneEvidenceSourceFemaMapSelector',
    pageTitle: 'Compliance & Risk Gates',
    label: 'Flood Zone Evidence Source — FEMA Map Selector',
    description: "The data provider used to determine a property's flood zone status.",
    component: 'SelectField',
    props: { options: ['FEMA Map Service (API)', 'Title Report', 'Insurance Quote'] },
    defaultValue: 'FEMA Map Service (API)',
  },
  {
    key: 'hoaStatusEvidenceRequiredDocs',
    pageTitle: 'Compliance & Risk Gates',
    label: 'HOA Status Evidence — Required Docs',
    description: 'The minimum set of documents required to clear an HOA/Condo status check.',
    component: 'MultiSelectChecklist',
    props: { options: ['Estoppel Letter', 'Condo Questionnaire', 'Budget', 'Meeting Minutes'] },
    defaultValue: ['Estoppel Letter', 'Condo Questionnaire'],
  },
  {
    key: 'insuranceBindabilityEvidence',
    pageTitle: 'Compliance & Risk Gates',
    label: 'Insurance Bindability Evidence — 4-Point / Citizens Requirements',
    description:
      'The minimum evidence required to prove insurance bindability, especially for Citizens (FL).',
    component: 'MultiSelectChecklist',
    props: {
      options: [
        '4-Point Inspection',
        'Wind Mitigation',
        'Bindable Quote (PDF)',
        'Roof Condition Form (RCF)',
      ],
    },
    defaultValue: ['Bindable Quote (PDF)'],
  },
  {
    key: 'insuranceCarrierEligibilitySourcesCitizens',
    pageTitle: 'Compliance & Risk Gates',
    label: 'Insurance Carrier Eligibility Sources (Citizens)',
    description:
      "A comma-separated list of approved insurance carriers. Used to check if 'Citizens' is the only option.",
    component: 'Textarea',
    defaultValue: 'State Farm, Allstate, Progressive, USAA, Tower Hill, Security First',
  },
  {
    key: 'projectReviewEvidence',
    pageTitle: 'Compliance & Risk Gates',
    label:
      'Project Review Evidence — Condo Questionnaire, Budget/Reserves, Insurance, Litigation Letter',
    description: 'The full list of required documents for a Condo Project Review.',
    component: 'MultiSelectChecklist',
    props: {
      options: [
        'Condo Questionnaire',
        'Budget',
        'Reserves Study',
        'Master Insurance Policy',
        'Active Litigation Letter',
      ],
    },
    defaultValue: ['Condo Questionnaire', 'Budget', 'Master Insurance Policy'],
  },
  {
    key: 'proofOfInsuranceBindableQuoteRequirement',
    pageTitle: 'Compliance & Risk Gates',
    label: 'Proof of Insurance — Bindable Quote Requirement (4-Point/RCF)',
    description:
      "If ON, a deal cannot be 'ReadyForOffer' without an attached Bindable Quote (or 4-Point/RCF).",
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'repairsStructuralClassGateFema50Rule',
    pageTitle: 'Compliance & Risk Gates',
    label: 'Repairs Structural/Class Gate — FEMA 50% Rule',
    description:
      "If ON, automatically cross-references 'Structural' repair class with 'Flood Zone' status to flag the FEMA 50% Rule.",
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'scraVerificationGate',
    pageTitle: 'Compliance & Risk Gates',
    label: 'SCRA Verification Gate',
    description:
      "If ON, flags any foreclosure deal to verify the seller's SCRA (Servicemembers Civil Relief Act) status.",
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'secondaryAppraisalRequirementFha',
    pageTitle: 'Compliance & Risk Gates',
    label: 'Secondary Appraisal Requirement (FHA 91–180 Days) — Gate Setting',
    description:
      'If ON, flags flip/wholetail deals closing between 91-180 days for a potential FHA secondary appraisal requirement.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'stateProgramGateFhaVaOverlays',
    pageTitle: 'Compliance & Risk Gates',
    label: 'State/Program Gate — FHA/VA Overlays (Timing/Inspections)',
    description: 'If ON, enables checks for FHA/VA specific requirements (e.g., WDO/Water tests).',
    component: 'ToggleSwitch',
    defaultValue: false,
  },
  {
    key: 'vaProgramRequirementsWdoWaterTestEvidence',
    pageTitle: 'Compliance & Risk Gates',
    label: 'VA Program Requirements — WDO/Water Test Evidence',
    description:
      'If ON, flags deals with a VA buyer to ensure WDO (Wood-Destroying Organism) and Water Tests are completed.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'warrantabilityReviewRequirementCondoEligibilityScreens',
    pageTitle: 'Compliance & Risk Gates',
    label: 'Warrantability Review Requirement — Condo Eligibility Screens',
    description:
      'If ON, requires a "Warrantability Review" (Fannie/Freddie) for all condo properties.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },

  // Page 8: Specialized Disposition Modules
  {
    key: 'deedDocumentaryStampRatePolicy',
    pageTitle: 'Specialized Disposition Modules',
    label: 'Deed Documentary Stamp Rate Policy',
    description:
      'The doc stamp rate for deeds (e.g., $0.70 per $100). Enter as a multiplier (e.g., 0.007).',
    component: 'InputField',
    props: { type: 'number', suffix: '(multiplier)', min: 0, step: 0.001 },
    defaultValue: 0.007,
  },
  {
    key: 'deedTaxAllocationBuyerSellerSplitToggle',
    pageTitle: 'Specialized Disposition Modules',
    label: 'Deed Tax Allocation — Buyer/Seller Split Toggle',
    description: 'Sets the default payer for deed taxes/stamps in a double closing.',
    component: 'SelectField',
    props: {
      options: ['Seller Pays (A-B)', 'You Pay (A-B)', 'End-Buyer Pays (B-C)', 'You Pay (B-C)'],
    },
    defaultValue: 'Seller Pays (A-B)',
  },
  {
    key: 'dispositionTrackEnablement',
    pageTitle: 'Specialized Disposition Modules',
    label: 'Disposition Track Enablement — Cash / Wholesale / Wholetail / List',
    description: 'Select which disposition tracks are *enabled* for your team to use.',
    component: 'MultiSelectChecklist',
    props: {
      options: ['Cash (Close)', 'Wholesale (Assign)', 'Wholetail (Clean & List)', 'List (Retail)'],
    },
    defaultValue: [
      'Cash (Close)',
      'Wholesale (Assign)',
      'Wholetail (Clean & List)',
      'List (Retail)',
    ],
  },
  {
    key: 'doubleCloseMinSpreadThreshold',
    pageTitle: 'Specialized Disposition Modules',
    label: 'Double Close (Min Spread Threshold)',
    description:
      'The minimum gross spread ($) required to recommend a Double Close over an Assignment.',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 20000,
  },
  {
    key: 'doubleCloseAtoBClosingCostCategories',
    pageTitle: 'Specialized Disposition Modules',
    label: 'Double-Close — A-to-B Closing Cost Categories (Configurable)',
    description:
      'A comma-separated list of all *your* closing costs for the A-to-B (Seller-to-You) transaction.',
    component: 'Textarea',
    defaultValue: 'Title, Settlement, Recording, TF Points',
  },
  {
    key: 'doubleCloseBtoCClosingCostCategories',
    pageTitle: 'Specialized Disposition Modules',
    label: 'Double-Close — B-to-C Closing Cost Categories (Configurable)',
    description:
      'A comma-separated list of all *your* closing costs for the B-to-C (You-to-Buyer) transaction.',
    component: 'Textarea',
    defaultValue: 'Title, Settlement, Recording, Seller Concessions',
  },
  {
    key: 'doubleCloseFundingPointsPercentage',
    pageTitle: 'Specialized Disposition Modules',
    label: 'Double-Close — Funding Points (Transactional Funding) Percentage',
    description: 'The default points (%) charged by a transactional funder.',
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 2,
  },
  {
    key: 'doubleCloseHoldDaysCalculationMethod',
    pageTitle: 'Specialized Disposition Modules',
    label: 'Double-Close — Hold Days Calculation Method',
    description: 'The method used to calculate hold days for a non-simultaneous double close.',
    component: 'SelectField',
    props: { options: ['Manual Input Only', 'Use Default (e.g., 3 days)'] },
    defaultValue: 'Use Default (e.g., 3 days)',
  },
  {
    key: 'doubleClosePerDiemCarryModeling',
    pageTitle: 'Specialized Disposition Modules',
    label: 'Double-Close — Per-Diem Carry Modeling (Taxes/Insurance/HOA/Utilities)',
    description:
      'If ON, the Double-Close calculator will include per-diem carry costs for any non-simultaneous holds.',
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'titlePremiumRateSource',
    pageTitle: 'Specialized Disposition Modules',
    label: 'Title Premium Rate Source — FAC 69O-186.003 Selector',
    description: 'The official rate table to use for calculating title insurance premiums.',
    component: 'SelectField',
    props: { options: ['FL Promulgated (FAC 69O-186)', 'TX Promulgated', 'Custom Rate Table'] },
    defaultValue: 'FL Promulgated (FAC 69O-186)',
  },
  {
    key: 'transactionalFundingPointsDoubleCloseFinancingInput',
    pageTitle: 'Specialized Disposition Modules',
    label: 'Transactional Funding Points — Double-Close Financing Input',
    description:
      "The default points (%) charged by a transactional funder (Duplicate of '...Funding Points Percentage').",
    component: 'InputField',
    props: { type: 'number', suffix: '%', min: 0 },
    defaultValue: 2,
  },
  {
    key: 'wholetailRetailMakeReadyInputEvidenceDefaultsToggle',
    pageTitle: 'Specialized Disposition Modules',
    label: 'Wholetail Retail Make-Ready Input — Evidence/Defaults Toggle',
    description:
      "If ON, uses the 'Retail Make-Ready' costs for a Wholetail. If OFF, uses a simpler 'clean-out' cost.",
    component: 'ToggleSwitch',
    defaultValue: true,
  },

  // Page 9: Workflow & UI Logic
  {
    key: 'abcConfidenceGradeRubric',
    pageTitle: 'Workflow & UI Logic',
    label: 'A/B/C Confidence Grade Rubric',
    description:
      'Define the *meaning* of each confidence grade. This rubric is used to auto-grade deals.',
    component: 'DynamicBandEditor',
    props: {
      columns: [
        { key: 'grade', label: 'Grade', type: 'select', options: ['A', 'B', 'C', 'D', 'F'] },
        { key: 'minComps', label: 'Min Comps', type: 'number' },
        { key: 'maxCompAge', label: 'Max Comp Age (Days)', type: 'number' },
        { key: 'maxVariance', label: 'Max Variance (%)', type: 'number' },
      ],
      newRowDefaults: { grade: 'F', minComps: 0, maxCompAge: 365, maxVariance: 25 },
    },
    defaultValue: [
      { id: 1, grade: 'A', minComps: 5, maxCompAge: 90, maxVariance: 5 },
      { id: 2, grade: 'B', minComps: 4, maxCompAge: 120, maxVariance: 10 },
      { id: 3, grade: 'C', minComps: 3, maxCompAge: 180, maxVariance: 15 },
      { id: 4, grade: 'D', minComps: 2, maxCompAge: 270, maxVariance: 20 },
    ],
  },
  {
    key: 'allowAdvisorOverrideWorkflowState',
    pageTitle: 'Workflow & UI Logic',
    label: 'Allow Advisor Override (Workflow State)',
    description:
      "If ON, allows a user with the 'Advisor' role to manually override a deal's workflow state.",
    component: 'ToggleSwitch',
    defaultValue: false,
  },
  {
    key: 'analystReviewTriggerBorderlineBandThreshold',
    pageTitle: 'Workflow & UI Logic',
    label: 'Analyst Review Trigger — Borderline Band Threshold',
    description:
      "Automatically flag a deal for 'Needs Review' if the spread is within this $ amount of the minimum spread.",
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 2500,
  },
  {
    key: 'assumptionsProtocolPlaceholdersWhenEvidenceMissing',
    pageTitle: 'Workflow & UI Logic',
    label: 'Assumptions Protocol — [INFO NEEDED] placeholders when evidence missing',
    description:
      "If ON, the system will use 'Default' values (e.g., Default Taxes) when real evidence is missing.",
    component: 'ToggleSwitch',
    defaultValue: true,
  },
  {
    key: 'bankersRoundingModeNumericSafety',
    pageTitle: 'Workflow & UI Logic',
    label: 'Banker’s Rounding Mode (Numeric Safety)',
    description:
      "If ON, use Banker's Rounding (round to nearest even) for all financial calculations to reduce drift.",
    component: 'ToggleSwitch',
    defaultValue: false,
  },
  {
    key: 'buyerCostsAllocationDualScenarioRenderingWhenUnknown',
    pageTitle: 'Workflow & UI Logic',
    label: 'Buyer Costs Allocation — Dual Scenario Rendering When Unknown',
    description:
      "If ON, when cost allocation is unknown, the UI will render two scenarios (e.g., 'Seller Pays' vs 'Buyer Pays').",
    component: 'ToggleSwitch',
    defaultValue: false,
  },
  {
    key: 'buyerCostsLineItemModelingMethod',
    pageTitle: 'Workflow & UI Logic',
    label: 'Buyer Costs — Line-Item Modeling Method',
    description: 'The method for modeling buyer costs.',
    component: 'SelectField',
    props: { options: ['Use Line-Item Model', 'Use % of ARV', 'Use Fixed Amount'] },
    defaultValue: 'Use Line-Item Model',
  },
  {
    key: 'cashPresentationGateMinimumSpreadOverPayoff',
    pageTitle: 'Workflow & UI Logic',
    label: 'Cash Presentation Gate — Minimum Spread Over Payoff',
    description:
      'The minimum $ spread required over the final payoff to present an offer as a "Cash Offer".',
    component: 'InputField',
    props: { type: 'number', prefix: '$', min: 0 },
    defaultValue: 5000,
  },
];

const SANDBOX_PAGE_META: Record<string, { icon: string; description: string }> = {
  'Core Valuation Models': {
    icon: 'barChart',
    description: 'Rules for calculating ARV, AIV, and market liquidity.',
  },
  'Floor & Ceiling Formulas': {
    icon: 'calculator',
    description: 'Logic for determining the absolute min/max offer boundaries.',
  },
  'Cost & Expense Models': {
    icon: 'dollar',
    description: 'Defaults and formulas for repairs, carry, and resale costs.',
  },
  'Debt & Payoff Logic': {
    icon: 'briefcase',
    description: 'Rules for calculating payoffs, per-diems, and handling liens.',
  },
  'Profit & Risk Policy': {
    icon: 'trending',
    description: 'Core policies for margins, spreads, and negotiation strategy.',
  },
  'Timeline & Urgency Rules': {
    icon: 'alert',
    description: 'Logic for DTM calculations and urgency-based adjustments.',
  },
  'Compliance & Risk Gates': {
    icon: 'shield',
    description: 'Automated checks for legal, insurance, and title compliance.',
  },
  'Specialized Disposition Modules': {
    icon: 'wrench',
    description: 'Settings for double-closings, assignments, and other exits.',
  },
  'Workflow & UI Logic': {
    icon: 'edit',
    description: 'Controls for UI behavior, workflow automation, and evidence requirements.',
  },
};

const pages: Record<string, SandboxSettingDef[]> = {};
allSettingDefs.forEach((setting) => {
  if (!pages[setting.pageTitle]) {
    pages[setting.pageTitle] = [];
  }
  pages[setting.pageTitle].push(setting);
});

export const SANDBOX_ALL_SETTING_DEFS = allSettingDefs;

export const SANDBOX_PAGES_CONFIG = Object.keys(SANDBOX_PAGE_META).map((title) => ({
  title,
  icon: SANDBOX_PAGE_META[title].icon,
  description: SANDBOX_PAGE_META[title].description,
  settings: pages[title] || [],
}));

export const createInitialSandboxState = (): Record<string, any> => {
  const state: Record<string, any> = {};
  allSettingDefs.forEach((setting) => {
    state[setting.key] = setting.defaultValue;
  });
  return state;
};
