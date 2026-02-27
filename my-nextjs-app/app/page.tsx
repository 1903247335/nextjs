import RobotDashboard from "@/app/components/RobotDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <RobotDashboard />
        <div className="flex flex-col gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            提示：请在 `my-nextjs-app/.env.local` 配置 `NEXT_PUBLIC_RPC_URL`、`NEXT_PUBLIC_ROBOT_ADDRESS`（可选：`NEXT_PUBLIC_TOKEN_ADDRESS`）。
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-medium text-zinc-700 dark:text-zinc-200">社区链接：</span>
            <a
              href="https://t.me/fenghuolunbnb"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              Telegram
            </a>
            <a
              href="https://x.com/fenghuolunBNB"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              Twitter
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
