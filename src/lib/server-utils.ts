// parseAuthors stub — no 'authors' collection is currently defined.
// If an authors collection is added to content.config.ts in the future,
// uncomment the getEntry-based implementation below.

export async function parseAuthors(authors: string[]) {
  if (!authors || authors.length === 0) return []
  return authors.map((id) => ({
    id,
    name: id,
    avatar: '/static/logo.png',
    isRegistered: false,
  }))
}
