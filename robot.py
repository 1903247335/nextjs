import os
import time
from web3 import Web3

# ========== 配置区 ==========
# BSC 主网 RPC（可换成其他节点）
RPC_URL = os.environ.get("RPC_URL", "https://bsc-dataseed.binance.org")

# 私钥从环境变量读取，更安全
PRIVATE_KEY = "0x894deaae2d6122c01ccfd35bcfc3e5de47156acbebb2ee764237c9a1c4ff7386"
if not PRIVATE_KEY:
    raise ValueError("请设置环境变量 ROBOT_PRIVATE_KEY，例如: export ROBOT_PRIVATE_KEY=0x...")

# Robot 合约地址
ROBOT_ADDRESS = os.environ.get("ROBOT_ADDRESS", "0x8b445279445d8aDe6519B6087E01fA0FfE816bE3")

# 轮询间隔（秒）
POLL_INTERVAL = 30

# ========== 初始化 ==========
w3 = Web3(Web3.HTTPProvider(RPC_URL))
if not w3.is_connected():
    raise ConnectionError(f"无法连接到 RPC: {RPC_URL}")

account = w3.eth.account.from_key(PRIVATE_KEY)
owner_address = account.address
print(f"已连接到链 ID: {w3.eth.chain_id}")
print(f"操作钱包地址: {owner_address}")
print(f"Robot 合约地址: {ROBOT_ADDRESS}")

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


def format_bnb(wei_value: int) -> str:
    """将 wei 转换为 BNB 字符串"""
    return f"{w3.from_wei(wei_value, 'ether'):.6f} BNB"


def wait_until_ready(poll_interval: int = POLL_INTERVAL):
    """持续等待，直到满足回购条件（时间到 + 有资金）"""
    while True:
        try:
            next_in = counter.functions.getNextBuybackIn().call()
            reserve = counter.functions.getReserve().call()
            print(f"[状态] 距下次回购: {next_in}秒 | 当前储备: {format_bnb(reserve)}")

            # 条件满足：已过 20 分钟 且 有 BNB
            if next_in == 0 and reserve > 0:
                print("✓ 条件已满足，准备执行回购...")
                return

            # 没有资金时继续等待（而不是退出）
            if reserve == 0:
                print("⏳ 暂无 BNB 储备，继续等待...")

        except Exception as e:
            print(f"⚠ 读取合约状态失败: {e}，稍后重试...")

        time.sleep(poll_interval)


def execute_buyback():
    """执行一次回购"""
    # 等待条件满足
    wait_until_ready()

    # 构建交易
    nonce = w3.eth.get_transaction_count(owner_address)
    # BSC 主网 gas price 通常 3-5 Gwei，设置最低值避免卡住
    gas_price = max(w3.eth.gas_price, w3.to_wei(3, "gwei"))

    tx = counter.functions.executeBuyback().build_transaction(
        {
            "chainId": w3.eth.chain_id,
            "from": owner_address,
            "nonce": nonce,
            "gas": 500_000,
            "gasPrice": gas_price,
        }
    )

    signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"📤 交易已发送: {tx_hash.hex()}")

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    if receipt.status == 1:
        print(f"✅ 回购成功! Gas used: {receipt.gasUsed}")
    else:
        print(f"❌ 回购失败! 交易被 revert")

    return receipt.status == 1


def main():
    """主循环：持续运行，每次回购完成后继续等待下一轮"""
    print("=" * 50)
    print("🤖 Robot 自动回购脚本已启动")
    print("=" * 50)

    buyback_count = 0

    while True:
        try:
            success = execute_buyback()
            if success:
                buyback_count += 1
                print(f"🎉 第 {buyback_count} 次回购完成，等待下一轮...")
            else:
                print("本轮回购失败，60秒后重试...")
                time.sleep(60)

        except KeyboardInterrupt:
            print("\n🛑 用户中断，脚本退出")
            break

        except Exception as e:
            print(f"⚠ 发生错误: {e}")
            print("60秒后重试...")
            time.sleep(60)


if __name__ == "__main__":
    main()