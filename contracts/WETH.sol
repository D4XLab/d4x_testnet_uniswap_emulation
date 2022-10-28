// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WETH is ERC20 {
    constructor(uint256 initialSupply) ERC20("WETH", "WETH") {
        _mint(msg.sender, initialSupply);
    }
}
