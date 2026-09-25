const $ = (id) => document.getElementById(id);
let profile = null;
let lastSimulation = null;
const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const monthIds = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
function number(value, digits = 0) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
  }).format(value);
}
function showMessage(text, good = false) {
  $("profileMessage").textContent = text;
  $("profileMessage").style.color = good ? "#285c3d" : "#657268";
}
function makeMonthInputs() {
  $("monthsGrid").innerHTML = monthNames
    .map(
      (month, i) => ` <div class="month-field"><label for="${monthIds[i]}">${month}</label> <input id="${monthIds[i]}" type="number" min="0" step="1" placeholder="kWh" aria-label="${month} electricity in kWh"></div> `
    )
    .join("");
  monthIds.forEach((id) => $(id).addEventListener("input", drawMonthlyChart));
}
function createProfile(event) {
  event.preventDefault();
  const name = $("buildingName").value.trim();
  const type = $("buildingType").value;
  const area = Number($("floorArea").value);
  const occupancy = Number($("occupancy").value);
  const days = Number($("operatingDays").value);
  const hours = Number($("operatingHours").value);
  const annual = Number($("annualEnergy").value);
  if (
    !name ||
    !type ||
    ![area, occupancy, days, hours, annual].every(Number.isFinite) ||
    area <= 0 ||
    occupancy <= 0 ||
    days <= 0 ||
    days > 365 ||
    hours <= 0 ||
    hours > 24 ||
    annual <= 0
  ) {
    showMessage("Please complete every field with valid values.");
    return;
  }
  profile = {
    name,
    type,
    area,
    occupancy,
    days,
    hours,
    annual,
    epi: annual / area,
  };
  $("metricEnergy").textContent = number(annual);
  $("metricEpi").textContent = number(profile.epi, 2);
  $("metricArea").textContent = number(area);
  $("metricOccupancy").textContent = number(occupancy);
  $("baselineName").textContent = name;
  $("baselineDetail").textContent = `${type} building • ${number( days )} operating days/year • ${number(hours, 1)} hours/day`;
  showMessage("Building profile created. You can now run a scenario.", true);
  $("resultPrompt").hidden = false;
  $("resultsContent").hidden = true;
  lastSimulation = null;
  document
    .querySelector("#dashboard")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}
