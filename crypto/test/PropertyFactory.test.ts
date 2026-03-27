import { expect } from "chai";
import { network } from "hardhat";

describe("PropertyFactory", () => {
  async function deployAll() {
    const { ethers } = await network.connect();
    const [backend, userA] = await ethers.getSigners();

    const KYC = await ethers.getContractFactory("KYCRegistry");
    const kyc = await KYC.deploy(backend.address);
    await kyc.waitForDeployment();

    const Gate = await ethers.getContractFactory("TransferGate");
    const gate = await Gate.deploy(await kyc.getAddress());
    await gate.waitForDeployment();

    const Factory = await ethers.getContractFactory("PropertyFactory");
    const factory = await Factory.deploy(backend.address, await gate.getAddress());
    await factory.waitForDeployment();

    return { ethers, backend, userA, kyc, gate, factory };
  }

  it("only backend can create properties", async () => {
    const { ethers, userA, factory } = await deployAll();
    const metadataHash = ethers.id("property-metadata");

    await expect(
      factory
        .connect(userA)
        .createProperty("Test Property", "TST", "ipfs://meta", metadataHash)
    )
      .to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount")
      .withArgs(userA.address);
  });

  it("creates property with backend as admin and global gate", async () => {
    const { ethers, backend, gate, factory } = await deployAll();
    const metadataHash = ethers.id("property-metadata");

    const tx = await factory
      .connect(backend)
      .createProperty("Test Property", "TST", "ipfs://meta", metadataHash);
    await tx.wait();

    expect(await factory.propertyCount()).to.equal(1);

    const info = await factory.propertyAt(0);
    expect(info.token).to.not.equal(ethers.ZeroAddress);
    expect(info.gate).to.equal(await gate.getAddress());
    expect(info.admin).to.equal(backend.address);
    expect(info.metadataURI).to.equal("ipfs://meta");
    expect(info.metadataHash).to.equal(metadataHash);

    const property = await ethers.getContractAt("PropertyShares", info.token);
    expect(await property.gate()).to.equal(await gate.getAddress());

    const adminRole = await property.DEFAULT_ADMIN_ROLE();
    const minterRole = await property.MINTER_ROLE();
    expect(await property.hasRole(adminRole, backend.address)).to.equal(true);
    expect(await property.hasRole(minterRole, backend.address)).to.equal(true);
  });
});
