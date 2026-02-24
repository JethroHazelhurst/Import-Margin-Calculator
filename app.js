const $ = (id) => document.getElementById(id);

// Inputs
const rateEl = $("rate");
const usdCostEl = $("usdCost");
const multiplierEl = $("multiplier");
const marginEl = $("margin");

// Outputs
const netCostGBPEl = $("netCostGBP");
const sellNetEl = $("sellNet");
const grossRawEl = $("grossRaw"); // editable
const sellGrossEl = $("sellGross");
const finalProfitEl = $("finalProfit");

// UI
const toastEl = $("toast");
const resetBtn = $("resetBtn");
const copyBtn = $("copyBtn");

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

// ---------- toast ----------
let toastTimer = null;
let lastCopied = "";
let lastSellGross = 0;

function showToast(message = "Copied") {
  toastEl.textContent = message;
  toastEl.classList.remove("opacity-0", "translate-y-2");
  toastEl.classList.add("opacity-100", "translate-y-0");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.add("opacity-0", "translate-y-2");
    toastEl.classList.remove("opacity-100", "translate-y-0");
  }, 900);
}

async function copyToClipboard(text) {
  if (!text || text === lastCopied) return;
  lastCopied = text;

  try {
    await navigator.clipboard.writeText(text);
    showToast(`Copied: ${text}`);
  } catch {
    showToast("Copy failed");
  }
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

  lastSellGross = sellGross;
}

function calcFromInputs() {
  manualGrossMode = false;

  const netCostGBP = computeNetCostGBP();
  const targetMargin = num(marginEl) / 100;

  const sellNet =
    targetMargin >= 1 ? 0 : netCostGBP / (1 - targetMargin);

  const grossRaw = sellNet * (1 + VAT_RATE);

  // Profit based on grossRaw
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

  // Update margin input to reflect implied margin
  const impliedMargin =
    sellNet === 0 ? 0 : (sellNet - netCostGBP) / sellNet;

  marginEl.value = (impliedMargin * 100).toFixed(2);

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
    el.addEventListener("input", () => {
      if (!editingGrossRaw) calcFromInputs();
    });
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

  resetBtn.addEventListener("click", () => {
    rateEl.value = "0.73";
    usdCostEl.value = "1";
    multiplierEl.value = "1.2";
    marginEl.value = "40";
    grossRawEl.value = "";
    manualGrossMode = false;
    editingGrossRaw = false;
    lastCopied = "";
    calcFromInputs();
  });

  copyBtn.addEventListener("click", async () => {
    const grossPlain = Number.isFinite(lastSellGross)
      ? lastSellGross.toFixed(2)
      : "";

    if (!grossPlain) {
      showToast("Nothing to copy");
      return;
    }

    await copyToClipboard(grossPlain);
  });

  calcFromInputs();
}

wire();
