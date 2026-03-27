import { expect } from "chai";
import { network } from "hardhat";
import { randomUUID } from "node:crypto";
import { createServer, request } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

type JsonValue = Record<string, unknown>;
type HttpResult = { status: number; json: JsonValue | null };
type MarketplaceMessage = {
  action: string;
  wallet: string;
  to: string;
  propertyAddress: string;
  amount: string;
  price: string;
  currency: string;
  nonce: string;
  deadline: string;
};

const MARKETPLACE_TYPES = {
  MarketplaceAction: [
    { name: "action", type: "string" },
    { name: "wallet", type: "address" },
    { name: "to", type: "address" },
    { name: "propertyAddress", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "price", type: "uint256" },
    { name: "currency", type: "string" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

async function readJson(req: IncomingMessage): Promise<JsonValue> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as JsonValue;
}

function sendJson(res: ServerResponse, status: number, payload: JsonValue) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
}

async function createFakeBackend(params: {
  ethers: any;
  admin: any;
  kyc: any;
  gate: any;
  property: any;
}) {
  const propertyAddress = await params.property.getAddress();
  const network = await params.ethers.provider.getNetwork();
  const domain = {
    name: "RealEstateMarketplace",
    version: "1",
    chainId: Number(network.chainId),
    verifyingContract: propertyAddress,
  };
  const pending = new Map<string, MarketplaceMessage>();

  const server = createServer((req, res) => {
    void handleRequest(req, res);
  });

  async function handleRequest(req: IncomingMessage, res: ServerResponse) {
    try {
      const url = req.url ?? "/";
      if (req.method === "GET" && url === "/health") {
        sendJson(res, 200, { status: "ok" });
        return;
      }

      if (req.method !== "POST") {
        sendJson(res, 404, { error: "not found" });
        return;
      }

      const body = await readJson(req);
      const ethers = params.ethers;

      if (url === "/kyc/allow") {
        const tx = await params.kyc
          .connect(params.admin)
          .setAllowed(body.address as string, body.allowed as boolean);
        await tx.wait();
        sendJson(res, 200, { txHash: tx.hash });
        return;
      }

      if (url === "/kyc/country") {
        const tx = await params.kyc
          .connect(params.admin)
          .setCountry(body.address as string, body.country as string);
        await tx.wait();
        sendJson(res, 200, { txHash: tx.hash });
        return;
      }

      if (url === "/gate/blocked-countries") {
        const tx = await params.gate
          .connect(params.admin)
          .setBlockedCountry(body.country as string, body.blocked as boolean);
        await tx.wait();
        sendJson(res, 200, { txHash: tx.hash });
        return;
      }

      if (url === "/gate/blocklist") {
        const tx = await params.gate
          .connect(params.admin)
          .setBlocklist(body.address as string, body.blocked as boolean);
        await tx.wait();
        sendJson(res, 200, { txHash: tx.hash });
        return;
      }

      if (url === "/marketplace/prepare") {
        const message: MarketplaceMessage = {
          action: String(body.action ?? ""),
          wallet: String(body.wallet ?? ""),
          to: String(body.to ?? body.wallet ?? ""),
          propertyAddress: String(body.propertyAddress ?? ""),
          amount: String(body.amount ?? "0"),
          price: String(body.price ?? "0"),
          currency: String(body.currency ?? ""),
          nonce: String(body.nonce ?? "0"),
          deadline: String(body.deadline ?? "0"),
        };

        if (!message.action || !message.wallet || !message.propertyAddress) {
          sendJson(res, 400, { error: "missing fields" });
          return;
        }
        if (message.propertyAddress !== propertyAddress) {
          sendJson(res, 400, { error: "unknown property" });
          return;
        }
        if (!message.to) {
          sendJson(res, 400, { error: "missing to" });
          return;
        }

        const requestId = randomUUID();
        pending.set(requestId, message);
        sendJson(res, 200, {
          domain,
          types: MARKETPLACE_TYPES,
          message,
          requestId,
        });
        return;
      }

      if (url === "/marketplace/execute") {
        const requestId = String(body.requestId ?? "");
        const signature = String(body.signature ?? "");
        const message = pending.get(requestId);

        if (!requestId || !signature || !message) {
          sendJson(res, 404, { error: "request not found" });
          return;
        }

        const signer = params.ethers.verifyTypedData(
          domain,
          MARKETPLACE_TYPES,
          message,
          signature
        );

        if (signer.toLowerCase() !== message.wallet.toLowerCase()) {
          sendJson(res, 401, { error: "invalid signature" });
          return;
        }

        if (message.deadline !== "0") {
          const now = BigInt(Math.floor(Date.now() / 1000));
          if (BigInt(message.deadline) < now) {
            sendJson(res, 400, { error: "signature expired" });
            return;
          }
        }

        const amount = ethers.parseUnits(message.amount, 18);
        let txHash = "0x0";

        switch (message.action) {
          case "BUY": {
            const tx = await params.property
              .connect(params.admin)
              .transfer(message.to, amount);
            await tx.wait();
            txHash = tx.hash;
            break;
          }
          case "SELL": {
            const tx = await params.property
              .connect(params.admin)
              .transferFrom(message.wallet, params.admin.address, amount);
            await tx.wait();
            txHash = tx.hash;
            break;
          }
          case "TRANSFER": {
            const tx = await params.property
              .connect(params.admin)
              .transferFrom(message.wallet, message.to, amount);
            await tx.wait();
            txHash = tx.hash;
            break;
          }
          case "LIST":
          case "CANCEL":
            txHash = "0x0";
            break;
          default:
            sendJson(res, 400, { error: "unsupported action" });
            return;
        }

        pending.delete(requestId);
        sendJson(res, 200, { txHash });
        return;
      }

      if (url === "/properties/mint") {
        if ((body.propertyAddress as string) !== propertyAddress) {
          sendJson(res, 400, { error: "unknown property" });
          return;
        }
        const amount = ethers.parseUnits(body.amount as string, 18);
        const tx = await params.property
          .connect(params.admin)
          .mint(body.to as string, amount);
        await tx.wait();
        sendJson(res, 200, { txHash: tx.hash });
        return;
      }

      if (url === "/properties/transfer") {
        if ((body.propertyAddress as string) !== propertyAddress) {
          sendJson(res, 400, { error: "unknown property" });
          return;
        }
        const amount = ethers.parseUnits(body.amount as string, 18);
        const tx = await params.property
          .connect(params.admin)
          .transfer(body.to as string, amount);
        await tx.wait();
        sendJson(res, 200, { txHash: tx.hash });
        return;
      }

      sendJson(res, 404, { error: "not found" });
    } catch (error) {
      sendJson(res, 400, { error: (error as Error).message });
    }
  }

  const port = await new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      resolve(address.port);
    });
  });

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

