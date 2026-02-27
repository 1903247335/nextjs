"use client";

import { ReactNode } from "react";

export function StatCard(props: {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm dark:border-white/[.12] dark:bg-zinc-950">
      <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {props.title}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {props.value}
      </div>
      {props.subtitle ? (
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {props.subtitle}
        </div>
      ) : null}
    </div>
  );
}

