"use client";

import { useEffect, useMemo, useState } from "react";
import { StatCard } from "./StatCard";
import { formatDuration, formatUsd } from "../lib/format";

type RobotApiOk = {
  ok: true;
  chainId: number;
  serverTimeMs: number;
  robot: {
    address: string;
    token: string;
    buybackCount: string;
    totalBurned: string;
    totalBurnedFormatted: string;
    lastBuyback: string;
    interval: string;
    buyPercent: string;
    nextBuybackIn: string;
    reserve: string;
    reserveFormatted: string;
    nativeReserve: string;
    nativeReserveFormatted: string;
    totalBnbUsed: string;
    totalBnbUsedFormatted: string;
  };
  token: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
    totalSupplyFormatted: string;
    taxPercent: string;
    taxRecipient: string;
    taxRecipientBalance: string;
    taxRecipientBalanceFormatted: string;
  } | null;
};

type RobotApiErr = { ok: false; error: string };
type RobotApi = RobotApiOk | RobotApiErr;

type PriceApiOk = {
  ok: true;
  serverTimeMs: number;
  pair: { address: string };
  price: {
    tokenPriceUsd: string;
    tokenPriceBnb: string;
    bnbUsdFormatted: string;
  };
};
type PriceApiErr = { ok: false; error: string };
type PriceApi = PriceApiOk | PriceApiErr;

async function fetchMetrics(): Promise<RobotApi> {
  const res = await fetch("/api/robot", { cache: "no-store" });
  return (await res.json()) as RobotApi;
}

