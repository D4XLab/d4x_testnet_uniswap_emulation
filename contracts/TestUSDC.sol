// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestUSDC is ERC20 {
    constructor(uint256 initialSupply) ERC20("TestUSDC", "TUSDC") {
        _mint(msg.sender, initialSupply);
    }
}
