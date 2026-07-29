import { useEffect, useState, useRef } from 'react';
import type { DecisionInput } from '../domain/types';
import { generateSeed } from '../domain/rng';
import styles from './AnalysisScreen.module.css';

interface Props { input: DecisionInput; onDone: () => void; }

const STEPS = ['读取双方陈述', '识别语义特征', '生成角色属性', '拼装技能组合', '就绪'];

export function AnalysisScreen({ input, onDone }: Props) {
  const [step, setStep] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    let i = 0;
    let completionTimer: ReturnType<typeof setTimeout> | null = null;
    const timer = setInterval(() => {
      i++;
      if (i < STEPS.length) setStep(i);
      else {
        clearInterval(timer);
        if (!done.current) {
          done.current = true;
          completionTimer = setTimeout(onDone, 350);
        }
      }
    }, 500);
    return () => {
      clearInterval(timer);
      if (completionTimer) clearTimeout(completionTimer);
    };
  }, [onDone]);

  const seed = generateSeed(`${input.question}|${input.optionA}|${input.reasonA}|${input.optionB}|${input.reasonB}`);

  return (
    <div className={styles.screen}>
      <div className={styles.center}>
        {/* Scan bar */}
        <div className={styles.scan}><div className={styles.scanLine} /></div>

        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s} className={`${styles.step} ${i < step ? styles.done : i === step ? styles.cur : styles.wait}`}>
              <span className={styles.dot} />
              <span>{s}</span>
            </div>
          ))}
        </div>

        <div className={styles.seed}>
          <span className={styles.seedLabel}>SEED</span>
          <span className={styles.seedVal}>{seed.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
