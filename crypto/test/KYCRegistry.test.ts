import { expect } from "chai";
import { network } from "hardhat";


describe("PropertyShares + KYC + Gate", () => {
  it("ko si pas KYC", async () => {
    const { ethers } = await network.connect();
    const [admin, userA, userB] = await ethers.getSigners();

    const KYC = await ethers.getContractFactory("KYCRegistry");
    const kyc = await KYC.deploy(admin.address);
    await kyc.waitForDeployment();

    const Gate = await ethers.getContractFactory("TransferGate");
    const gate = await Gate.deploy(await kyc.getAddress());
    await gate.waitForDeployment();

    const Prop = await ethers.getContractFactory("PropertyShares");
    const prop = await Prop.deploy("Test Property", "TST", admin.address, await gate.getAddress());
    await prop.waitForDeployment();

    await (await kyc.connect(admin).setAllowed(userA.address, true)).wait();
    await (await kyc.connect(admin).setCountry(userA.address, "0x4652")).wait(); 

    await (await prop.connect(admin).mint(userA.address, ethers.parseUnits("100", 18))).wait();

    await expect(
      prop.connect(userA).transfer(userB.address, ethers.parseUnits("1", 18))
    ).to.be.revertedWith("To KYC missing");

    await (await kyc.connect(admin).setAllowed(userB.address, true)).wait();
    await (await kyc.connect(admin).setCountry(userB.address, "0x4652")).wait();

    await expect(
      prop.connect(userA).transfer(userB.address, ethers.parseUnits("1", 18))
    ).to.not.revert(ethers);

    expect(await prop.balanceOf(userB.address)).to.equal(ethers.parseUnits("1", 18));
  });
});


describe("KYCRegistry", () => {
  it("country check", async () => {
    const { ethers } = await network.connect();
    const [admin, user] = await ethers.getSigners();

    const KYC = await ethers.getContractFactory("KYCRegistry");
    const kyc = await KYC.deploy(admin.address);
    await kyc.waitForDeployment();

    // Au début, user n'est pas KYC
    expect(await kyc.isAllowed(user.address)).to.equal(false);

    // Admin KYC le user
    await (await kyc.connect(admin).setAllowed(user.address, true)).wait();
    await (await kyc.connect(admin).setCountry(user.address, "0x4652")).wait(); // "FR"

    // Lecture
    expect(await kyc.isAllowed(user.address)).to.equal(true);
    expect(await kyc.countryCode(user.address)).to.equal("0x4652");
  });

  it("non-admin KYC check", async () => {
    
    const { ethers } = await network.connect();
    const [admin, notAdmin, user] = await ethers.getSigners();

    const KYC = await ethers.getContractFactory("KYCRegistry");
    const kyc = await KYC.deploy(admin.address);
    await kyc.waitForDeployment();

    await expect(
      kyc.connect(notAdmin).setAllowed(user.address, true)
    ).to.be.revertedWithCustomError(
      kyc,
      "AccessControlUnauthorizedAccount"
    );

    await expect(
      kyc.connect(notAdmin).setCountry(user.address, "0x4652")
    ).to.be.revertedWithCustomError(
      kyc,
      "AccessControlUnauthorizedAccount"
    );
  });
});
