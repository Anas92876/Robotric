/**
 * The old API returned MongoDB documents, whose key is `_id`. Rows here use
 * `id`; this renames it so response bodies are unchanged for the clients.
 */
export type WithMongoId<T extends { id: string }> = Omit<T, 'id'> & { _id: string };

export function withMongoId<T extends { id: string }>(row: T): WithMongoId<T> {
  const { id, ...rest } = row;
  return { _id: id, ...rest };
}

/** Same as withMongoId but also keeps `id` (models that had `toJSON: { virtuals: true }`). */
export function withBothIds<T extends { id: string }>(row: T): WithMongoId<T> & { id: string } {
  return { ...withMongoId(row), id: row.id };
}

/** `{ _id, name, email }` — the shape Mongoose's `.populate('x', 'name email')` produced. */
export interface UserRef {
  _id: string;
  name: string;
  email: string;
}
