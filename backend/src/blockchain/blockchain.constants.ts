export const KYC_REGISTRY_ABI = [
  'function setAllowed(address user, bool allowed)',
  'function setCountry(address user, bytes2 country)',
  'function isAllowed(address user) view returns (bool)',
  'function countryCode(address user) view returns (bytes2)',
] as const;

export const TRANSFER_GATE_ABI = [
  'function setBlockedCountry(bytes2 cc, bool blocked)',
  'function setBlocklist(address user, bool blocked)',
  'function blockedCountries(bytes2 cc) view returns (bool)',
  'function blocklist(address user) view returns (bool)',
] as const;

export const PROPERTY_FACTORY_ABI = [
  'function createProperty(string name_, string symbol_, string metadataURI, bytes32 metadataHash) returns (address)',
  'function propertyInfo(address token) view returns (tuple(address token, address gate, address admin, string name, string symbol, string metadataURI, bytes32 metadataHash, uint256 createdAt))',
] as const;

export const PROPERTY_SHARES_ABI = [
  'function mint(address to, uint256 amount)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
] as const;

export const MARKETPLACE_TYPES = {
  MarketplaceAction: [
    { name: 'action', type: 'string' },
    { name: 'wallet', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'propertyAddress', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'price', type: 'uint256' },
    { name: 'currency', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

export const ADMIN_PROPERTY_DEPLOY_TYPES = {
  AdminPropertyAction: [
    { name: 'action', type: 'string' },
    { name: 'adminWallet', type: 'address' },
    { name: 'propertyId', type: 'uint256' },
    { name: 'propertyName', type: 'string' },
    { name: 'symbol', type: 'string' },
    { name: 'metadataHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};
