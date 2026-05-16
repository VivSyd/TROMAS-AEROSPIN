// Calculator constants are kept in one place for easier future adjustments.
const AEROSPIN_LM_PER_UNIT = 2.63;
const HIGH_LEVEL_RATE_STANDARD = 5000;
const LOW_LEVEL_RATE_STANDARD = 7000;
const LOW_LEVEL_RATE_HIGH = 25000;

const form = document.getElementById("calculator-form");
const copyResultsButton = document.getElementById("copyResults");

const results = {
  requiredUnits: document.getElementById("requiredUnits"),
  roofArea: document.getElementById("roofArea"),
  requiredHighLevelVentilation: document.getElementById("requiredHighLevelVentilation"),
  requiredLmEquivalent: document.getElementById("requiredLmEquivalent"),
  totalLmProvided: document.getElementById("totalLmProvided"),
  lowLevelVentilation: document.getElementById("lowLevelVentilation"),
  notes: document.getElementById("notes")
};

const defaultNote = "Indicative only — final specification must be confirmed by installer, certifier, or engineer.";

function formatNumber(value, decimals = 2) {
  return new Intl.NumberFormat("en-AU", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0
  }).format(value);
}

function getVentilationRates(roofPitch, ceilingType) {
  if (roofPitch < 10) {
    return { lowLevelRate: LOW_LEVEL_RATE_HIGH, highLevelRate: 0, warning: "" };
  }

  if (roofPitch >= 10 && roofPitch < 15) {
    return { lowLevelRate: LOW_LEVEL_RATE_HIGH, highLevelRate: HIGH_LEVEL_RATE_STANDARD, warning: "" };
  }

  if (roofPitch >= 15 && roofPitch < 75) {
    if (ceilingType === "Raked / cathedral ceiling") {
      return { lowLevelRate: LOW_LEVEL_RATE_HIGH, highLevelRate: HIGH_LEVEL_RATE_STANDARD, warning: "" };
    }

    return { lowLevelRate: LOW_LEVEL_RATE_STANDARD, highLevelRate: HIGH_LEVEL_RATE_STANDARD, warning: "" };
  }

  return {
    lowLevelRate: LOW_LEVEL_RATE_STANDARD,
    highLevelRate: HIGH_LEVEL_RATE_STANDARD,
    warning: "Roof pitch is outside the normal calculator range. Please confirm with installer or engineer."
  };
}

function resetResults() {
  results.requiredUnits.textContent = "-";
  results.roofArea.textContent = "-";
  results.requiredHighLevelVentilation.textContent = "-";
  results.requiredLmEquivalent.textContent = "-";
  results.totalLmProvided.textContent = "-";
  results.lowLevelVentilation.textContent = "-";
  results.notes.textContent = defaultNote;
}

function buildSummaryText() {
  return [
    "AeroSpin Ventilation Calculator Result",
    `Recommended AeroSpin Units: ${results.requiredUnits.textContent}`,
    `Roof area: ${results.roofArea.textContent}`,
    `Required high-level ventilation: ${results.requiredHighLevelVentilation.textContent}`,
    `Required LM equivalent: ${results.requiredLmEquivalent.textContent}`,
    `Total LM provided: ${results.totalLmProvided.textContent}`,
    `Low-level ventilation required: ${results.lowLevelVentilation.textContent}`,
    `Notes: ${results.notes.textContent}`
  ].join("\n");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const roofLength = Number(form.roofLength.value);
  const roofWidth = Number(form.roofWidth.value);
  const roofPitch = Number(form.roofPitch.value);
  const ceilingType = form.ceilingType.value;

  if (!roofLength || !roofWidth || roofPitch < 0) {
    results.notes.textContent = "Please enter valid numeric values for roof length, roof width, and roof pitch.";
    return;
  }

  const roofArea = roofLength * roofWidth;
  const { lowLevelRate, highLevelRate, warning } = getVentilationRates(roofPitch, ceilingType);
  const requiredHighLevelVentilation = highLevelRate * roofLength;
  const requiredLmEquivalent = requiredHighLevelVentilation / HIGH_LEVEL_RATE_STANDARD;

  let requiredUnitsDisplay = "";
  let requiredUnitsValue = 0;
  let totalLmProvided = 0;

  if (highLevelRate === 0) {
    requiredUnitsDisplay = "High-level ventilation may not be required based on selected pitch, but project must be checked.";
  } else {
    requiredUnitsValue = Math.ceil((requiredHighLevelVentilation / HIGH_LEVEL_RATE_STANDARD) / AEROSPIN_LM_PER_UNIT);
    totalLmProvided = requiredUnitsValue * AEROSPIN_LM_PER_UNIT;
    requiredUnitsDisplay = String(requiredUnitsValue);
  }

  results.requiredUnits.textContent = requiredUnitsDisplay;
  results.roofArea.textContent = `${formatNumber(roofArea)} m²`;
  results.requiredHighLevelVentilation.textContent = `${formatNumber(requiredHighLevelVentilation, 0)} mm²`;
  results.requiredLmEquivalent.textContent = `${formatNumber(requiredLmEquivalent)} LM`;
  results.totalLmProvided.textContent = highLevelRate === 0 ? "-" : `${formatNumber(totalLmProvided)} LM`;
  results.lowLevelVentilation.textContent = `${formatNumber(lowLevelRate, 0)} mm² per LM`;

  const notes = [defaultNote];
  if (warning) {
    notes.unshift(warning);
  }
  if (highLevelRate === 0) {
    notes.unshift("High-level ventilation may not be required based on selected pitch, but project must be checked.");
  }
  results.notes.textContent = notes.join(" ");
});

form.addEventListener("reset", () => {
  window.requestAnimationFrame(resetResults);
});

copyResultsButton.addEventListener("click", async () => {
  const summary = buildSummaryText();
  try {
    await navigator.clipboard.writeText(summary);
    copyResultsButton.textContent = "Copied";
    setTimeout(() => {
      copyResultsButton.textContent = "Copy Result";
    }, 1400);
  } catch {
    results.notes.textContent = "Clipboard access was blocked. Please copy results manually.";
  }
});

resetResults();
