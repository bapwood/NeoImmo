pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface ITransferGate {
    function canTransfer(address from, address to, uint256 amount)
        external
        view
        returns (bool, string memory);
}

contract PropertyShares is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    ITransferGate public gate;

    constructor(
        string memory name_,
        string memory symbol_,
        address admin,
        address gate_
    ) ERC20(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        gate = ITransferGate(gate_);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 amount) internal override {
        // Autorise mint/burn (from ou to = 0), bloque seulement les transferts "normaux"
        if (from != address(0) && to != address(0)) {
            (bool ok, string memory reason) = gate.canTransfer(from, to, amount);
            require(ok, reason);
        }
        super._update(from, to, amount);
    }
}
