// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;
import "forge-std/Script.sol";
import "../src/Counter.sol";
import "forge-std/console.sol";
contract TestTransfer is Script {
    function run() external {
        vm.startBroadcast();

        // 1. 填上刚才部署出来的 Counter 地址
        Counter counter = Counter(0x570D4D26A7E37f5bE4F4509B2938699bdB00cf96);

//        // 2. 设置要回购的代币地址（你自己的税收代币）
        counter.setToken(0xYourTokenAddress);
        console.log("set token success");

        vm.stopBroadcast();
    }
}
