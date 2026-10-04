export function isCloud(): boolean {
  return process.env.BASIN_CLOUD === "true";
}
