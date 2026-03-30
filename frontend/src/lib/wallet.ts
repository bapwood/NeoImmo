type EthereumRequestArguments = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

type EthereumProvider = {
  request(args: EthereumRequestArguments): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const localChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '31337');
const localChainIdHex = `0x${localChainId.toString(16)}`;
const localChainRpcUrl = process.env.NEXT_PUBLIC_CHAIN_RPC_URL ?? 'http://127.0.0.1:8545';

function getProvider() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask ou une wallet EVM compatible est nécessaire pour signer l’achat.');
  }

  return window.ethereum;
}

function encodeHexQuantity(value: bigint | string | number) {
  const normalized = typeof value === 'bigint' ? value : BigInt(value);
  return `0x${normalized.toString(16)}`;
}

export async function requestWalletAccounts() {
  const provider = getProvider();
  const accounts = await provider.request({
    method: 'eth_requestAccounts',
  });

  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error('Aucune wallet n’a été autorisée dans le navigateur.');
  }

  return accounts.map((account) => String(account));
}

export async function readWalletAccounts() {
  const provider = getProvider();
  const accounts = await provider.request({
    method: 'eth_accounts',
  });

  if (!Array.isArray(accounts)) {
    return [];
  }

  return accounts.map((account) => String(account));
}

export async function readConnectedWalletAccount() {
  const accounts = await readWalletAccounts();
  return accounts[0] ?? null;
}

export async function ensureSupportedChain() {
  const provider = getProvider();

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: localChainIdHex }],
    });
    return;
  } catch {
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: localChainIdHex,
          chainName: 'NeoImmo Local',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: [localChainRpcUrl],
        },
      ],
    });
  }
}

export async function ensureExpectedWallet(expectedWalletAddress: string) {
  const accounts = await requestWalletAccounts();
  const activeAccount = accounts[0];

  if (activeAccount.toLowerCase() !== expectedWalletAddress.toLowerCase()) {
    throw new Error(
      `La wallet connectée (${activeAccount}) ne correspond pas à celle enregistrée sur votre profil (${expectedWalletAddress}).`,
    );
  }

  return activeAccount;
}

export function subscribeWalletEvents(listener: () => void) {
  if (typeof window === 'undefined' || !window.ethereum) {
    return () => undefined;
  }

  const provider = window.ethereum;

  if (!provider.on || !provider.removeListener) {
    return () => undefined;
  }

  provider.on('accountsChanged', listener);
  provider.on('chainChanged', listener);

  return () => {
    provider.removeListener?.('accountsChanged', listener);
    provider.removeListener?.('chainChanged', listener);
  };
}

export async function signTypedData<T extends object>(
  account: string,
  typedData: T,
) {
  const provider = getProvider();
  const signature = await provider.request({
    method: 'eth_signTypedData_v4',
    params: [account, JSON.stringify(typedData)],
  });

  return String(signature);
}

export async function sendNativeTransaction(payload: {
  from: string;
  to: string;
  valueWei: bigint | string | number;
}) {
  const provider = getProvider();
  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: payload.from,
        to: payload.to,
        value: encodeHexQuantity(payload.valueWei),
      },
    ],
  });

  return String(txHash);
}

export async function waitForTransactionReceipt(
  txHash: string,
  timeoutMs = 20_000,
) {
  const provider = getProvider();
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    });

    if (receipt) {
      return receipt;
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, 800);
    });
  }

  throw new Error('La transaction a été envoyée mais la confirmation tarde à remonter.');
}
