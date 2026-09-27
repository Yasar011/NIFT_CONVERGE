import { handle, ok } from "@/lib/server/http";
import { newDeviceId, readDeviceId, rememberDevice } from "@/lib/server/public-voting";

/** Issues (or restores) this browser's anonymous voter id. */
export const POST = handle(async () => {
  const { id, fromCookie } = await readDeviceId();
  const deviceId = id ?? newDeviceId();
  if (!fromCookie) await rememberDevice(deviceId);
  return ok({ id: deviceId });
});
