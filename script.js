// Calculator constants are kept in one place for easier future adjustments.
const AEROSPIN_LM_PER_UNIT = 2.63;
const HIGH_LEVEL_RATE_STANDARD = 5000;
const LOW_LEVEL_RATE_STANDARD = 7000;
const LOW_LEVEL_RATE_HIGH = 25000;

const form = document.getElementById("calculator-form");
const copyResultsButton = document.getElementById("copyResults");
const sendOrderButton = document.getElementById("sendOrder");
const downloadPdfButton = document.getElementById("downloadPdf");
const calculatorSection = document.getElementById("calculator");
const resourcesSection = document.getElementById("resources");

const results = {
  requiredUnits: document.getElementById("requiredUnits"),
  roofArea: document.getElementById("roofArea"),
  requiredHighLevelVentilation: document.getElementById("requiredHighLevelVentilation"),
  requiredLmEquivalent: document.getElementById("requiredLmEquivalent"),
  totalLmProvided: document.getElementById("totalLmProvided"),
  lowLevelVentilation: document.getElementById("lowLevelVentilation"),
  notes: document.getElementById("notes")
};

const defaultNote = "Indicative only. Final ventilation requirements must be confirmed by a qualified installer, certifier, or engineer.";

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

function buildSummaryHtml() {
  const generatedAt = new Date().toLocaleString("en-AU");
  const lines = buildSummaryText().split("\n").map((line) => `<p>${line}</p>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>TROMAS Estimate</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 32px; }
    h1 { margin: 0 0 12px; font-size: 22px; }
    p { margin: 6px 0; font-size: 14px; }
    .meta { margin-top: 20px; color: #555; font-size: 12px; }
  </style>
</head>
<body>
  <h1>TROMAS AeroSpin 500 Estimate</h1>
  ${lines}
  <p class="meta">Generated: ${generatedAt}</p>
</body>
</html>`;
}

function activateTab(tabId) {
  const buttons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-content");

  buttons.forEach((button) => {
    const isActive = button.dataset.tab === tabId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  panels.forEach((panel) => {
    const isActive = panel.id === tabId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
}

function syncSectionVisibility() {
  const showResources = window.location.hash === "#resources";
  if (calculatorSection) {
    calculatorSection.hidden = showResources;
  }
  if (resourcesSection) {
    resourcesSection.hidden = !showResources;
  }
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
      copyResultsButton.textContent = "Copy Results";
    }, 1400);
  } catch {
    results.notes.textContent = "Clipboard access was blocked. Please copy results manually.";
  }
});

sendOrderButton.addEventListener("click", () => {
  const subject = encodeURIComponent("AeroSpin Order Request");
  const body = encodeURIComponent(`${buildSummaryText()}\n\nPlease contact me to proceed with this order request.`);
  window.location.href = `mailto:sales@tromas.com.au?subject=${subject}&body=${body}`;
});

downloadPdfButton.addEventListener("click", () => {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    results.notes.textContent = "Pop-up blocked. Please allow pop-ups to download the PDF estimate.";
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildSummaryHtml());
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
});

document.querySelectorAll(".tab-btn").forEach((button) => {
  button.addEventListener("click", () => {
    activateTab(button.dataset.tab);
  });
});

activateTab("tab-tech");
resetResults();
syncSectionVisibility();
window.addEventListener("hashchange", syncSectionVisibility);
