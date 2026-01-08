#!/usr/bin/env node
/**
 * Script to remove DROP_BACKLOG knobs from sandboxSettingsSource.ts
 * Phase 7 Slice A - Schema Cleanup
 */

const fs = require('fs');
const path = require('path');

// Keys to remove (112 DROP_BACKLOG knobs)
const DROP_BACKLOG_KEYS = [
  'actual365PayoffDayCountConvention',
  'aivAsisModelingRetailRepairFrictionMethod',
  'aivSoftMaxCompsAgeDays',
  'aivSoftMinComps',
  'aivSoftMinCompsRadius',
  'allocationToggleBuyerVsSeller',
  'assignmentFeeVipOverrideMaxArvPercentage',
  'assignmentFeeVipOverrideMinArvPercentage',
  'auctionUrgencyMarginAdderPolicy',
  'auctionUrgencyTrpMultiplierPolicy',
  'buyerCostsAllocationDefaultSellerPays',
  'buyerCostsTitleQuoteEvidenceRequirement',
  'buyerSegmentationFlipperMaxMoi',
  'buyerSegmentationLandlordMinGrossYield',
  'buyerSegmentationLandlordMinMoi',
  'buyerSegmentationWholetailMinYearBuilt',
  'buyerTargetMarginFlipMoiBands',
  'buyerTargetMarginMoiTierAdjusters',
  'buyerTargetMarginWholetailFastZip',
  'buyerTargetMarginWholetailNeutralZip',
  'buyerTargetMarginWholetailRangePolicy',
  'buyerTargetMarginWholetailSlowZip',
  'ceilingSelectionConservativeUsesMin',
  'ceilingSelectionHighestEligibleInBase',
  'ceilingSelectionPostureControls',
  'concessionsLadderStep1',
  'concessionsLadderStep2',
  'concessionsLadderStep3',
  'condoSirsMilestoneFlag',
  'counterOfferDefaultIncrement',
  'daysToMoneyRollForwardRule',
  'deedTaxAllocationBuyerSellerSplitToggle',
  'defaultDaysToCashClose',
  'dispositionRecommendationListMlsMinDomZip',
  'dispositionRecommendationListMlsMinDtm',
  'dispositionRecommendationListMlsMinMoi',
  'dispositionRecommendationLogicDtmThresholds',
  'domHardMax',
  'domHardMin',
  'domSoftMaxWarning',
  'domSoftMinWarning',
  'doubleCloseAtoBClosingCostCategories',
  'doubleCloseBtoCClosingCostCategories',
  'doubleCloseFundingPointsPercentage',
  'doubleCloseHoldDaysCalculationMethod',
  'emdPolicyEarnestMoneyStructure',
  'emdRefundabilityConditionsGate',
  'emdTimelineDaysDeadlinePolicy',
  'hoaEstoppelFeeCapPolicy',
  'hoaRushTransferFeePolicy',
  'hoaStatusEvidenceRequiredDocs',
  'insuranceBindabilityEvidence',
  'insuranceCarrierEligibilitySourcesCitizens',
  'interestDayCountBasisDefault',
  'investorBenchmarkModelPostureSelectionMode',
  'investorFloorCompositionComponentsToggle',
  'listingCostModelSellerCostLineItems',
  'maoCalculationMethodArvAivMultiplierSelection',
  'maoNegotiationBandwidthAdjustmentRange',
  'marketLiquidityInputs',
  'marketPriceTieringBracketBreakpointSource',
  'moiHardMax',
  'moiHardMin',
  'moiSoftMaxWarning',
  'moiSoftMinWarning',
  'negotiationBufferPercentage',
  'paceAssessmentHandlingPayoffRequirementPolicy',
  'paceDetectionSourceTaxBillNonAdValoremSelector',
  'perDiemAccrualInputsSeniorJuniorsUsdDay',
  'postureDefaultMode',
  'priceTieringSourceZipPriceBracketsData',
  'projectReviewEvidence',
  'proofOfInsuranceBindableQuoteRequirement',
  'providerSelectorCountyOfficialRecords',
  'providerSelectorMlsCompsDataSource',
  'providerSelectorZipMetrics',
  'repairsContingencyBidsMissing',
  'repairsContingencyHeavyScope',
  'repairsContingencyLightScope',
  'repairsContingencyMediumScope',
  'repairsEvidenceBidsScopeAttachmentRequirement',
  'repairsHardMin',
  'repairsStructuralClassGateFema50Rule',
  'respectFloorCompositionInvestorFloorVsPayoff',
  'respectFloorFormulaComponentSelector',
  'retailListingCostPercentage',
  'retailMakeReadyPerRepairClass',
  'retailRepairFrictionPercentage',
  'rightOfFirstRefusalBoardApprovalWindowDaysInput',
  'secondaryAppraisalRequirementFha',
  'sellerConcessionsCreditsHandlingPolicy',
  'sellerNetRetailMakeReadyInputs',
  'seniorPerDiemHardMax',
  'seniorPerDiemHardMin',
  'seniorPerDiemSoftMaxImpliedApr',
  'seniorPrincipalHardMax',
  'seniorPrincipalHardMin',
  'seniorPrincipalSoftMaxVsArvPercentage',
  'solarLeaseUcc1GateClearanceRequirement',
  'sourcesEvidenceTitleQuotePdfItemizationRequirement',
  'speedBandsSlowMinDom',
  'speedBandsSlowMinMoi',
  'spreadPresentationBorderlineBandHandlingPolicy',
  'titleQuoteAttachmentRequiredForPublishing',
  'transactionalFundingPointsDoubleCloseFinancingInput',
  'ucc1SearchSourceSelectorCountyStateRegistry',
  'ucc1TerminationSubordinationClosingConditionRequirement',
  'uninsurableAdderFlipMarginPercentage',
  'wholesaleFeeModeAssignmentVsDoubleCloseSelection',
  'wholetailMarginPolicyByZipSpeedBand',
  'wholetailRetailMakeReadyInputEvidenceDefaultsToggle',
  'zipSpeedBandPostureControlsMarginHoldingAdjusters',
];