async function requestJson(
  method: "GET" | "POST",
  baseUrl: string,
  path: string,
  body?: JsonValue
): Promise<HttpResult> {
  const url = new URL(path, baseUrl);
  const payload = body ? JSON.stringify(body) : "";
  const headers: Record<string, string> = {};

  if (method === "POST") {
    headers["content-type"] = "application/json";
    headers["content-length"] = String(Buffer.byteLength(payload));
  }

  return new Promise<HttpResult>((resolve, reject) => {
    const req = request({
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers,
    }).on("error", reject);

    req.on("response", (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk as Buffer));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        const json = text ? (JSON.parse(text) as JsonValue) : null;
        resolve({ status: res.statusCode ?? 0, json });
      });
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

describe("Backend integration", () => {
  async function deployAll() {
    const { ethers } = await network.connect();
    const [admin, userA] = await ethers.getSigners();

    const KYC = await ethers.getContractFactory("KYCRegistry");
    const kyc = await KYC.deploy(admin.address);
    await kyc.waitForDeployment();

    const Gate = await ethers.getContractFactory("TransferGate");
    const gate = await Gate.deploy(await kyc.getAddress());
    await gate.waitForDeployment();

    const Prop = await ethers.getContractFactory("PropertyShares");
    const prop = await Prop.deploy(
      "Test Property",
      "TST",
      admin.address,
      await gate.getAddress()
    );
    await prop.waitForDeployment();

    return { ethers, admin, userA, kyc, gate, prop };
  }

  it("backend can KYC users and execute a marketplace buy", async () => {
    const { ethers, admin, userA, kyc, gate, prop } = await deployAll();
    const backend = await createFakeBackend({ ethers, admin, kyc, gate, property: prop });
    const propertyAddress = await prop.getAddress();

    expect(
      await requestJson("GET", backend.baseUrl, "/health")
    ).to.deep.include({ status: 200 });

    await requestJson("POST", backend.baseUrl, "/kyc/allow", {
      address: admin.address,
      allowed: true,
    });
    await requestJson("POST", backend.baseUrl, "/kyc/country", {
      address: admin.address,
      country: "0x4652",
    });
    await requestJson("POST", backend.baseUrl, "/kyc/allow", {
      address: userA.address,
      allowed: true,
    });
    await requestJson("POST", backend.baseUrl, "/kyc/country", {
      address: userA.address,
      country: "0x4652",
    });

    const mint = await requestJson("POST", backend.baseUrl, "/properties/mint", {
      propertyAddress,
      to: admin.address,
      amount: "10",
    });
    expect(mint.status).to.equal(200);

    const prepare = await requestJson(
      "POST",
      backend.baseUrl,
      "/marketplace/prepare",
      {
        action: "BUY",
        wallet: userA.address,
        to: userA.address,
        propertyAddress,
        amount: "3",
        price: "1250",
        currency: "EUR",
        nonce: "1",
        deadline: "0",
      }
    );
    expect(prepare.status).to.equal(200);

    const signature = await userA.signTypedData(
      prepare.json?.domain as any,
      prepare.json?.types as any,
      prepare.json?.message as any
    );

    const execute = await requestJson(
      "POST",
      backend.baseUrl,
      "/marketplace/execute",
      {
        requestId: prepare.json?.requestId,
        signature,
      }
    );
    expect(execute.status).to.equal(200);

    expect(await prop.balanceOf(userA.address)).to.equal(
      ethers.parseUnits("3", 18)
    );

    await backend.close();
  });

  it("marketplace buy fails when recipient is blocklisted", async () => {
    const { ethers, admin, userA, kyc, gate, prop } = await deployAll();
    const backend = await createFakeBackend({ ethers, admin, kyc, gate, property: prop });
    const propertyAddress = await prop.getAddress();

    await requestJson("POST", backend.baseUrl, "/kyc/allow", {
      address: admin.address,
      allowed: true,
    });
    await requestJson("POST", backend.baseUrl, "/kyc/country", {
      address: admin.address,
      country: "0x4652",
    });
    await requestJson("POST", backend.baseUrl, "/kyc/allow", {
      address: userA.address,
      allowed: true,
    });
    await requestJson("POST", backend.baseUrl, "/kyc/country", {
      address: userA.address,
      country: "0x4652",
    });

    await requestJson("POST", backend.baseUrl, "/properties/mint", {
      propertyAddress,
      to: admin.address,
      amount: "5",
    });

    await requestJson("POST", backend.baseUrl, "/gate/blocklist", {
      address: userA.address,
      blocked: true,
    });

    const prepare = await requestJson(
      "POST",
      backend.baseUrl,
      "/marketplace/prepare",
      {
        action: "BUY",
        wallet: userA.address,
        to: userA.address,
        propertyAddress,
        amount: "1",
        price: "1200",
        currency: "EUR",
        nonce: "2",
        deadline: "0",
      }
    );
    expect(prepare.status).to.equal(200);

    const signature = await userA.signTypedData(
      prepare.json?.domain as any,
      prepare.json?.types as any,
      prepare.json?.message as any
    );

    const execute = await requestJson(
      "POST",
      backend.baseUrl,
      "/marketplace/execute",
      {
        requestId: prepare.json?.requestId,
        signature,
      }
    );

    expect(execute.status).to.equal(400);
    expect(execute.json?.error).to.contain("To blocked");
    expect(await prop.balanceOf(userA.address)).to.equal(0n);

    await backend.close();
  });
});
