# Tiny Remote Functions

Type-safe RPC for SvelteKit. Define server-side functions once, call them from anywhere (server load functions, client components, actions) with full TypeScript inference and automatic input validation via [Valibot](https://valibot.dev/).

## How it works

1. Define functions on the server with `defineRemoteFn(schema, handler)`
2. Aggregate them into an API object and register the handler in `hooks.server.ts`
3. Create a typed interface with `createRemoteFnInterface<typeof serverApi>()`
4. Call functions anywhere — the client proxy sends a `POST /api/remote/<path>` request automatically

## Setup

### 1. Define your server functions

```ts
// src/lib/functions/server/users.ts
import { defineRemoteFn } from "$lib/functions/types";
import * as v from "valibot";

export const usersApi = {
  getUser: defineRemoteFn(v.object({ id: v.string() }), async ({ id }) => {
    return { id, name: "Alice" };
  }),

  listUsers: defineRemoteFn(
    v.never(), // no input
    async () => {
      return [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ];
    },
  ),
} as const;
```

### 2. Aggregate into a single API

```ts
// src/lib/functions/server/index.ts
import { createServerFunctionsHandler } from "$lib/functions/types";
import { usersApi } from "./users";

export const serverApi = {
  users: usersApi,
} as const;

export const serverFunctionsHandler = createServerFunctionsHandler(serverApi);
```

### 3. Register the handler

```ts
// src/hooks.server.ts
import { serverFunctionsHandler } from "$lib/functions/server";

export const handle = serverFunctionsHandler;

// Or compose with other handlers using SvelteKit's `sequence`:
// export const handle = sequence(serverFunctionsHandler, otherHandler);
```

### 4. Create the interface

```ts
// src/lib/functions/index.ts
import { createRemoteFnInterface } from "$lib/functions/types";
import type { serverApi } from "./server"; // IMPORTANT: `import type`

export const api = createRemoteFnInterface<typeof serverApi>();
// Note that the `api` can be used from the server AND the client.
```

### 5. Register the SvelteKit fetch in the root layout

This ensures client-side `load` functions use SvelteKit's native fetch (with cookie forwarding, relative URLs, etc.) rather than the global `fetch`.

```ts
// src/routes/+layout.ts
import { setBrowserSvelteKitFetch } from "$lib/functions/types";

export const load = async ({ fetch }) => {
  setBrowserSvelteKitFetch(fetch);
};
```

## Usage

```ts
import { clientApi } from "$lib/functions";

await clientApi.users.listUsers();
const user = await clientApi.users.getUser({ id: "1" });
```

## Input validation

Input schemas are validated on the server using Valibot. If validation fails, the server responds with `400` and the list of issues. For functions that take no input, use `v.never()` as the schema.

```ts
defineRemoteFn(
  v.object({
    email: v.pipe(v.string(), v.email()),
    age: v.pipe(v.number(), v.minValue(0)),
  }),
  async ({ email, age }) => {
    /* ... */
  },
);
```

## HTTP protocol

Each remote function maps to a route:

```
POST /api/remote/<namespace>/<functionName>
Content-Type: application/json

{ ...input }
```

| Status | Meaning                                          |
| ------ | ------------------------------------------------ |
| `200`  | Success — response body is the JSON return value |
| `400`  | Validation error — body contains Valibot issues  |
| `404`  | Function not found                               |
