import { ethers } from "ethers";

export function formatTokenAmount(
  raw: bigint | string,
  decimals: number,
  options?: { maxFractionDigits?: number }
): string {
  const maxFractionDigits = options?.maxFractionDigits ?? 6;
  const v = typeof raw === "bigint" ? raw : BigInt(raw);
  const s = ethers.formatUnits(v, decimals);
  if (!s.includes(".")) return s;
  const [i, f] = s.split(".");
  const trimmed = f.slice(0, maxFractionDigits).replace(/0+$/, "");
  return trimmed.length ? `${i}.${trimmed}` : i;
}

export function formatCompactNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const s = Math.floor(seconds);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

