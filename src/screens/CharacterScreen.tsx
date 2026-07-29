import type { GeneratedDecision } from '../domain/types';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { StatBar } from '../components/StatBar';
import { SkillCard } from '../components/SkillCard';
import styles from './CharacterScreen.module.css';

interface Props { decision: GeneratedDecision; onEnter: () => void; }

export function CharacterScreen({ decision, onEnter }: Props) {
  const [a, b] = decision.characters;
  const STATS = ['life', 'attack', 'defense', 'speed', 'chaos'] as const;

  return (
    <div className={styles.screen}>
      <header className={styles.head}>
        <span className={styles.seed}>SEED {decision.seed.toUpperCase()}</span>
        <h2 className={styles.title}>双方选手</h2>
        <p className={styles.q}>"{decision.input.question}"</p>
      </header>

      <div className={styles.cards}>
        <div className={`${styles.card} ${styles.cardA}`}>
          <CharacterAvatar side="A" size="md" />
          <h3 className={styles.name} style={{ color: 'var(--side-a)' }}>{a.name}</h3>
          <p className={styles.opt}>{a.option}</p>
          <div className={styles.statList}>
            {STATS.map(s => <StatBar key={s} label={s} value={a.stats[s]} color="var(--side-a)" />)}
          </div>
          <div className={styles.skillList}>
            {a.skills.map((sk, i) => <SkillCard key={i} skill={sk} accent="var(--side-a)" />)}
          </div>
        </div>

        <div className={styles.vsCol}><span className={styles.vs}>VS</span></div>

        <div className={`${styles.card} ${styles.cardB}`}>
          <CharacterAvatar side="B" size="md" />
          <h3 className={styles.name} style={{ color: 'var(--side-b)' }}>{b.name}</h3>
          <p className={styles.opt}>{b.option}</p>
          <div className={styles.statList}>
            {STATS.map(s => <StatBar key={s} label={s} value={b.stats[s]} color="var(--side-b)" />)}
          </div>
          <div className={styles.skillList}>
            {b.skills.map((sk, i) => <SkillCard key={i} skill={sk} accent="var(--side-b)" />)}
          </div>
        </div>
      </div>

      <button className={styles.btn} onClick={onEnter}>进入擂台</button>
    </div>
  );
}
