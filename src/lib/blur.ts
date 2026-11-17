import 'server-only';
import blurMap from '@/generated/blur-map.json';
/** Server-only lookup of tiny blurred placeholders (kept out of client bundles). */
export const blurFor = (src: string | null | undefined) => (src ? (blurMap as Record<string, string>)[src] : undefined);
