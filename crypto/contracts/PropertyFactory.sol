pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PropertyShares} from "./PropertyShares.sol";

contract PropertyFactory is Ownable {
    struct PropertyInfo {
        address token;
        address gate;
        address admin;
        string name;
        string symbol;
        string metadataURI;
        bytes32 metadataHash;
        uint256 createdAt;
    }

    address public gate;
    address[] private _properties;
    mapping(address => PropertyInfo) private _propertyInfo;

    event GateUpdated(address indexed gate);
    event PropertyCreated(
        address indexed token,
        address indexed admin,
        address indexed gate,
        string name,
        string symbol,
        string metadataURI,
        bytes32 metadataHash
    );

    constructor(address backendAdmin, address gate_) Ownable(backendAdmin) {
        require(backendAdmin != address(0), "admin zero");
        require(gate_ != address(0), "gate zero");
        gate = gate_;
    }

    function setGate(address newGate) external onlyOwner {
        require(newGate != address(0), "gate zero");
        gate = newGate;
        emit GateUpdated(newGate);
    }

    function createProperty(
        string calldata name_,
        string calldata symbol_,
        string calldata metadataURI,
        bytes32 metadataHash
    ) external onlyOwner returns (address) {
        require(bytes(name_).length > 0, "name empty");
        require(bytes(symbol_).length > 0, "symbol empty");
        require(bytes(metadataURI).length > 0, "metadata uri empty");
        require(metadataHash != bytes32(0), "metadata hash empty");

        PropertyShares token = new PropertyShares(
            name_,
            symbol_,
            owner(),
            gate
        );

        address tokenAddress = address(token);
        PropertyInfo memory info = PropertyInfo({
            token: tokenAddress,
            gate: gate,
            admin: owner(),
            name: name_,
            symbol: symbol_,
            metadataURI: metadataURI,
            metadataHash: metadataHash,
            createdAt: block.timestamp
        });

        _properties.push(tokenAddress);
        _propertyInfo[tokenAddress] = info;

        emit PropertyCreated(
            tokenAddress,
            info.admin,
            info.gate,
            name_,
            symbol_,
            metadataURI,
            metadataHash
        );

        return tokenAddress;
    }

    function propertyCount() external view returns (uint256) {
        return _properties.length;
    }

    function propertyAt(uint256 index) external view returns (PropertyInfo memory) {
        require(index < _properties.length, "index out of range");
        return _propertyInfo[_properties[index]];
    }

    function propertyInfo(address token) external view returns (PropertyInfo memory) {
        return _propertyInfo[token];
    }
}
