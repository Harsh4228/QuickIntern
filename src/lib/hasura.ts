const HASURA_URL = process.env.HASURA_GRAPHQL_URL;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET!;

/**
 * Execute a GraphQL query/mutation against the Hasura endpoint using the admin secret.
 * Only call this from server-side code (API routes, server components).
 */
export async function hasuraRequest<T = Record<string, unknown>>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!HASURA_URL) {
    throw new Error('HASURA_GRAPHQL_URL environment variable is not set');
  }
  const res = await fetch(HASURA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Hasura HTTP error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(
      (json.errors as Array<{ message: string }>)
        .map((e) => e.message)
        .join("; ")
    );
  }

  return json.data as T;
}
