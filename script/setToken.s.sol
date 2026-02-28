// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;
import "forge-std/Script.sol";
import "../src/Counter.sol";
import "forge-std/console.sol";
contract TestTransfer is Script {
    function run() external {
        vm.startBroadcast();

        // 1. 填上刚才部署出来的 Counter 地址（需要先转为 payable）
        address payable robot = payable(0x570D4D26A7E37f5bE4F4509B2938699bdB00cf96);
        Counter counter = Counter(robot);

        // 注意这里用校验和地址
        counter.setToken(0x56ab1b7A0dC29c2D779f31704E4f284105A67777);
        console.log("set token success");

        vm.stopBroadcast();
    }
}
