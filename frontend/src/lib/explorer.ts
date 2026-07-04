const SEPOLIA_CHAIN_ID = 11155111;
const LOCAL_EXPLORER_BASE_URL = 'http://localhost:5100';
const SEPOLIA_EXPLORER_BASE_URL = 'https://sepolia.etherscan.io';

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '31337');

const DEFAULT_EXPLORER_BASE_URL =
  chainId === SEPOLIA_CHAIN_ID ? SEPOLIA_EXPLORER_BASE_URL : LOCAL_EXPLORER_BASE_URL;

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
