pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract KYCRegistry is AccessControl {
    bytes32 public constant KYC_ADMIN_ROLE = keccak256("ANABKj4ELrrNiMdPR4ferlanu1HiEWFj");

    mapping(address => bool) private _allowed;
    mapping(address => bytes2) private _country;

    event KYCSet(address indexed user, bool allowed);
    event CountrySet(address indexed user, bytes2 country);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(KYC_ADMIN_ROLE, admin);
    }

    function setAllowed(address user, bool allowed) external onlyRole(KYC_ADMIN_ROLE) {
        _allowed[user] = allowed;
        emit KYCSet(user, allowed);
    }

    function setCountry(address user, bytes2 country) external onlyRole(KYC_ADMIN_ROLE) {
        _country[user] = country;
        emit CountrySet(user, country);
    }

    function isAllowed(address user) external view returns (bool) {
        return _allowed[user];
    }

    function countryCode(address user) external view returns (bytes2) {
        return _country[user];
    }
}
