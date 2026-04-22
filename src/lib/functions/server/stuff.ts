import { defineRemoteFn } from "../types";
import * as v from "valibot";

export const stuffApi = {
  getStuff: defineRemoteFn(
    v.object({
      id: v.pipe(v.string(), v.minLength(3)),
    }),
    async ({ id }) => {
      console.log(`Getting stuff with id: ${id}`);
      return { id, name: "Stuff Name" };
    },
  ),
} as const;