const dropBacklogSet = new Set(DROP_BACKLOG_KEYS);

const sourceFile = path.join(__dirname, '../apps/hps-dealengine/constants/sandboxSettingsSource.ts');

console.log(`Reading ${sourceFile}...`);
const content = fs.readFileSync(sourceFile, 'utf8');

// Parse the file to extract the array of setting definitions
// The file structure is: const allSettingDefs: SandboxSettingDef[] = [ ... ];

// Strategy: Parse each object block and filter out DROP_BACKLOG keys
const lines = content.split('\n');

// Find the start of allSettingDefs array
let inArray = false;
let arrayStartLine = -1;
let arrayEndLine = -1;
let bracketDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('const allSettingDefs')) {
    inArray = true;
    arrayStartLine = i;
  }

  if (inArray) {
    for (const char of line) {
      if (char === '[') bracketDepth++;
      if (char === ']') bracketDepth--;
    }

    if (bracketDepth === 0 && arrayStartLine !== i && line.includes(']')) {
      arrayEndLine = i;
      break;
    }
  }
}

console.log(`Array starts at line ${arrayStartLine + 1}, ends at line ${arrayEndLine + 1}`);

// Extract the array content and parse objects
const beforeArray = lines.slice(0, arrayStartLine + 1);
const arrayContent = lines.slice(arrayStartLine + 1, arrayEndLine);
const afterArray = lines.slice(arrayEndLine);

// Parse objects from array content
// Each object starts with { and ends with },
let currentObject = [];
let objectDepth = 0;
let objects = [];

for (const line of arrayContent) {
  for (const char of line) {
    if (char === '{') objectDepth++;
    if (char === '}') objectDepth--;
  }

  currentObject.push(line);

  if (objectDepth === 0 && currentObject.length > 0 && line.trim().endsWith('},')) {
    objects.push(currentObject.join('\n'));
    currentObject = [];
  }
}

// Handle last object without trailing comma
if (currentObject.length > 0) {
  objects.push(currentObject.join('\n'));
}

console.log(`Found ${objects.length} setting objects`);

// Filter out DROP_BACKLOG objects
const keptObjects = objects.filter(obj => {
  const keyMatch = obj.match(/key:\s*['"]([^'"]+)['"]/);
  if (keyMatch) {
    const key = keyMatch[1];
    if (dropBacklogSet.has(key)) {
      console.log(`  Removing: ${key}`);
      return false;
    }
    return true;
  }
  return true; // Keep if we can't parse the key
});

console.log(`\nKept ${keptObjects.length} objects (removed ${objects.length - keptObjects.length})`);

// Reconstruct the file
// Need to ensure proper comma handling
const cleanedObjects = keptObjects.map((obj, i) => {
  // Ensure trailing comma except for last object
  const trimmed = obj.trimEnd();
  if (i < keptObjects.length - 1) {
    if (!trimmed.endsWith(',')) {
      return trimmed + ',';
    }
  } else {
    // Last object - remove trailing comma
    if (trimmed.endsWith('},')) {
      return trimmed.slice(0, -1); // Remove the comma
    }
  }
  return obj;
});

const newContent = [
  ...beforeArray,
  ...cleanedObjects.join('\n').split('\n'),
  ...afterArray,
].join('\n');

// Write back
fs.writeFileSync(sourceFile, newContent);
console.log(`\nWrote updated file to ${sourceFile}`);

// Verify
const verification = fs.readFileSync(sourceFile, 'utf8');
const keyCount = (verification.match(/key:\s*['"][^'"]+['"]/g) || []).length;
console.log(`Verification: ${keyCount} keys remaining in file`);
