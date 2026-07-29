import type { Side } from '../domain/types';
import mascotA from '../assets/mascot-a.svg';
import mascotB from '../assets/mascot-b.svg';
import styles from './CharacterAvatar.module.css';

interface Props {
  side: Side;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Character avatar — rendered from polished SVG mascot designs.
 * All creative work is in the SVG files; this component only handles
 * sizing and glow.
 */
export function CharacterAvatar({ side, size = 'md' }: Props) {
  const src = side === 'A' ? mascotA : mascotB;
  const alt = side === 'A' ? '纠结擂台 A 形象' : '纠结擂台 B 形象';
  const glow = side === 'A'
    ? 'rgba(249,134,112,0.25)'
    : 'rgba(82,207,225,0.25)';

  const sizePx = { sm: 80, md: 120, lg: 160 }[size];

  return (
    <div className={`${styles.wrap} ${styles[size]}`} style={{ '--glow': glow } as React.CSSProperties}>
      <img
        src={src}
        alt={alt}
        width={sizePx}
        height={sizePx}
        className={styles.img}
      />
    </div>
  );
}
