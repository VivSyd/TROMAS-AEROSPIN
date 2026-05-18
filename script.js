// Calculator constants are kept in one place for easier future adjustments.
const AEROSPIN_500_EFFECTIVE_AREA_DEFAULT = 250000;
const climateZoneInfo = {
  1: { name: "Zone 1", climate: "High humidity summer, warm winter", risk: "Heat + humidity", note: "Ventilation helps reduce trapped roof-space heat and moisture." },
  2: { name: "Zone 2", climate: "Warm humid summer, mild winter", risk: "Humidity", note: "Ventilation supports moisture control in humid regions." },
  3: { name: "Zone 3", climate: "Hot dry summer, warm winter", risk: "Heat", note: "Ventilation helps exhaust hot roof-space air." },
  4: { name: "Zone 4", climate: "Hot dry summer, cool winter", risk: "Heat + seasonal moisture", note: "Ventilation assists heat relief and winter moisture management." },
  5: { name: "Zone 5", climate: "Warm temperate", risk: "Moderate", note: "Ventilation may assist general roof-space performance." },
  6: { name: "Zone 6", climate: "Mild temperate", risk: "Condensation risk", note: "NCC roof-space ventilation provisions are especially relevant." },
  7: { name: "Zone 7", climate: "Cool temperate", risk: "High condensation risk", note: "Ventilation is important for condensation and moisture control." },
  8: { name: "Zone 8", climate: "Alpine", risk: "Highest condensation risk", note: "Project-specific ventilation review is strongly recommended." }
};
// Seed mapping for launch; expand as needed for full Australia coverage.
const postcodeToClimateZone = {
  "2567": 6,
  "2000": 5,
  "3000": 6,
  "4000": 2,
  "5000": 5,
  "6000": 5,
  "7000": 7,
  "0800": 1
};

const form = document.getElementById("calculator-form");
const copyResultsButton = document.getElementById("copyResults");
const sendOrderButton = document.getElementById("sendOrder");
const downloadPdfButton = document.getElementById("downloadPdf");
const postcodeInput = document.getElementById("postcode");
const climateZoneField = document.getElementById("climateZoneFallbackField");
const climateZoneSelect = document.getElementById("climateZone");
const calculatorSection = document.getElementById("calculator");
const resourcesSection = document.getElementById("resources");

const results = {
  requiredUnits: document.getElementById("requiredUnits"),
  roofArea: document.getElementById("roofArea"),
  requiredHighLevelVentilation: document.getElementById("requiredHighLevelVentilation"),
  requiredLmEquivalent: document.getElementById("requiredLmEquivalent"),
  totalLmProvided: document.getElementById("totalLmProvided"),
  lowLevelVentilation: document.getElementById("lowLevelVentilation"),
  climateSummary: document.getElementById("climateSummary"),
  notes: document.getElementById("notes")
};

const defaultNote = "Indicative only. Final ventilation requirements must be confirmed by a qualified installer, certifier, or engineer.";

function formatNumber(value, decimals = 2) {
  return new Intl.NumberFormat("en-AU", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0
  }).format(value);
}

function lookupClimateZoneFromPostcode(postcode) {
  return postcodeToClimateZone[String(postcode)] || null;
}

