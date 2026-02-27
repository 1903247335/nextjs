// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TaxToken is ERC20Burnable, Ownable {
    uint256 public taxPercent = 5;
    address public taxRecipient;

    constructor(address _taxRecipient) ERC20("My Tax Token", "MTT") Ownable(msg.sender) {
        require(_taxRecipient != address(0), "Invalid tax recipient");
        taxRecipient = _taxRecipient;

        uint256 initialSupply = 1_000_000 * 10 ** decimals();
        _mint(msg.sender, initialSupply);
    }

    function setTaxRecipient(address _taxRecipient) external onlyOwner {
        require(_taxRecipient != address(0), "Invalid address");
        taxRecipient = _taxRecipient;
    }

    function setTaxPercent(uint256 _percent) external onlyOwner {
        require(_percent <= 100, "Invalid percent");
        taxPercent = _percent;
    }

    // 用户转账时调用这个函数（收税）
    function transferWithTax(address recipient, uint256 amount) external returns (bool) {
        uint256 taxAmount = (amount * taxPercent) / 100;
        uint256 sendAmount = amount - taxAmount;

        if(taxAmount > 0) {
            _transfer(msg.sender, taxRecipient, taxAmount);
        }
        _transfer(msg.sender, recipient, sendAmount);
        return true;
    }

    // 用户授权转账
    function transferFromWithTax(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool) {
        uint256 currentAllowance = allowance(sender, msg.sender);
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");

        uint256 taxAmount = (amount * taxPercent) / 100;
        uint256 sendAmount = amount - taxAmount;

        if(taxAmount > 0) {
            _transfer(sender, taxRecipient, taxAmount);
        }
        _transfer(sender, recipient, sendAmount);

        _approve(sender, msg.sender, currentAllowance - amount);
        return true;
    }
}