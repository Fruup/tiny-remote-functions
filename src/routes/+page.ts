import { clientApi } from "$lib/functions";

export const load = async () => {
  const stuff = await clientApi.stuff.getStuff({
    id: "420",
  });

  const me = await clientApi.auth.me();
  console.log(me);

  return {
    stuff,
    me,
  };
};
