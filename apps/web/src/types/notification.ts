import type { client } from "@basin/libs";
import type { InferResponseType } from "hono/client";

export type Notification = Extract<
  InferResponseType<(typeof client)["notification"]["$get"], 200>[number],
  { id: string }
>;

export type NotificationEventData = Record<string, unknown> | null | undefined;
