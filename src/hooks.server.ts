import type { Handle } from "@sveltejs/kit";
import { serverFunctionsHandler } from "$lib/functions/server";

export const handle: Handle = async ({ event, resolve }) => {
  return serverFunctionsHandler({ event, resolve });
};
