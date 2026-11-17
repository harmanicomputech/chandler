import Image, { type ImageProps } from 'next/image';

/** Usable from client components: pass `blur` (resolved on the server) for a placeholder. */
export function ClientImg({ src, alt, blur, ...rest }: Omit<ImageProps, 'src'> & { src: string | null | undefined; blur?: string }) {
  if (!src) return <div aria-hidden className={`bg-gradient-to-br from-blue-100 via-mist to-teal-50 ${rest.className ?? ''}`} style={rest.fill ? { position: 'absolute', inset: 0 } : undefined} />;
  return <Image src={src} alt={alt} placeholder={blur ? 'blur' : 'empty'} blurDataURL={blur} {...rest} />;
}