function calculateAeroSpin500({
  roofLength,
  roofPitch,
  ceilingType,
  climateZone,
  aeroSpin500EffectiveArea = AEROSPIN_500_EFFECTIVE_AREA_DEFAULT
}) {
  const rl = Number(roofLength);
  const rp = Number(roofPitch);
  const cz = Number(climateZone);
  const az = Number(aeroSpin500EffectiveArea);

  if (!Number.isFinite(rl) || rl <= 0) {
    return { ok: false, message: "Please enter a valid roof length greater than 0." };
  }
  if (!Number.isFinite(rp) || rp < 0) {
    return { ok: false, message: "Please enter a valid roof pitch (0 or greater)." };
  }
  if (!Number.isFinite(az) || az <= 0) {
    return { ok: false, message: "AeroSpin effective area is missing or invalid." };
  }
  if (!climateZoneInfo[cz]) {
    return { ok: false, message: "Climate zone could not be confirmed. Please check postcode or select a climate zone." };
  }

  let requiredArea;
  const warnings = [];

  if (rp < 10) {
    requiredArea = rl * 25000 * 2;
  } else if (rp >= 10 && rp < 15) {
    requiredArea = rl * (25000 + 5000);
  } else if (rp >= 15 && rp <= 75) {
    requiredArea = rl * (7000 + 5000);
  } else {
    requiredArea = rl * (7000 + 5000);
    warnings.push("Manual review recommended for steep roof pitch.");
  }

  const isCathedral =
    ceilingType === "cathedral" ||
    ceilingType === "Raked / cathedral ceiling";

  if (isCathedral) {
    requiredArea += rl * 18000;
  }

  const finalUnits = Math.max(1, Math.ceil(requiredArea / az));
  const spacing = rl / finalUnits;
  if (cz >= 6 && cz <= 8) {
    warnings.push("Condensation risk elevated within this climate zone.");
  }
  const zone = climateZoneInfo[cz];

  return {
    ok: true,
    data: {
      zoneName: zone.name,
      climate: zone.climate,
      risk: zone.risk,
      zoneNote: zone.note,
      requiredArea,
      finalUnits,
      spacing: Number(spacing.toFixed(2)),
      roofLength: rl
    },
    warnings
  };
}

function resetResults() {
  results.requiredUnits.textContent = "-";
  results.roofArea.textContent = "-";
  results.requiredHighLevelVentilation.textContent = "-";
  results.requiredLmEquivalent.textContent = "-";
  results.totalLmProvided.textContent = "-";
  results.lowLevelVentilation.textContent = "-";
  results.climateSummary.textContent = "-";
  results.notes.textContent = defaultNote;
}

function buildSummaryText() {
  return [
    "AeroSpin Ventilation Calculator Result",
    `Recommended AeroSpin Units: ${results.requiredUnits.textContent}`,
    `Roof length: ${results.roofArea.textContent}`,
    `Climate zone: ${results.totalLmProvided.textContent}`,
    `Required vent area: ${results.requiredHighLevelVentilation.textContent}`,
    `Approx spacing: ${results.requiredLmEquivalent.textContent}`,
    `Recommended units: ${results.lowLevelVentilation.textContent}`,
    `Climate summary: ${results.climateSummary.textContent}`,
    `Notes: ${results.notes.textContent}`
  ].join("\n");
}

function updateClimateFallbackVisibility() {
  const postcode = String(postcodeInput.value || "").trim();
  if (postcode.length < 4) {
    climateZoneField.hidden = true;
    climateZoneSelect.value = "";
    return;
  }
  const postcodeZone = lookupClimateZoneFromPostcode(postcode);
  climateZoneField.hidden = Boolean(postcodeZone);
  if (postcodeZone) {
    climateZoneSelect.value = "";
  }
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
  const roofPitch = Number(form.roofPitch.value);
  const ceilingType = form.ceilingType.value;
  const postcode = String(postcodeInput.value || "").trim();
  const postcodeZone = lookupClimateZoneFromPostcode(postcode);
  const selectedZone = climateZoneSelect.value ? Number(climateZoneSelect.value) : null;
  const climateZone = postcodeZone || selectedZone;

  const result = calculateAeroSpin500({
    roofLength,
    roofPitch,
    ceilingType,
    climateZone
  });

  if (!result.ok) {
    results.notes.textContent = result.message;
    return;
  }

  const warnings = result.warnings.length ? `${result.warnings.join(" ")} ` : "";
  const data = result.data;
  results.requiredUnits.textContent = String(data.finalUnits);
  results.roofArea.textContent = `${formatNumber(data.roofLength)} m`;
  results.totalLmProvided.textContent = data.zoneName;
  results.requiredHighLevelVentilation.textContent = `${formatNumber(data.requiredArea, 0)} mm²`;
  results.requiredLmEquivalent.textContent = `${formatNumber(data.spacing)} m`;
  results.lowLevelVentilation.textContent = String(data.finalUnits);
  results.climateSummary.textContent = `${data.climate} (${data.risk})`;
  results.notes.textContent = `${warnings}${data.zoneNote} ${defaultNote}`;
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

postcodeInput.addEventListener("input", updateClimateFallbackVisibility);
updateClimateFallbackVisibility();
activateTab("tab-tech");
resetResults();
syncSectionVisibility();
window.addEventListener("hashchange", syncSectionVisibility);
