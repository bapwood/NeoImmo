const DEFAULT_EXPLORER_BASE_URL = 'http://localhost:5100';

export const EXPLORER_BASE_URL =
  process.env.NEXT_PUBLIC_EXPLORER_BASE_URL ?? DEFAULT_EXPLORER_BASE_URL;

function normalizeBaseUrl(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function buildExplorerTransactionUrl(txHash: string | null | undefined) {
  if (!txHash) {
    return '';
  }

  return `${normalizeBaseUrl(EXPLORER_BASE_URL)}/tx/${encodeURIComponent(txHash)}`;
}

export function buildExplorerAddressUrl(address: string | null | undefined) {
  if (!address) {
    return '';
  }

  return `${normalizeBaseUrl(EXPLORER_BASE_URL)}/address/${encodeURIComponent(address)}`;
}
