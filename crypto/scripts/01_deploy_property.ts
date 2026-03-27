import { network } from "hardhat";
import { readDeployments, writeDeployments } from "./shared.js";

async function main() {
  const { ethers } = await network.connect();
  const [backendOperator, treasury] = await ethers.getSigners();
  const current = await readDeployments();

  if (!current?.contracts.kycRegistry || !current.contracts.transferGate) {
    throw new Error("Core contracts must be deployed before the property factory.");
  }

  const PropertyFactory = await ethers.getContractFactory("PropertyFactory");
  const propertyFactory = await PropertyFactory.deploy(
    backendOperator.address,
    current.contracts.transferGate,
  );
  await propertyFactory.waitForDeployment();

  const chain = await ethers.provider.getNetwork();
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
      kycRegistry: current.contracts.kycRegistry,
      transferGate: current.contracts.transferGate,
      propertyFactory: await propertyFactory.getAddress(),
    },
  };

  await writeDeployments(manifest);
  console.log(JSON.stringify(manifest, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
