import { spawnSync, spawn } from "node:child_process";
function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run("npx", ["prisma", "migrate", "deploy"]);
if (process.env.SEED_DEMO === "true") run("npm", ["run", "db:seed"]);
const child = spawn("node", ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", process.env.PORT || "3000"], { stdio: "inherit", env: process.env });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("exit", code => process.exit(code ?? 1));
