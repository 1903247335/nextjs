import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { counterAbi, taxTokenAbi } from "@/app/lib/abis";
import { formatTokenAmount } from "@/app/lib/format";

export const runtime = "nodejs";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545";
  const robotAddress = process.env.NEXT_PUBLIC_ROBOT_ADDRESS;
  const tokenAddressFromEnv = process.env.NEXT_PUBLIC_TOKEN_ADDRESS;

  if (!robotAddress) {
    return jsonError("缺少 NEXT_PUBLIC_ROBOT_ADDRESS（robot 合约地址）");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const counter = new ethers.Contract(robotAddress, counterAbi, provider);

  let chainId: number;
  try {
    chainId = Number((await provider.getNetwork()).chainId);
  } catch {
    return jsonError("RPC 连接失败，请检查 NEXT_PUBLIC_RPC_URL 或本地节点是否启动");
  }

  let tokenFromRobot: string;
  let buybackCount: bigint;
  let totalBurned: bigint;
  let lastBuyback: bigint;
  let interval: bigint;
  let buyPercent: bigint;
  let nextBuybackIn: bigint;
  let reserve: bigint;
  let totalBnbUsed: bigint;

  try {
    [
      tokenFromRobot,
      buybackCount,
      totalBurned,
      lastBuyback,
      interval,
      buyPercent,
      nextBuybackIn,
      reserve,
      totalBnbUsed,
    ] = (await Promise.all([
      counter.token(),
      counter.buybackCount(),
      counter.totalBurned(),
      counter.lastBuyback(),
      counter.interval(),
      counter.buyPercent(),
      counter.getNextBuybackIn(),
      counter.getReserve(),
      counter.totalBnbUsed(),
    ])) as [
      string,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
    ];
  } catch (e) {
    const msg =
      e instanceof Error
        ? `读取 robot 合约失败: ${e.message}`
        : "读取 robot 合约失败（未知错误）";
    return jsonError(msg);
  }

  const tokenAddress =
    tokenAddressFromEnv && tokenAddressFromEnv.length > 0
      ? tokenAddressFromEnv
      : tokenFromRobot;

  const nativeReserve = await provider.getBalance(robotAddress);

  // token 未设置时也允许展示 robot 仪表盘（只是不展示代币信息、价格、市值等）
  if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
    return NextResponse.json({
      ok: true,
      chainId,
      robot: {
        address: robotAddress,
        token: tokenAddress ?? ethers.ZeroAddress,
        buybackCount: buybackCount.toString(),
        totalBurned: totalBurned.toString(),
        totalBurnedFormatted: totalBurned.toString(),
        lastBuyback: lastBuyback.toString(),
        interval: interval.toString(),
        buyPercent: buyPercent.toString(),
        nextBuybackIn: nextBuybackIn.toString(),
        reserve: reserve.toString(),
        reserveFormatted: ethers.formatEther(reserve),
        nativeReserve: nativeReserve.toString(),
        nativeReserveFormatted: ethers.formatEther(nativeReserve),
        totalBnbUsed: totalBnbUsed.toString(),
        totalBnbUsedFormatted: ethers.formatEther(totalBnbUsed),
      },
      token: null,
      serverTimeMs: Date.now(),
    });
  }

  const token = new ethers.Contract(tokenAddress, taxTokenAbi, provider);

  let name: string;
  let symbol: string;
  let decimals: number | bigint;
  let totalSupply: bigint;
  let taxPercent: bigint;
  let taxRecipient: string;
  let taxRecipientBalance: bigint;

  try {
    [name, symbol, decimals, totalSupply, taxPercent, taxRecipient] =
      (await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals(),
        token.totalSupply(),
        token.taxPercent(),
        token.taxRecipient(),
      ])) as [string, string, number | bigint, bigint, bigint, string];

    [taxRecipientBalance] = (await Promise.all([
      token.balanceOf(taxRecipient),
    ])) as [bigint];
  } catch (e) {
    const msg =
      e instanceof Error
        ? `读取 token 合约失败: ${e.message}`
        : "读取 token 合约失败（未知错误）";
    return jsonError(msg);
  }

  const decimalsNumber = Number(decimals);

  return NextResponse.json({
    ok: true,
    chainId,
    robot: {
      address: robotAddress,
      token: tokenAddress,
      buybackCount: buybackCount.toString(),
      totalBurned: totalBurned.toString(),
      totalBurnedFormatted: formatTokenAmount(totalBurned, decimalsNumber, {
        maxFractionDigits: 6,
      }),
      lastBuyback: lastBuyback.toString(),
      interval: interval.toString(),
      buyPercent: buyPercent.toString(),
      nextBuybackIn: nextBuybackIn.toString(),
      reserve: reserve.toString(),
      reserveFormatted: ethers.formatEther(reserve),
      nativeReserve: nativeReserve.toString(),
      nativeReserveFormatted: ethers.formatEther(nativeReserve),
      totalBnbUsed: totalBnbUsed.toString(),
      totalBnbUsedFormatted: ethers.formatEther(totalBnbUsed),
    },
    token: {
      address: tokenAddress,
      name,
      symbol,
      decimals: decimalsNumber,
      totalSupply: totalSupply.toString(),
      totalSupplyFormatted: formatTokenAmount(totalSupply, decimalsNumber, {
        maxFractionDigits: 2,
      }),
      taxPercent: taxPercent.toString(),
      taxRecipient,
      taxRecipientBalance: taxRecipientBalance.toString(),
      taxRecipientBalanceFormatted: formatTokenAmount(taxRecipientBalance, decimalsNumber, {
        maxFractionDigits: 6,
      }),
    },
    serverTimeMs: Date.now(),
  });
}

