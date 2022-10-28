// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestDAI is ERC20 {
    constructor(uint256 initialSupply) ERC20("TestDAI", "TDAI") {
        _mint(msg.sender, initialSupply);
    }
}
