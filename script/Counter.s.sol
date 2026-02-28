// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {Counter} from "../src/Counter.sol";
import {TaxToken} from "../src/TaxToken.sol";
import "forge-std/console.sol";
contract CounterScript is Script {
    Counter public counter;

    function setUp() public {}

    function run() public {
        // 多签地址：部署后将作为合约唯一 owner
        address multisig = 0xa1a71Dc0CB6D3cbd6f15B2Bd6CECeD574c104E31;

        vm.startBroadcast();
        Counter robot = new Counter(multisig);
        console.log("Robot deployed at:", address(robot));
        vm.stopBroadcast();
    }
}
