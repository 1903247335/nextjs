import { NextResponse } from "next/server";
import { ethers } from "ethers";
import {
  chainlinkAggregatorV3Abi,
  erc20Abi,
  pancakeFactoryAbi,
  pancakePairAbi,
} from "@/app/lib/abis";
import { formatTokenAmount } from "@/app/lib/format";

export const runtime = "nodejs";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function pow10(n: number): bigint {
  if (!Number.isFinite(n) || n < 0) return 1n;
  return 10n ** BigInt(Math.floor(n));
}

export async function GET(req: Request) {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "https://bsc-dataseed.binance.org";
  const url = new URL(req.url);
  const tokenAddress =
    url.searchParams.get("token") ?? process.env.NEXT_PUBLIC_TOKEN_ADDRESS ?? "";

  if (!tokenAddress) {
    return jsonError("缺少 token 参数，例如 /api/price?token=0x...");
  }

  const factoryAddress =
    process.env.NEXT_PUBLIC_PANCAKE_FACTORY ??
    // 使用全小写，避免 ethers 对错误校验和报错
    "0xca143ce32fe78f1f7019d7d551a6402fc5350c73"; // PancakeSwap V2 Factory (BSC)
  const wbnbAddress =
    process.env.NEXT_PUBLIC_WBNB_ADDRESS ??
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; // WBNB (BSC)
  const bnbUsdFeed =
    process.env.NEXT_PUBLIC_CHAINLINK_BNB_USD_FEED ??
    "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE"; // Chainlink BNB/USD (BSC)

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  try {
    await provider.getBlockNumber();
  } catch {
    return jsonError("RPC 连接失败，请检查 NEXT_PUBLIC_RPC_URL 或本地节点是否启动");
  }

  const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
  const factory = new ethers.Contract(factoryAddress, pancakeFactoryAbi, provider);

  let name: string;
  let symbol: string;
  let decimalsRaw: number | bigint;
  try {
    [name, symbol, decimalsRaw] = (await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
    ])) as [string, string, number | bigint];
  } catch (e) {
    const msg =
      e instanceof Error ? `读取 token 信息失败: ${e.message}` : "读取 token 信息失败";
    return jsonError(msg);
  }
  const decimals = Number(decimalsRaw);

  let pairAddress: string;
  try {
    pairAddress = (await factory.getPair(tokenAddress, wbnbAddress)) as string;
  } catch (e) {
    const msg =
      e instanceof Error ? `读取 Factory.getPair 失败: ${e.message}` : "读取 Factory.getPair 失败";
    return jsonError(msg);
  }

  if (!pairAddress || pairAddress === ethers.ZeroAddress) {
    return jsonError("未找到 token/WBNB 交易对（Pair），请先在 Pancake 上创建流动性", 404);
  }

  const pair = new ethers.Contract(pairAddress, pancakePairAbi, provider);
  let token0: string;
  let token1: string;
  let r0: bigint;
  let r1: bigint;
  try {
    [token0, token1] = (await Promise.all([pair.token0(), pair.token1()])) as [
      string,
      string,
    ];
    const reserves = (await pair.getReserves()) as [bigint, bigint, bigint];
    r0 = BigInt(reserves[0]);
    r1 = BigInt(reserves[1]);
  } catch (e) {
    const msg =
      e instanceof Error ? `读取 Pair reserves 失败: ${e.message}` : "读取 Pair reserves 失败";
    return jsonError(msg);
  }

  const token0Lower = token0.toLowerCase();
  const tokenLower = tokenAddress.toLowerCase();
  const wbnbLower = wbnbAddress.toLowerCase();

  let reserveToken: bigint;
  let reserveWbnb: bigint;

  if (token0Lower === tokenLower && token1.toLowerCase() === wbnbLower) {
    reserveToken = r0;
    reserveWbnb = r1;
  } else if (token1.toLowerCase() === tokenLower && token0Lower === wbnbLower) {
    reserveToken = r1;
    reserveWbnb = r0;
  } else {
    return jsonError("Pair 不是 token/WBNB 交易对，请检查 WBNB 地址或 token 地址");
  }

  if (reserveToken === 0n || reserveWbnb === 0n) {
    return jsonError("Pair 储备为 0（尚未添加流动性）", 422);
  }

  // priceWeiPerToken: 1 Token 价值多少 wei(BNB)
  const priceWeiPerToken =
    (reserveWbnb * pow10(decimals)) / reserveToken;

  // Chainlink BNB/USD
  const feed = new ethers.Contract(bnbUsdFeed, chainlinkAggregatorV3Abi, provider);
  let feedDecimals: number;
  let bnbUsdAnswer: bigint;
  try {
    feedDecimals = Number((await feed.decimals()) as number | bigint);
    const roundData = (await feed.latestRoundData()) as [bigint, bigint, bigint, bigint, bigint];
    bnbUsdAnswer = BigInt(roundData[1]); // int256
  } catch (e) {
    const msg =
      e instanceof Error ? `读取 BNB/USD 预言机失败: ${e.message}` : "读取 BNB/USD 预言机失败";
    return jsonError(msg);
  }

  if (bnbUsdAnswer <= 0n) {
    return jsonError("BNB/USD 预言机返回异常价格", 502);
  }

  // tokenPriceUsd(1e18) = tokenPriceBnbWei(1e18) * bnbUsd(10^feedDecimals) / 10^feedDecimals
  const tokenPriceUsd1e18 = (priceWeiPerToken * bnbUsdAnswer) / pow10(feedDecimals);

  return NextResponse.json({
    ok: true,
    token: {
      address: tokenAddress,
      name,
      symbol,
      decimals,
    },
    pair: {
      address: pairAddress,
      factory: factoryAddress,
      wbnb: wbnbAddress,
      reserveToken: reserveToken.toString(),
      reserveWbnb: reserveWbnb.toString(),
      reserveTokenFormatted: formatTokenAmount(reserveToken, decimals, {
        maxFractionDigits: 6,
      }),
      reserveWbnbFormatted: ethers.formatEther(reserveWbnb),
    },
    price: {
      bnbUsdFeed,
      bnbUsdAnswer: bnbUsdAnswer.toString(),
      bnbUsdDecimals: feedDecimals,
      bnbUsdFormatted: ethers.formatUnits(bnbUsdAnswer, feedDecimals),
      tokenPriceBnbWei: priceWeiPerToken.toString(),
      tokenPriceBnb: ethers.formatEther(priceWeiPerToken),
      tokenPriceUsd1e18: tokenPriceUsd1e18.toString(),
      tokenPriceUsd: ethers.formatUnits(tokenPriceUsd1e18, 18),
    },
    serverTimeMs: Date.now(),
  });
}

