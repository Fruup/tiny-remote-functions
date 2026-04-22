import { createRemoteFnInterface } from "./types";
import type { serverApi } from "./server";

export const clientApi = createRemoteFnInterface<typeof serverApi>();
