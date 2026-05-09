export type CurrencyCode = "EUR" | "USD" | "GBP" | string;

export type ApiHealth = {
  status: "ok";
  service: string;
  timestamp: string;
};
