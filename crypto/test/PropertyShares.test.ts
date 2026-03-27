import { expect } from "chai";
import { network } from "hardhat";

describe("PropertyShares", () => {
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

  it("admin has MINTER_ROLE and can mint", async () => {
    const { ethers, admin, userA, prop } = await deployAll();
    const amount = ethers.parseUnits("10", 18);
    const minterRole = await prop.MINTER_ROLE();

    expect(await prop.hasRole(minterRole, admin.address)).to.equal(true);

    await expect(prop.connect(admin).mint(userA.address, amount)).to.not.revert(
      ethers
    );

    expect(await prop.balanceOf(userA.address)).to.equal(amount);
  });

  it("non-minter cannot mint", async () => {
    const { ethers, userA, prop } = await deployAll();
    const amount = ethers.parseUnits("1", 18);
    const minterRole = await prop.MINTER_ROLE();

    await expect(prop.connect(userA).mint(userA.address, amount))
      .to.be.revertedWithCustomError(prop, "AccessControlUnauthorizedAccount")
      .withArgs(userA.address, minterRole);
  });

  it("mint works without KYC but transfers require it", async () => {
    const { ethers, admin, userA, userB, kyc, prop } = await deployAll();
    const amount = ethers.parseUnits("5", 18);

    await (await prop.connect(admin).mint(userA.address, amount)).wait();

    await expect(
      prop.connect(userA).transfer(userB.address, amount)
    ).to.be.revertedWith("From KYC missing");

    await allowUser(kyc, admin, userA, "0x4652");

    await expect(
      prop.connect(userA).transfer(userB.address, amount)
    ).to.be.revertedWith("To KYC missing");

    await allowUser(kyc, admin, userB, "0x4652");

    await expect(prop.connect(userA).transfer(userB.address, amount)).to.not.revert(
      ethers
    );
  });

  it("transferFrom works when both parties are KYC", async () => {
    const { ethers, admin, userA, userB, userC, kyc, prop } = await deployAll();
    const amount = ethers.parseUnits("2", 18);

    await allowUser(kyc, admin, userA, "0x4652");
    await allowUser(kyc, admin, userC, "0x4652");
    await (await prop.connect(admin).mint(userA.address, amount)).wait();

    await (await prop.connect(userA).approve(userB.address, amount)).wait();

    await expect(
      prop.connect(userB).transferFrom(userA.address, userC.address, amount)
    ).to.not.revert(ethers);

    expect(await prop.balanceOf(userA.address)).to.equal(0n);
    expect(await prop.balanceOf(userC.address)).to.equal(amount);
  });
});
