/**
 * The Supabase clients in this app are created without generated database
 * types, so supabase-js cannot tell to-one from to-many embeds and types every
 * embedded resource as an array. PostgREST actually returns to-one embeds
 * (e.g. `products -> categories`, `order_items -> orders`) as a plain object
 * and to-many embeds as an array.
 *
 * The hand-written row types in this codebase describe the real runtime shape,
 * so query results are narrowed through this helper instead of being spelled
 * `any`. It is a type-level cast only — no data is transformed.
 */
export function asRows<T>(data: unknown): T[] {
  return data as T[];
}

/** Same as {@link asRows}, for the single-row `.single()` / `.maybeSingle()` case. */
export function asRow<T>(data: unknown): T {
  return data as T;
}
