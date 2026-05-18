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
const REPORT_PRIMARY_GREEN = "#163A34";
const REPORT_DEEP_GRAPHITE = "#1A1A1A";
const REPORT_INDUSTRIAL_GREY = "#707070";
const REPORT_KRAFT = "#D8C3A5";
const REPORT_WARNING_AMBER = "#C98B2E";

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

  const ceilingTypeNormalized = String(ceilingType || "").trim().toLowerCase();
  const isCathedral =
    ceilingTypeNormalized === "cathedral" ||
    ceilingTypeNormalized === "raked / cathedral ceiling";

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
    "TROMAS AeroSpin Passive Ventilation Assessment Report",
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

function buildReportId() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `TVR-${yy}${mm}${dd}-001`;
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
  const reportId = buildReportId();
  const warningActive = results.notes.textContent.includes("Condensation risk elevated") || results.notes.textContent.includes("Manual review recommended");
  const climateAssessmentTitle = warningActive ? "Climate Performance Assessment: Attention Required" : "Climate Performance Assessment: Standard";
  const climateAssessmentTone = warningActive ? `border-left: 6px solid ${REPORT_WARNING_AMBER};` : `border-left: 6px solid ${REPORT_PRIMARY_GREEN};`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>TROMAS Ventilation Assessment Report</title>
  <style>
    body {
      font-family: Inter, Arial, sans-serif;
      color: ${REPORT_DEEP_GRAPHITE};
      margin: 24px;
      background-image:
        linear-gradient(rgba(22,58,52,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(22,58,52,0.03) 1px, transparent 1px);
      background-size: 24px 24px;
    }
    .report-shell { position: relative; }
    .watermark {
      position: absolute;
      right: 10px;
      top: 78px;
      font-family: Rajdhani, Arial, sans-serif;
      font-size: 52px;
      font-weight: 700;
      letter-spacing: .08em;
      color: rgba(22,58,52,0.07);
      pointer-events: none;
      user-select: none;
      text-transform: uppercase;
    }
    .header { background: ${REPORT_PRIMARY_GREEN}; color: #fff; padding: 18px 20px; }
    .brand { font-family: Rajdhani, Arial, sans-serif; font-size: 24px; font-weight: 700; letter-spacing: .08em; }
    .sub { font-family: Rajdhani, Arial, sans-serif; font-size: 14px; letter-spacing: .06em; text-transform: uppercase; margin-top: 4px; }
    .meta { margin-top: 10px; font-size: 12px; color: #d8e2de; }
    .section { margin-top: 18px; border: 1px solid #d2d2d2; }
    .section-head { background: #f3f3f3; font-family: Rajdhani, Arial, sans-serif; font-weight: 700; padding: 10px 12px; text-transform: uppercase; letter-spacing: .06em; }
    .kpi-wrap { display: grid; grid-template-columns: 1.2fr .8fr; gap: 0; }
    .kpi-table { width: 100%; border-collapse: collapse; }
    .kpi-table td { padding: 9px 12px; border-top: 1px solid #e1e1e1; font-size: 13px; }
    .kpi-table td:first-child { color: ${REPORT_INDUSTRIAL_GREY}; font-weight: 600; width: 55%; }
    .hero-number { background: ${REPORT_KRAFT}; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 18px 10px; border-left: 1px solid #c8b18f; }
    .hero-number .value { font-family: Rajdhani, Arial, sans-serif; font-size: 72px; line-height: 1; font-weight: 700; color: ${REPORT_PRIMARY_GREEN}; }
    .hero-number .label { margin-top: 8px; text-align: center; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: ${REPORT_DEEP_GRAPHITE}; font-weight: 600; }
    .assessment { margin-top: 18px; padding: 14px; background: linear-gradient(135deg, rgba(201,139,46,0.10), rgba(201,139,46,0.02)); ${climateAssessmentTone} }
    .assessment h3 { margin: 0 0 8px; font-family: Rajdhani, Arial, sans-serif; text-transform: uppercase; letter-spacing: .05em; font-size: 15px; }
    .assessment p { margin: 0 0 8px; font-size: 13px; }
    .assessment ul { margin: 0; padding-left: 18px; }
    .assessment li { margin: 4px 0; font-size: 13px; }
    .footer { margin-top: 20px; padding-top: 14px; border-top: 2px solid ${REPORT_PRIMARY_GREEN}; }
    .footer .tag { font-family: Rajdhani, Arial, sans-serif; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; margin-bottom: 6px; }
    .footer p { margin: 0; font-size: 12px; color: #444; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="report-shell">
    <div class="watermark">TROMAS</div>
    <header class="header">
      <div class="brand">TROMAS</div>
      <div class="sub">AeroSpin Passive Ventilation Assessment Report</div>
      <div class="meta">Report ID: ${reportId} | Generated: ${generatedAt}</div>
    </header>

    <section class="section">
      <div class="section-head">Project Summary</div>
      <div class="kpi-wrap">
        <table class="kpi-table" aria-label="Project summary metrics">
          <tr><td>Roof Length</td><td>${results.roofArea.textContent}</td></tr>
          <tr><td>Climate Zone</td><td>${results.totalLmProvided.textContent}</td></tr>
          <tr><td>Ventilation Requirement</td><td>${results.requiredHighLevelVentilation.textContent}</td></tr>
          <tr><td>Spacing Guide</td><td>${results.requiredLmEquivalent.textContent}</td></tr>
          <tr><td>Climate Profile</td><td>${results.climateSummary.textContent}</td></tr>
        </table>
        <div class="hero-number">
          <div class="value">${results.requiredUnits.textContent}</div>
          <div class="label">Recommended AeroSpin 500 Units</div>
        </div>
      </div>
    </section>

    <section class="assessment">
      <h3>${climateAssessmentTitle}</h3>
      <p>${results.notes.textContent}</p>
      <ul>
        <li>Passive roof ventilation strategy aligned to provided roof conditions.</li>
        <li>Compliant airflow pathways should be confirmed during installer review.</li>
        <li>Final specification to be verified against applicable NCC provisions.</li>
      </ul>
    </section>

    <footer class="footer">
      <div class="tag">Engineered For Australian Conditions</div>
      <p>Indicative assessment only. Final ventilation requirements must be confirmed by a qualified installer, engineer, or certifier in accordance with applicable NCC provisions.</p>
    </footer>
  </div>
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
  const mailtoUrl = `mailto:viveka@srsc.net.au?subject=${subject}&body=${body}`;
  try {
    const link = document.createElement("a");
    link.href = mailtoUrl;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      results.notes.textContent = "If your email app did not open, please email viveka@srsc.net.au and paste the copied results.";
    }, 1200);
  } catch {
    results.notes.textContent = "Could not open your email app. Please email viveka@srsc.net.au manually.";
  }
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
