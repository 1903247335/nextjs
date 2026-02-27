import time
from web3 import Web3

RPC_URL = "http://127.0.0.1:8545"
PRIVATE_KEY = "0x68C1329A9858CBB3E3CFE786982D739C2CF150F415EBF0D5ABDB4FEA4E65682A"
ROBOT_ADDRESS = "0x570D4D26A7E37f5bE4F4509B2938699bdB00cf96"

w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = w3.eth.account.from_key(PRIVATE_KEY)
owner_address = account.address

# 只保留要用到的 ABI
counter_abi = [
    {
        "inputs": [],
        "name": "getNextBuybackIn",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getReserve",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "executeBuyback",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

counter = w3.eth.contract(address=ROBOT_ADDRESS, abi=counter_abi)


def wait_until_ready(poll_interval: int = 10):
    """正常等待，直到满足 20 分钟条件"""
    while True:
        next_in = counter.functions.getNextBuybackIn().call()
        reserve = counter.functions.getReserve().call()
        print(f"还需等待 {next_in} 秒, 机器人余额 {reserve}")

        # 条件：已经过了 20 分钟 且 机器人里有代币
        if next_in == 0 and reserve > 0:
            print("条件已满足，可以执行 buyback。")
            break

        # 如果一直没有资金，就没必要死等，可以直接退出/抛异常
        if reserve == 0:
            print("机器人没有代币 (reserve == 0)，无法买回，结束等待。")
            raise RuntimeError("No funds in robot contract")

        # 正常等待一小段时间再检查
        time.sleep(poll_interval)


def execute_buyback():
    # 正常等待 20 分钟条件
    wait_until_ready(poll_interval=10)  # 每 10 秒检查一次

    # 满足条件后再发交易
    nonce = w3.eth.get_transaction_count(owner_address)
    tx = counter.functions.executeBuyback().build_transaction(
        {
            "chainId": w3.eth.chain_id,
            "from": owner_address,
            "nonce": nonce,
            "gas": 1_000_000,
            "gasPrice": w3.eth.gas_price,
        }
    )
    signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print("发送交易:", tx_hash.hex())
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print("交易完成, status =", receipt.status)


if __name__ == "__main__":
    execute_buyback()