async function fetchPrice(token: string): Promise<PriceApi> {
  const res = await fetch(`/api/price?token=${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  return (await res.json()) as PriceApi;
}

function safeParseFloat(s: string): number {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export default function RobotDashboard() {
  const [data, setData] = useState<RobotApiOk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState<PriceApiOk | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextIn, setNextIn] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // 15 秒轮询后端接口
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const j = await fetchMetrics();
        if (cancelled) return;
        if (!j.ok) {
          setError(j.error);
          // 占位数据，保证页面有结构
          setData({
            ok: true,
            chainId: 0,
            serverTimeMs: Date.now(),
            robot: {
              address:
                process.env.NEXT_PUBLIC_ROBOT_ADDRESS ??
                "0x0000000000000000000000000000000000000000",
              token: "0x0000000000000000000000000000000000000000",
              buybackCount: "0",
              totalBurned: "0",
              totalBurnedFormatted: "0",
              lastBuyback: "0",
              interval: String(20 * 60),
              buyPercent: "10",
              nextBuybackIn: "0",
              reserve: "0",
              reserveFormatted: "0",
              nativeReserve: "0",
              nativeReserveFormatted: "0",
              totalBnbUsed: "0",
              totalBnbUsedFormatted: "0",
            },
            token: null,
          });
          setLoading(false);
          return;
        }

        setError(null);
        setData(j);
        setLoading(false);

        const next = Number(j.robot.nextBuybackIn);
        setNextIn((prev) => {
          const n = Number.isFinite(next) ? next : 0;
          if (prev === 0 || n === 0) return n;
          if (n < prev - 1) return n;
          return prev;
        });
        setLastUpdated(j.serverTimeMs ?? Date.now());

        if (
          j.token?.address &&
          j.token.address !== "0x0000000000000000000000000000000000000000"
        ) {
          const p = await fetchPrice(j.token.address);
          if (cancelled) return;
          if (!p.ok) {
            setPriceError(p.error);
            setPrice(null);
          } else {
            setPriceError(null);
            setPrice(p);
          }
        } else {
          setPrice(null);
          setPriceError(null);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "请求失败");
        setLoading(false);
      }
    };

    void load();
    const poll = setInterval(load, 15000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  // 本地倒计时每秒减 1
  useEffect(() => {
    const t = setInterval(() => {
      setNextIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const derived = useMemo(() => {
    if (!data) return null;
    const supply = data.token ? safeParseFloat(data.token.totalSupplyFormatted) : 0;
    const tokenPriceUsd = price ? safeParseFloat(price.price.tokenPriceUsd) : 0;
    const marketCap = supply * tokenPriceUsd;
    return {
      supply,
      tokenPriceUsd,
      marketCap,
    };
  }, [data, price]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-black/[.08] bg-white p-6 text-sm text-zinc-600 dark:border-white/[.12] dark:bg-zinc-950 dark:text-zinc-300">
        正在读取链上数据…
      </div>
    );
  }

  if (!data || !derived) return null;

  const symbol = data.token?.symbol ?? "TOKEN";
  const buybackCount = Number(data.robot.buybackCount);
  const buyPercent = Number(data.robot.buyPercent);
  const taxPercent = data.token ? Number(data.token.taxPercent) : NaN;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.12] dark:bg-zinc-950">
        <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          烽火轮自动回购面板
        </div>
        <div className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {data.token ? `${data.token.name}（${symbol}）` : "当前尚未绑定代币"}
        </div>
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {lastUpdated
            ? `最后更新：${new Date(lastUpdated).toLocaleString("zh-CN")}`
            : ""}
          {error ? "（部分数据暂时无法获取，当前显示为最近一次记录）" : ""}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="回购倒计时"
          value={nextIn === 0 ? "可回购" : formatDuration(nextIn)}
          subtitle={
            nextIn === 0
              ? "系统已满足回购条件"
              : "预计每 20 分钟触发一次回购"
          }
        />

        <StatCard
          title="回购次数"
          value={Number.isFinite(buybackCount) ? buybackCount : data.robot.buybackCount}
          subtitle="机器人已完成的回购次数"
        />

        <StatCard
          title="税收储备（BNB）"
          value={`${data.robot.nativeReserveFormatted} BNB`}
          subtitle="当前合约内可用于回购的 BNB 数量"
        />

        <StatCard
          title="实时价格"
          value={price ? `${derived.tokenPriceUsd.toFixed(6)} USD` : "—"}
          subtitle={
            price ? "价格根据链上实时行情估算" : priceError ?? "暂无价格数据"
          }
        />

        <StatCard
          title="总销毁量"
          value={data.token ? `${data.robot.totalBurnedFormatted} ${symbol}` : "—"}
          subtitle={data.token ? "累计销毁的代币数量" : "尚未绑定代币，暂无法展示"}
        />

        <StatCard
          title="总回购消耗 BNB"
          value={`${data.robot.totalBnbUsedFormatted} BNB`}
          subtitle="累计用于回购的 BNB 数量"
        />

        <StatCard
          title="市值（实时）"
          value={data.token ? formatUsd(derived.marketCap) : "—"}
          subtitle={
            <div className="flex flex-wrap items-center gap-2">
              <span>
                总供应量：{data.token ? `${data.token.totalSupplyFormatted} ${symbol}` : "—"}
              </span>
              <span className="opacity-70">·</span>
              <span>
                单价：{price ? `${derived.tokenPriceUsd.toFixed(6)} USD` : "—"}
              </span>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/[.08] bg-white p-5 text-sm dark:border-white/[.12] dark:bg-zinc-950">
          <div className="font-medium text-zinc-950 dark:text-zinc-50">合约信息</div>
          <div className="mt-3 space-y-2 text-zinc-600 dark:text-zinc-300">
            <div className="break-words">
              robot：<span className="font-mono">{data.robot.address}</span>
            </div>
            <div className="break-words">
              token：<span className="font-mono">{data.token?.address ?? "未设置"}</span>
            </div>
            {data.token ? (
              <>
                <div>
                  税率：{Number.isFinite(taxPercent) ? taxPercent : data.token.taxPercent}%
                </div>
                <div className="break-words">
                  taxRecipient 余额：{data.token.taxRecipientBalanceFormatted} {symbol}
                </div>
              </>
            ) : (
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                当前尚未绑定代币，绑定后将展示税率、销毁数量等更多信息。
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-black/[.08] bg-white p-5 text-sm dark:border-white/[.12] dark:bg-zinc-950">
          <div className="font-medium text-zinc-950 dark:text-zinc-50">数据说明</div>
          <div className="mt-3 space-y-2 text-zinc-600 dark:text-zinc-300">
            <div>页面会自动定期刷新，尽量保持与链上数据同步。</div>
            <div>倒计时为预计时间，实际执行时间以链上为准。</div>
            <div>市值和价格均为根据链上行情估算，仅供参考，不构成投资建议。</div>
          </div>
        </div>
      </div>
    </div>
  );
}

