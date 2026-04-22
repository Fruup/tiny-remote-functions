import { createServerFunctionsHandler } from "../types";
import { stuffApi } from "./stuff";
import { authApi } from "./auth";

export const serverApi = {
  stuff: stuffApi,
  auth: authApi,
} as const;

export const serverFunctionsHandler = createServerFunctionsHandler(serverApi);
