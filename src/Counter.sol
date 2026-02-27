// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);
}

interface IUniswapV2Router {
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable;
}

contract Counter is Ownable, ReentrancyGuard {
    address public token; // 要回购并销毁的代币
    address public router=0x10ED43C718714eb63d5aA57B78B54704E256024E;// DEX 路由合约（如 PancakeSwap Router）
    address public wbnb=0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;// WBNB 地址（或当前链的包裹币）

    uint256 public buybackCount; // 执行 buyback 的次数
    uint256 public totalBurned; // 总共销毁的代币数量
    uint256 public totalBnbUsed; // 用于回购的 BNB 总量（单位：wei）
    uint256 public lastBuyback;
    uint256 public interval = 20 minutes;
    uint256 public buyPercent = 10; // 10%
    address public constant DEAD =
        0x000000000000000000000000000000000000dEaD;

    constructor() Ownable(msg.sender) {}

    receive() external payable {}

    function setToken(address _token) external onlyOwner {
        token = _token;
    }


    // 使用合约中累积的 BNB 进行“回购再销毁”
    // 1) 用部分 BNB 在路由上买入代币
    // 2) 将买到的代币全部转入 DEAD 地址销毁
    function executeBuyback() external onlyOwner nonReentrant {
        require(
            block.timestamp >= lastBuyback + interval,
            "Too early"
        );
        require(router != address(0) && wbnb != address(0), "Router not set");
        require(token != address(0), "Token not set");

        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");

        uint256 bnbToUse = (balance * buyPercent) / 100;

        // 记录回购前后代币余额差值 = 本次实际买入数量
        uint256 beforeBalance = IERC20(token).balanceOf(address(this));

        address[] memory path = new address[](2);
        path[0] = wbnb;
        path[1] = token;

        IUniswapV2Router(router)
            .swapExactETHForTokensSupportingFeeOnTransferTokens{
            value: bnbToUse
        }(0, path, address(this), block.timestamp + 300);

        uint256 afterBalance = IERC20(token).balanceOf(address(this));
        uint256 bought = afterBalance - beforeBalance;
        require(bought > 0, "No tokens bought");

        // 将本次买入的代币全部销毁
        IERC20(token).transfer(DEAD, bought);

        lastBuyback = block.timestamp;

        buybackCount += 1;
        totalBurned += bought;
        totalBnbUsed += bnbToUse;
    }

    function setBuyPercent(uint256 _percent) external onlyOwner {
        require(_percent > 0 && _percent <= 100, "Invalid percent");
        buyPercent = _percent;
    }

    function getNextBuybackIn() external view returns (uint256) {
        if (block.timestamp >= lastBuyback + interval) {
            return 0;
        } else {
            return (lastBuyback + interval) - block.timestamp;
        }
    }

    // 税收实时储备额度：当前合约地址持有的 BNB 余额
    function getReserve() external view returns (uint256) {
        return address(this).balance;
    }

    function withdraw() external onlyOwner nonReentrant {
        payable(owner()).transfer(address(this).balance);
    }
}
