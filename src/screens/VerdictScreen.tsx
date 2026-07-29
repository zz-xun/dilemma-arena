import { useState, useEffect, useRef, useCallback } from 'react';
import type { GeneratedDecision, BattleResult } from '../domain/types';
import { CharacterAvatar } from '../components/CharacterAvatar';
import styles from './VerdictScreen.module.css';

interface Props {
  decision: GeneratedDecision;
  battleResult: BattleResult;
  startTime: number;
  onAccept: () => void;
  onReversal: (reactionTime: number) => void;
}

export function VerdictScreen({ decision, battleResult, startTime, onAccept, onReversal }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const acted = useRef(false);

  useEffect(() => { const t = setTimeout(() => setRevealed(true), 350); return () => clearTimeout(t); }, []);
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((performance.now() - startTime) / 1000), 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTime]);

  const reverse = useCallback(() => {
    if (acted.current) return; acted.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    onReversal((performance.now() - startTime) / 1000);
  }, [startTime, onReversal]);

  const accept = useCallback(() => {
    if (acted.current) return; acted.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    onAccept();
  }, [onAccept]);

  const winner = battleResult.winner;
  const [charA, charB] = decision.characters;
  const winChar = winner === 'A' ? charA : charB;
  const rounds = battleResult.rounds;
  const last = rounds[rounds.length - 1];

  return (
    <div className={`${styles.screen} ${revealed ? styles.on : ''}`}>
      <div className={styles.banner}>
        <h2 className={styles.label}>系统判决</h2>
        <CharacterAvatar side={winner} size="md" />
        <h1 className={styles.name} style={{ color: winner === 'A' ? 'var(--side-a)' : 'var(--side-b)' }}>
          {winChar.name}
        </h1>
        <p className={styles.opt}>「{winChar.option}」</p>
        <p className={styles.hp}>剩余 {battleResult.finalHp[winner]}</p>
      </div>

      {last && (
        <div className={styles.lastSkill}>
          <span className={styles.lsLabel}>决胜技能</span>
          <span className={styles.lsName}>{last.skill.name}</span>
        </div>
      )}

      <div className={styles.timer}>
        <span className={styles.tmVal}>{elapsed.toFixed(1)}s</span>
      </div>

      <div className={styles.btns}>
        <button className={styles.accept} onClick={accept}>接受判决</button>
        <button className={styles.reversal} onClick={reverse}>我不服</button>
      </div>
    </div>
  );
}
