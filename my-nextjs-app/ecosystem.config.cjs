module.exports = {
  apps: [
    {
      name: "robot-dashboard",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        // 生产环境建议用宝塔“环境变量”面板覆盖这些值
        // NEXT_PUBLIC_RPC_URL: "https://bsc-dataseed.binance.org",
        // NEXT_PUBLIC_ROBOT_ADDRESS: "0x...",
        // NEXT_PUBLIC_TOKEN_ADDRESS: "0x...",
      },
    },
  ],
};

