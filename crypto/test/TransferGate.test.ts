import { expect } from "chai";
import { network } from "hardhat";

describe("PropertyShares + TransferGate + KYCRegistry", () => {
  async function deployAll() {
    const { ethers } = await network.connect();
    const [admin, userA, userB, userC] = await ethers.getSigners();

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

    return { ethers, admin, userA, userB, userC, kyc, gate, prop };
  }

  async function allowUser(
    kyc: any,
    admin: any,
    user: any,
    country: string
  ) {
    await (await kyc.connect(admin).setAllowed(user.address, true)).wait();
    await (await kyc.connect(admin).setCountry(user.address, country)).wait();
  }

  it("blocks transfer to non-KYC recipient", async () => {
    const { ethers, admin, userA, userB, kyc, prop } = await deployAll();

    await allowUser(kyc, admin, userA, "0x4652");
    await (await prop.connect(admin).mint(userA.address, ethers.parseUnits("100", 18))).wait();

    await expect(
      prop.connect(userA).transfer(userB.address, ethers.parseUnits("1", 18))
    ).to.be.revertedWith("To KYC missing");
  });

  it("allows transfer when both parties are KYC", async () => {
    const { ethers, admin, userA, userB, kyc, prop } = await deployAll();
    const amount = ethers.parseUnits("3", 18);

    await allowUser(kyc, admin, userA, "0x4652");
    await allowUser(kyc, admin, userB, "0x4652");
    await (await prop.connect(admin).mint(userA.address, amount)).wait();

    await expect(prop.connect(userA).transfer(userB.address, amount)).to.not.revert(
      ethers
    );

    expect(await prop.balanceOf(userB.address)).to.equal(amount);
  });

  it("blocks transfer when sender is not KYC", async () => {
    const { ethers, admin, userA, userB, kyc, prop } = await deployAll();
    const amount = ethers.parseUnits("1", 18);

    await allowUser(kyc, admin, userB, "0x4652");
    await (await prop.connect(admin).mint(userA.address, amount)).wait();

    await expect(
      prop.connect(userA).transfer(userB.address, amount)
    ).to.be.revertedWith("From KYC missing");
  });

  it("blocks transfer when recipient country is blocked", async () => {
    const { ethers, admin, userA, userB, kyc, gate, prop } = await deployAll();
    const amount = ethers.parseUnits("1", 18);

    await allowUser(kyc, admin, userA, "0x4652");
    await allowUser(kyc, admin, userB, "0x5553");

    await (await gate.connect(admin).setBlockedCountry("0x5553", true)).wait();
    await (await prop.connect(admin).mint(userA.address, amount)).wait();

    await expect(
      prop.connect(userA).transfer(userB.address, amount)
    ).to.be.revertedWith("To country blocked");
  });

  it("blocks transfer when sender country is blocked", async () => {
    const { ethers, admin, userA, userB, kyc, gate, prop } = await deployAll();
    const amount = ethers.parseUnits("1", 18);

    await allowUser(kyc, admin, userA, "0x5553");
    await allowUser(kyc, admin, userB, "0x4652");

    await (await gate.connect(admin).setBlockedCountry("0x5553", true)).wait();
    await (await prop.connect(admin).mint(userA.address, amount)).wait();

    await expect(
      prop.connect(userA).transfer(userB.address, amount)
    ).to.be.revertedWith("From country blocked");
  });

  it("blocks transfer when recipient is blocklisted", async () => {
    const { ethers, admin, userA, userB, kyc, gate, prop } = await deployAll();
    const amount = ethers.parseUnits("1", 18);

    await allowUser(kyc, admin, userA, "0x4652");
    await allowUser(kyc, admin, userB, "0x4652");
    await (await gate.connect(admin).setBlocklist(userB.address, true)).wait();
    await (await prop.connect(admin).mint(userA.address, amount)).wait();

    await expect(
      prop.connect(userA).transfer(userB.address, amount)
    ).to.be.revertedWith("To blocked");
  });

  it("blocks transfer when sender is blocklisted", async () => {
    const { ethers, admin, userA, userB, kyc, gate, prop } = await deployAll();
    const amount = ethers.parseUnits("1", 18);

    await allowUser(kyc, admin, userA, "0x4652");
    await allowUser(kyc, admin, userB, "0x4652");
    await (await gate.connect(admin).setBlocklist(userA.address, true)).wait();
    await (await prop.connect(admin).mint(userA.address, amount)).wait();

    await expect(
      prop.connect(userA).transfer(userB.address, amount)
    ).to.be.revertedWith("From blocked");
  });

  it("only owner can update blocklist and blocked countries", async () => {
    const { admin, userA, userB, gate } = await deployAll();

    await expect(
      gate.connect(userA).setBlockedCountry("0x4652", true)
    ).to.be.revertedWith("not owner");

    await expect(
      gate.connect(userB).setBlocklist(admin.address, true)
    ).to.be.revertedWith("not owner");
  });
});
