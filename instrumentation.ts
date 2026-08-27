/**
 * Server startup hook. All logic lives in lib/startup/node-startup.ts and is
 * loaded only under the Node.js runtime so the Edge instrumentation bundle
 * stays empty (Node APIs are not available there).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { nodeStartup } = await import("./lib/startup/node-startup");
    await nodeStartup();
  }
}
