/** Adapt existing public URLs only for the static Pages build, including JSON map keys. */
export function prefixPublicAssets(source: string, base: string): string {
  return source.replace(/(["'`(])\/(course-art|fonts|listening-audio)\//g, `$1${base}$2/`);
}
