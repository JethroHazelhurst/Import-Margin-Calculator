// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);

// Inputs
const rateEl = $("rate");
const usdCostEl = $("usdCost");
const multiplierEl = $("multiplier");
const marginEl = $("margin");
const vatEl = $("vat");

// Outputs
const netCostGBPEl = $("netCostGBP");
const sellNetEl = $("sellNet");
const sellGrossEl = $("sellGross"); // Final RRP gross (.95 rounded)
const grossRawEl = $("grossRaw");   // Actual gross (VAT applied, not .95 rounded)
const profitEl = $("profit");
const finalProfitEl = $("finalProfit");
const markupEl = $("markup");

// Live math (under notes)
const liveMathEl = $("liveMath");

// UI
const toastEl = $("toast");
const resetBtn = $("resetBtn");

// ---------- formatters ----------
const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pct = new Intl.NumberFormat("en-GB", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// ---------- math helpers ----------
// Always round UP to 2 decimals (0.876 -> 0.88)
function roundUp2(n) {
  return Math.ceil(n * 100) / 100;
}

// Round UP to nearest .95 (e.g. 1.76 -> 1.95, 1.96 -> 2.95)
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

// ---------- toast + clipboard ----------
let toastTimer = null;
let lastCopied = ""; // avoid re-copying the same value repeatedly

function showToast(message = "Copied") {
  if (!toastEl) return;

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
  } catch (err) {
    // Fallback for restricted contexts
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();

    const ok = document.execCommand("copy");
    document.body.removeChild(ta);

    if (ok) showToast(`Copied: ${text}`);
    else showToast("Copy failed (browser blocked)");
  }
}

// ---------- main calc ----------
async function calc() {
  const rate = num(rateEl); // USD->GBP
  const usdCost = num(usdCostEl);
  const multiplier = num(multiplierEl);
  const marginPct = num(marginEl); // e.g. 40
  const vatPct = num(vatEl); // e.g. 20

  const margin = marginPct / 100;
  const vat = vatPct / 100;

  // USD -> GBP -> freight multiplier
  const rawGBP = usdCost * rate * multiplier;

  // Rounded net cost (UP to 2dp)
  const netCostGBP = roundUp2(rawGBP);

  // Sell net from margin: sellNet = cost / (1 - margin)
  const sellNet = margin >= 1 ? 0 : netCostGBP / (1 - margin);
  const profit = sellNet - netCostGBP;

  // Markup = profit / cost
  const markup = netCostGBP === 0 ? 0 : profit / netCostGBP;

  // Actual gross (VAT applied, NO .95 rounding)
  const grossRaw = sellNet * (1 + vat);

  // Final RRP gross (rounded UP to nearest .95)
  const sellGross = roundUpTo95(grossRaw);
  
  // Reverse VAT to get net selling price from final RRP
  const finalSellNet = sellGross / (1 + vat);

  // True profit based on FINAL RRP
  const finalProfit = finalSellNet - netCostGBP;

  // Render main cards
  netCostGBPEl.textContent = gbp.format(netCostGBP);
  sellNetEl.textContent = gbp.format(sellNet);
  profitEl.textContent = gbp.format(profit);
  finalProfitEl.textContent = gbp.format(finalProfit);
  markupEl.textContent = pct.format(markup);

  if (grossRawEl) grossRawEl.textContent = gbp.format(grossRaw);
  sellGrossEl.textContent = gbp.format(sellGross);

  // Render live math under notes
  if (liveMathEl) {
    const usdToGbp = usdCost * rate;
    const freightApplied = usdToGbp * multiplier;

    const marginFactor = 1 - margin;
    const vatFactor = 1 + vat;

    liveMathEl.textContent =
  `Calculation steps:

  USD → GBP:
  ${usdCost.toFixed(2)} × ${rate.toFixed(4)} = ${usdToGbp.toFixed(4)}

  Freight multiplier:
  ${usdToGbp.toFixed(4)} × ${multiplier.toFixed(2)} = ${freightApplied.toFixed(4)}

  Rounded net cost:
  roundUp2(${freightApplied.toFixed(4)}) = £${netCostGBP.toFixed(2)}

  After margin:
  £${netCostGBP.toFixed(2)} ÷ (1 − ${margin.toFixed(2)}) = £${sellNet.toFixed(2)}

  VAT added:
  £${sellNet.toFixed(2)} × ${vatFactor.toFixed(2)} = £${grossRaw.toFixed(2)}

  Final RRP (.95 rounding):
  roundTo95(£${grossRaw.toFixed(2)}) = £${sellGross.toFixed(2)}
  `;
  }

  // Copy final RRP gross to clipboard (plain number, e.g. "17.95")
  const grossPlain = sellGross.toFixed(2);
  await copyToClipboard(grossPlain);
}

// ---------- wire up ----------
function wire() {
  [rateEl, usdCostEl, multiplierEl, marginEl, vatEl].forEach((el) => {
    el.addEventListener("input", calc);
    el.addEventListener("change", calc);
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      rateEl.value = "0.73";
      usdCostEl.value = "1";
      multiplierEl.value = "1.2";
      marginEl.value = "40";
      vatEl.value = "20";
      lastCopied = ""; // force copy after reset
      calc();
    });
  }

  calc();
}

wire();
