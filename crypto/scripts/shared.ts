import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type DeploymentManifest = {
  network: string;
  chainId: number;
  deployedAt: string;
  backendOperator: {
    address: string;
    accountIndex: number;
  };
  treasury: {
    address: string;
    accountIndex: number;
  };
  contracts: {
    kycRegistry: string | null;
    transferGate: string | null;
    propertyFactory: string | null;
  };
};

export function getDeploymentsPath() {
  return process.env.DEPLOYMENTS_FILE?.trim() || resolve(process.cwd(), "deployments", "local.json");
}

export async function readDeployments(): Promise<DeploymentManifest | null> {
  try {
    const file = await readFile(getDeploymentsPath(), "utf8");
    return JSON.parse(file) as DeploymentManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function writeDeployments(manifest: DeploymentManifest) {
  const filePath = getDeploymentsPath();
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}
