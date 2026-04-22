import { error, json, type Handle } from "@sveltejs/kit";
import { getRequestEvent } from "$app/server";
import * as v from "valibot";
import { browser } from "$app/environment";

/**
 * To be called in a server-only file.
 * Defines a remote function with input validation. The function will be available on the client after calling `createClientApi`.
 */
export function defineRemoteFn<TInputSchema extends v.GenericSchema, TOutput>(
  inputSchema: TInputSchema,
  handler: (input: v.InferInput<TInputSchema>) => TOutput,
): RemoteFnDefinition<TInputSchema, TOutput> {
  return { inputSchema, handler };
}

/**
 * Creates an API interface that can be used on the client and the server.
 */
export function createRemoteFnInterface<T>(): ToInterface<T> {
  return _createInterfaceProxy([]) as ToInterface<T>;
}

/**
 * Creates a server handler handling requests to functions defined in `serverApi`.
 */
export const createServerFunctionsHandler =
  (
    /**
     * The server API created using `defineRemoteFn`.
     * A nested object containing {@link RemoteFnDefinition}s as values.
     */
    serverApi: ServerApiDefinition,
  ): Handle =>
  async ({ event, resolve }) => {
    if (
      event.request.method !== "POST" ||
      !event.url.pathname.startsWith(REMOTE_API_PREFIX)
    )
      return resolve(event);

    const fn = access(
      serverApi,
      event.url.pathname.slice(REMOTE_API_PREFIX.length).split("/"),
    ) as RemoteFnDefinition<any, any>;

    if (!fn) error(404, `Function ${event.url.pathname} not found`);

    if ((fn.inputSchema as v.GenericSchema).type === "never") {
      return json(
        // @ts-expect-error
        await fn.handler(),
      );
    }

    const payload = await event.request.json();
    const { success, output, issues } = v.safeParse(fn.inputSchema, payload);
    if (!success) error(400, { message: "Validation error", issues });
    return json(await fn.handler(output));
  };

/** Call this from the root layout's load function. */
export const setBrowserSvelteKitFetch = (fetchImpl: typeof fetch) => {
  if (browser) _skFetch = fetchImpl;
};

// |-----------------------------------------------------------------------------------------|
// |--------------------------------------- INTERNALS ---------------------------------------|
// |-----------------------------------------------------------------------------------------|

const access = (object: any, path: string[]) => {
  let current = object;
  for (let i = 0; i < path.length && !!current; i++) current = current[path[i]];
  return current;
};

type ToInterface<T> =
  T extends RemoteFnDefinition<infer TInputSchema, infer TOutput>
    ? v.InferInput<TInputSchema> extends never
      ? () => Promise<TOutput>
      : (input: v.InferInput<TInputSchema>) => Promise<TOutput>
    : { [K in keyof T]: ToInterface<T[K]> };

function _createInterfaceProxy(path: string[]): any {
  const fn = async (input: any) => {
    const fetch = getFetch();

    const response = await fetch(`${REMOTE_API_PREFIX}${path.join("/")}`, {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  };

  return new Proxy(fn, {
    get(_, key: string) {
      return _createInterfaceProxy([...path, key]);
    },
  });
}

interface RemoteFnDefinition<TInputSchema extends v.GenericSchema, TOutput> {
  inputSchema: TInputSchema;
  handler: (input: v.InferInput<TInputSchema>) => TOutput;
}

interface ServerApiDefinition {
  [k: string]: RemoteFnDefinition<any, any> | ServerApiDefinition;
}

/**
 * Returns SvelteKit's fetch in a suitable context (server handler, load function), or the browser's fetch otherwise.
 */
const getFetch = () => {
  if (_skFetch) return _skFetch;

  try {
    const { fetch } = getRequestEvent();
    return fetch;
  } catch {
    return globalThis.fetch;
  }
};

let _skFetch: typeof fetch | undefined;

const REMOTE_API_PREFIX = "/api/remote/";
