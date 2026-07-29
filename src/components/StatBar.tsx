import styles from './StatBar.module.css';

const LABELS: Record<string, string> = {
  life: '生命', attack: '攻击', defense: '防御', speed: '速度', chaos: '变数',
};

interface Props {
  label: string;
  value: number;
  color?: string;
}

export function StatBar({ label, value, color = 'var(--accent)' }: Props) {
  const pct = Math.max(0, Math.min(100, (value / 95) * 100));
  return (
    <div className={styles.row}>
      <span className={styles.label}>{LABELS[label] ?? label}</span>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