function fillExample() {
  const values = [
    8000, 7500, 8200, 9000, 10500, 9800, 9200, 9400, 8800, 8500, 7800, 9000,
  ];
  monthIds.forEach((id, i) => ($(id).value = values[i]));
  drawMonthlyChart();
}
function drawMonthlyChart() {
  const values = monthIds.map((id) =>
    $(id) && $(id).value.trim() !== "" ? Number($(id).value) : null
  );
  const valid = values.filter(
    (v) => v !== null && Number.isFinite(v) && v >= 0
  );
  if (!valid.length) {
    $("monthChart").innerHTML =
      '<p class="empty-chart">Add monthly values or fill the illustrative example to see the chart.</p>';
    return;
  }
  const max = Math.max(...valid, 1);
  $("monthChart").innerHTML = values
    .map((v, i) => {
      const usable = v !== null && Number.isFinite(v) && v >= 0;
      const height = usable ? Math.max(2, (v / max) * 100) : 0;
      return `<div class="bar-column" title="${monthNames[i]}: ${ usable ? number(v) + " kWh" : "not entered" }"> <div class="bar" style="height:${height}%"></div><span>${ monthNames[i] }</span></div>`;
    })
    .join("");
}
function runScenario() {
  if (!profile) {
    showMessage("Create a valid building profile first.");
    $("profile").scrollIntoView({ behavior: "smooth" });
    return;
  }
  const reduction = Number($("reduction").value) / 100;
  const cost = Number($("cost").value);
  const tariff = Number($("tariff").value);
  const factor = Number($("carbonFactor").value);
  if (
    ![reduction, cost, tariff, factor].every(Number.isFinite) ||
    reduction <= 0 ||
    cost < 0 ||
    tariff < 0 ||
    factor < 0
  ) {
    alert("Please enter valid non-negative scenario values.");
    return;
  }
  const saved = profile.annual * reduction;
  const scenarioEnergy = profile.annual - saved;
  const billSaving = saved * tariff;
  const carbon = saved * factor;
  const payback = billSaving > 0 ? cost / billSaving : null;
  const type = $("scenarioType").selectedOptions[0].textContent;
  lastSimulation = {
    type,
    reduction: reduction * 100,
    cost,
    tariff,
    factor,
    saved,
    scenarioEnergy,
    billSaving,
    carbon,
    payback,
  };
  $("resultPrompt").hidden = true;
  $("resultsContent").hidden = false;
  $("savedEnergy").textContent = number(saved);
  $("savedPercent").textContent = number(reduction * 100, 1) + "%";
  $("savedCost").textContent = money(billSaving);
  $("savedCarbon").textContent = number(carbon) + "";
  $("comparisonTitle").textContent = `${type}: baseline vs scenario`;
  $("baselineCompare").textContent = `${number(profile.annual)} kWh`;
  $("scenarioCompare").textContent = `${number(scenarioEnergy)} kWh`;
  $("baselineBar").style.width = "100%";
  $("scenarioBar").style.width = `${Math.max( 0, (scenarioEnergy / profile.annual) * 100 )}%`;
  $("payback").textContent =
    payback === null
      ? "Not available"
      : payback === 0
      ? "0 years"
      : `${number(payback, 1)} years`;
  $("recommendation").textContent =
    billSaving <= 0
      ? "With a zero tariff or no energy savings, simple payback cannot be meaningfully estimated."
      : payback <= 3
      ? "Under these assumptions, the simple payback is within 3 years. Check costs and savings against real data."
      : payback <= 8
      ? "Under these assumptions, payback is within 8 years. Compare feasibility and the reliability of the inputs."
      : "Under these assumptions, payback is longer than 8 years. Review cost, expected reduction and practical constraints.";
  $("results").scrollIntoView({ behavior: "smooth", block: "start" });
}
function exportSummary() {
  if (!profile) {
    alert("Create a building profile before exporting a summary.");
    return;
  }
  const lines = [
    "BUILDWISE — BUILDING ENERGY WHAT-IF SUMMARY",
    "===========================================",
    `Building: ${profile.name}`,
    `Type: ${profile.type}`,
    `Floor area: ${number(profile.area)} m²`,
    `Average occupancy: ${number(profile.occupancy)}`,
    `Operating days/year: ${number(profile.days)}`,
    `Operating hours/day: ${number(profile.hours)}`,
    `Annual baseline electricity: ${number(profile.annual)} kWh`,
    `Baseline EPI: ${number(profile.epi, 2)} kWh/m²/year`,
    "",
    "SCENARIO",
  ];
  if (lastSimulation) {
    lines.push(
      `Measure: ${lastSimulation.type}`,
      `Assumed reduction: ${number(lastSimulation.reduction, 1)}%`,
      `Estimated scenario electricity: ${number( lastSimulation.scenarioEnergy )} kWh/year`,
      `Estimated energy saved: ${number(lastSimulation.saved)} kWh/year`,
      `Estimated annual bill saving: ${money(lastSimulation.billSaving)}`,
      `Grid emission factor used: ${number( lastSimulation.factor, 3 )} kg CO2/kWh`,
      `Estimated avoided emissions: ${number( lastSimulation.carbon )} kg CO2/year`,
      `Estimated implementation cost: ${money(lastSimulation.cost)}`,
      `Indicative simple payback: ${ lastSimulation.payback === null ? "Not available" : number(lastSimulation.payback, 1) + " years" }`
    );
  } else {
    lines.push("No scenario has been run yet.");
  }
  lines.push(
    "",
    "LIMITATION: Outputs are illustrative estimates based on user-entered assumptions. They are not measured savings or a professional energy audit."
  );
  const blob = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "BUILDWISE_summary.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
makeMonthInputs();
$("profileForm").addEventListener("submit", createProfile);
$("fillExample").addEventListener("click", fillExample);
$("reduction").addEventListener(
  "input",
  () => ($("reductionValue").textContent = $("reduction").value)
);
$("runScenario").addEventListener("click", runScenario);
$("exportReport").addEventListener("click", exportSummary);
