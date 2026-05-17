export function shouldRunGlobalSearch(query: string) {
  return query.trim().length >= 2;
}
