import styles from './HealthBar.module.css';

interface Props {
  current: number;
  max: number;
  color: string;
  label?: string;
}

export function HealthBar({ current, max, color, label }: Props) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const low = pct < 25;
  return (
    <div className={styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.track}>
        <div className={`${styles.fill} ${low ? styles.low : ''}`} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={`${styles.val} ${low ? styles.low : ''}`}>{current}/{max}</span>
    </div>
  );
}
