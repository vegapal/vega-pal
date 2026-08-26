/**
 * Public USDT deposit addresses for VegaPal Pro subscription payments only.
 * These are deposit destinations — never private keys, seeds, or exchange secrets.
 * Do not reuse for customer invoice payment wallets.
 */

export const USDT_SUBSCRIPTION_NETWORKS = [
  "tron_trc20",
  "bsc_bep20",
  "ethereum_erc20",
  "ton",
  "opbnb",
] as const;

export type UsdtSubscriptionNetworkId = (typeof USDT_SUBSCRIPTION_NETWORKS)[number];

export type UsdtSubscriptionNetwork = {
  id: UsdtSubscriptionNetworkId;
  /** Short chip label */
  shortLabel: string;
  /** Full network label for payment instructions */
  label: string;
  address: string;
};

export const USDT_SUBSCRIPTION_DEPOSITS: readonly UsdtSubscriptionNetwork[] = [
  {
    id: "tron_trc20",
    shortLabel: "TRON",
    label: "TRON (TRC20)",
    address: "TFXxmcGnwHkW8UwAFHR5ycHM6rHJytKN7u",
  },
  {
    id: "bsc_bep20",
    shortLabel: "BSC",
    label: "BNB Smart Chain (BEP20)",
    address: "0xFB597F1b4Cf04F4a60bA36730C08e9180Fd932c2",
  },
  {
    id: "ethereum_erc20",
    shortLabel: "Ethereum",
    label: "Ethereum (ERC20)",
    address: "0xFB597F1b4Cf04F4a60bA36730C08e9180Fd932c2",
  },
  {
    id: "ton",
    shortLabel: "TON",
    label: "The Open Network (TON)",
    address: "UQDRM2lpMN--If4UDVDNYSrkS3Boq0N6c01cCfJZXjmgvBz7",
  },
  {
    id: "opbnb",
    shortLabel: "opBNB",
    label: "opBNB",
    address: "0xFB597F1b4Cf04F4a60bA36730C08e9180Fd932c2",
  },
] as const;

export const DEFAULT_USDT_SUBSCRIPTION_NETWORK: UsdtSubscriptionNetworkId = "tron_trc20";

/** Display hint only — not enforced on-chain by VegaPal. */
export const USDT_SUBSCRIPTION_MIN_DEPOSIT = 1;

export function isUsdtSubscriptionNetworkId(value: unknown): value is UsdtSubscriptionNetworkId {
  return (
    typeof value === "string" &&
    (USDT_SUBSCRIPTION_NETWORKS as readonly string[]).includes(value)
  );
}

export function getUsdtSubscriptionDeposit(
  networkId: UsdtSubscriptionNetworkId,
): UsdtSubscriptionNetwork {
  const found = USDT_SUBSCRIPTION_DEPOSITS.find((n) => n.id === networkId);
  if (!found) {
    throw new Error("Unsupported USDT network.");
  }
  return found;
}
