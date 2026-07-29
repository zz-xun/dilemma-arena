import { useState, useEffect, useRef, useCallback } from 'react';
import type { GeneratedDecision, BattleResult, RoundEvent, Side } from '../domain/types';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { HealthBar } from '../components/HealthBar';
import styles from './BattleScreen.module.css';

interface Props {
  decision: GeneratedDecision;
  battleResult: BattleResult;
  onDone: () => void;
}

const ROUND_MS = 1600;

export function BattleScreen({ decision, battleResult, onDone }: Props) {
  const [visible, setVisible] = useState<RoundEvent[]>([]);
  const [roundIdx, setRoundIdx] = useState(-1);
  const [animSide, setAnimSide] = useState<Side | null>(null);
  const [floatText, setFloatText] = useState<{ side: Side; text: string; key: number } | null>(null);
  const [hpA, setHpA] = useState(battleResult.maxHp.A);
  const [hpB, setHpB] = useState(battleResult.maxHp.B);
  const [skipping, setSkipping] = useState(false);
  const [done, setDone] = useState(false);
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const stoppedRef = useRef(false);
  const finishedRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  const [charA, charB] = decision.characters;

  const schedule = useCallback((fn: () => void, delay: number, runWhenStopped = false) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      if (!stoppedRef.current || runWhenStopped) fn();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  }, []);

  const play = useCallback((idx: number) => {
    if (stoppedRef.current) return;
    if (idx >= battleResult.rounds.length) {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setDone(true);
      schedule(onDone, 500);
      return;
    }
    const r = battleResult.rounds[idx];
    setRoundIdx(idx);
    setAnimSide(r.attacker);
    schedule(() => setAnimSide(null), 350);

    const key = Date.now();
    if (r.damage > 0) setFloatText({ side: r.defender, text: r.isCrit ? `暴击 ${r.damage}` : `-${r.damage}`, key });
    else if (r.heal > 0) setFloatText({ side: r.attacker, text: `+${r.heal}`, key });
    schedule(() => setFloatText(null), 800);

    // HP update: handle attacker, defender, and self-target (heal) correctly
    const hpAfter = (side: Side) =>
      r.attacker === side ? r.attackerHpAfter :
      r.defender === side ? r.defenderHpAfter :
      null;
    const na = hpAfter('A'); if (na !== null) setHpA(na);
    const nb = hpAfter('B'); if (nb !== null) setHpB(nb);
    setVisible(p => [...p, r]);
    schedule(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 80);

    schedule(() => play(idx + 1), ROUND_MS);
  }, [battleResult, onDone, schedule]);

  useEffect(() => {
    stoppedRef.current = false;
    finishedRef.current = false;
    schedule(() => play(0), 500);
    return () => {
      stoppedRef.current = true;
      clearTimers();
    };
  }, [clearTimers, play, schedule]);

  const skip = useCallback(() => {
    if (skipping || done || finishedRef.current) return;
    stoppedRef.current = true;
    finishedRef.current = true;
    setSkipping(true);
    clearTimers();
    setVisible([...battleResult.rounds]);
    setRoundIdx(Math.max(0, battleResult.rounds.length - 1));
    setHpA(battleResult.finalHp.A);
    setHpB(battleResult.finalHp.B);
    setAnimSide(null); setFloatText(null);
    setDone(true);
    schedule(onDone, 400, true);
  }, [skipping, done, battleResult, onDone, clearTimers, schedule]);

  const current = battleResult.rounds[roundIdx];

  return (
    <div className={styles.screen}>
      {/* Header */}
      <div className={styles.head}>
        <p className={styles.q}>{decision.input.question}</p>
        <div className={styles.info}>
          <span className={styles.round}>第 {Math.max(0, Math.min(roundIdx + 1, battleResult.rounds.length))} / {battleResult.rounds.length} 回合</span>
          <span className={styles.seed}>SEED {battleResult.seed.toUpperCase()}</span>
        </div>
      </div>

      {/* Arena */}
      <div className={styles.arena}>
        <div className={styles.line} />

        {/* A at 25% */}
        <div className={`${styles.fighter} ${styles.fA} ${animSide === 'A' ? styles.atk : ''}`}>
          <CharacterAvatar side="A" size="sm" />
          <div className={styles.fInfo}>
            <h3 className={styles.fName} style={{ color: 'var(--side-a)' }}>{charA.name}</h3>
            <HealthBar current={hpA} max={battleResult.maxHp.A} color="var(--side-a)" />
          </div>
          {floatText?.side === 'A' && <span className={`${styles.float} ${floatText.text.startsWith('+') ? styles.heal : ''}`} key={floatText.key}>{floatText.text}</span>}
        </div>

        {/* VS */}
        <div className={styles.vsBadge}>VS</div>

        {/* B at 75% */}
        <div className={`${styles.fighter} ${styles.fB} ${animSide === 'B' ? styles.atk : ''}`}>
          <CharacterAvatar side="B" size="sm" />
          <div className={styles.fInfo}>
            <h3 className={styles.fName} style={{ color: 'var(--side-b)' }}>{charB.name}</h3>
            <HealthBar current={hpB} max={battleResult.maxHp.B} color="var(--side-b)" />
          </div>
          {floatText?.side === 'B' && <span className={`${styles.float} ${floatText.text.startsWith('+') ? styles.heal : ''}`} key={floatText.key}>{floatText.text}</span>}
        </div>
      </div>

      {/* Action */}
      {current && !skipping && (
        <div className={styles.action}>
          <span>{current.attacker === 'A' ? charA.name : charB.name} 使出「{current.skill.name}」</span>
        </div>
      )}

      {/* Log */}
      <div className={styles.log} ref={logRef}>
        {visible.map((r, i) => (
          <div key={i} className={`${styles.entry} ${styles[`s${r.attacker}`]}`}>
            <span className={styles.rn}>R{r.round}</span>
            <span className={styles.txt}>{r.description}</span>
          </div>
        ))}
      </div>

      {!done && <button className={styles.skip} onClick={skip}>跳过动画 →</button>}
    </div>
  );
}
