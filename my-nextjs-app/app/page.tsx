import RobotDashboard from "@/app/components/RobotDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <RobotDashboard />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-medium text-zinc-700 dark:text-zinc-200">
              官方社区
            </span>
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
          <div>本页面展示的数据均来自链上实时统计，仅供参考。</div>
        </div>
      </main>
    </div>
  );
}
