const $ = (id) => document.getElementById(id);

// Inputs
const rateEl = $("rate");
const usdCostEl = $("usdCost");
const multiplierEl = $("multiplier");
const marginEl = $("margin");

// Outputs
const netCostGBPEl = $("netCostGBP");
const sellNetEl = $("sellNet");
const grossRawEl = $("grossRaw");
const sellGrossEl = $("sellGross");
const finalProfitEl = $("finalProfit");

const VAT_RATE = 0.20;

// Number formatting (no £ symbol)
const money = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function roundUp2(n) {
  return Math.ceil(n * 100) / 100;
}

function roundUpTo95(value) {
  const integerPart = Math.floor(value);
  const decimalPart = value - integerPart;
  if (decimalPart <= 0.95) return integerPart + 0.95;
  return integerPart + 1 + 0.95;
}

function num(el) {
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : 0;
}

// ---------- calculation ----------
let manualGrossMode = false;
let editingGrossRaw = false;

function computeNetCostGBP() {
  const rawGBP = num(usdCostEl) * num(rateEl) * num(multiplierEl);
  return roundUp2(rawGBP);
}

function render({
  netCostGBP,
  sellNet,
  grossRaw,
  sellGross,
  finalProfit,
}) {
  netCostGBPEl.value = money.format(netCostGBP);
  sellNetEl.value = money.format(sellNet);

  if (!manualGrossMode && !editingGrossRaw) {
    grossRawEl.value = grossRaw.toFixed(2);
  }

  sellGrossEl.value = money.format(sellGross);
  finalProfitEl.value = money.format(finalProfit);
}

function calcFromInputs() {
  manualGrossMode = false;

  const netCostGBP = computeNetCostGBP();
  const targetMargin = num(marginEl) / 100;

  const sellNet =
    targetMargin >= 1 ? 0 : netCostGBP / (1 - targetMargin);

  const grossRaw = sellNet * (1 + VAT_RATE);

  const sellNetFromGross = grossRaw / (1 + VAT_RATE);
  const finalProfit = sellNetFromGross - netCostGBP;

  const sellGross = roundUpTo95(grossRaw);

  render({
    netCostGBP,
    sellNet,
    grossRaw,
    sellGross,
    finalProfit,
  });
}

function calcFromGross() {
  if (grossRawEl.value.trim() === "") {
    manualGrossMode = false;
    calcFromInputs();
    return;
  }

  manualGrossMode = true;

  const netCostGBP = computeNetCostGBP();
  const grossRaw = num(grossRawEl);

  const sellNet = grossRaw / (1 + VAT_RATE);

  const impliedMargin =
    sellNet === 0 ? 0 : (sellNet - netCostGBP) / sellNet;

  const impliedPct = Math.min(99, Math.max(0, impliedMargin * 100));
  marginEl.value = impliedPct.toFixed(2);

  const finalProfit = sellNet - netCostGBP;
  const sellGross = roundUpTo95(grossRaw);

  render({
    netCostGBP,
    sellNet,
    grossRaw,
    sellGross,
    finalProfit,
  });
}

// ---------- wire up ----------
function wire() {
  [rateEl, usdCostEl, multiplierEl, marginEl].forEach((el) => {
    const handler = () => {
      if (!editingGrossRaw) calcFromInputs();
    };
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  });

  grossRawEl.addEventListener("focus", () => {
    editingGrossRaw = true;
  });

  grossRawEl.addEventListener("blur", () => {
    editingGrossRaw = false;

    if (grossRawEl.value.trim() !== "") {
      const v = num(grossRawEl);
      grossRawEl.value = Number.isFinite(v) ? v.toFixed(2) : "";
    }

    calcFromGross();
  });

  grossRawEl.addEventListener("input", calcFromGross);

  calcFromInputs();
}

wire();
