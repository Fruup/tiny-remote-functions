import { setBrowserSvelteKitFetch } from "$lib/functions/types";

export const load = async ({ fetch }) => {
  setBrowserSvelteKitFetch(fetch);
};
