import { blurFor } from '@/lib/blur';
import { ClientImg } from './ClientImg';
import type { ImageProps } from 'next/image';

/** Server component: next/image with a blurred placeholder resolved on the server (no placeholder map shipped to browsers). */
export function Img(props: Omit<ImageProps, 'src'> & { src: string | null | undefined }) {
  return <ClientImg {...props} blur={blurFor(props.src)} />;
}
