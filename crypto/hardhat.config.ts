import { defineConfig, type HardhatUserConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import * as dotenv from "dotenv";

dotenv.config();

const mnemonic =
  process.env.BLOCKCHAIN_MNEMONIC ??
  "test test test test test test test test test test test junk";

const networks: HardhatUserConfig["networks"] = {
  default: {
    type: "edr-simulated",
    chainType: "l1",
    accounts: {
      mnemonic,
      initialIndex: 0,
      count: 10,
    },
  },
  localhost: {
    type: "http",
    chainType: "l1",
    url: process.env.RPC_LOCALHOST ?? "http://127.0.0.1:8545",
    accounts: {
      mnemonic,
      initialIndex: 0,
      count: 10,
    },
  },
};

if (process.env.RPC_SEPOLIA) {
  networks.sepolia = {
    type: "http",
    chainType: "l1",
    url: process.env.RPC_SEPOLIA,
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  };
}

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks,
});
