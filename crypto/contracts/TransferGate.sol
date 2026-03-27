pragma solidity ^0.8.24;

interface IKYCRegistry {
    function isAllowed(address user) external view returns (bool);
    function countryCode(address user) external view returns (bytes2);
}

contract TransferGate {
    IKYCRegistry public immutable kyc;
    address public owner;

    mapping(bytes2 => bool) public blockedCountries;
    mapping(address => bool) public blocklist;

    constructor(address kyc_) {
        owner = msg.sender;
        kyc = IKYCRegistry(kyc_);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function setBlockedCountry(bytes2 cc, bool blocked) external onlyOwner {
        blockedCountries[cc] = blocked;
    }

    function setBlocklist(address user, bool blocked) external onlyOwner {
        blocklist[user] = blocked;
    }

    function canTransfer(address from, address to, uint256)
        external
        view
        returns (bool, string memory)
    {
        if (from != address(0) && blocklist[from]) return (false, "From blocked");
        if (to != address(0) && blocklist[to]) return (false, "To blocked");

        if (from != address(0) && !kyc.isAllowed(from)) return (false, "From KYC missing");
        if (to != address(0) && !kyc.isAllowed(to)) return (false, "To KYC missing");

        bytes2 cf = kyc.countryCode(from);
        bytes2 ct = kyc.countryCode(to);

        if (from != address(0) && blockedCountries[cf]) return (false, "From country blocked");
        if (to != address(0) && blockedCountries[ct]) return (false, "To country blocked");

        return (true, "");
    }
}
