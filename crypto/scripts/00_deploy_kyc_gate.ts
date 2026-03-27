import { network } from "hardhat";
import { readDeployments, writeDeployments } from "./shared.js";

async function main() {
  const { ethers } = await network.connect();
  const [backendOperator, treasury] = await ethers.getSigners();
  const current = await readDeployments();
  const chain = await ethers.provider.getNetwork();

  const KYCRegistry = await ethers.getContractFactory("KYCRegistry");
  const kycRegistry = await KYCRegistry.deploy(backendOperator.address);
  await kycRegistry.waitForDeployment();

  const TransferGate = await ethers.getContractFactory("TransferGate");
  const transferGate = await TransferGate.deploy(await kycRegistry.getAddress());
  await transferGate.waitForDeployment();

  const manifest = {
    network: "localhost",
    chainId: Number(chain.chainId),
    deployedAt: new Date().toISOString(),
    backendOperator: {
      address: backendOperator.address,
      accountIndex: Number(process.env.BLOCKCHAIN_BACKEND_ACCOUNT_INDEX ?? 0),
    },
    treasury: {
      address: treasury.address,
      accountIndex: Number(process.env.BLOCKCHAIN_TREASURY_ACCOUNT_INDEX ?? 1),
    },
    contracts: {
      kycRegistry: await kycRegistry.getAddress(),
      transferGate: await transferGate.getAddress(),
      propertyFactory: current?.contracts.propertyFactory ?? null,
    },
  };

  await writeDeployments(manifest);
  console.log(JSON.stringify(manifest, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
