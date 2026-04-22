import { defineRemoteFn } from "../types";
import * as v from "valibot";

export const authApi = {
  me: defineRemoteFn(v.never(), async () => {
    console.log("Getting current user");
    return { id: "123", name: "John Doe" };
  }),
} as const;
