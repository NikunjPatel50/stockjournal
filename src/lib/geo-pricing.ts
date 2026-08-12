export type PricingCurrency = "USD" | "INR";

export type LocalizedPrice = {
  amount: number;
  currency: PricingCurrency;
  formatted: string;
  period: string;
};

const FREE_LABEL_BY_COUNTRY: Record<string, PricingCurrency> = {
  IN: "INR",
};

function formatAmount(amount: number, currency: PricingCurrency) {
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Localized display for the free tier (always zero). */
export function getFreePriceForCountry(
  countryCode?: string | null
): LocalizedPrice {
  const code = countryCode?.trim().toUpperCase() || "";
  const currency: PricingCurrency = FREE_LABEL_BY_COUNTRY[code] ?? "INR";

  return {
    amount: 0,
    currency,
    formatted: formatAmount(0, currency),
    period: "/mo",
  };
}
