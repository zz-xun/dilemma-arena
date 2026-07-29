import { useCallback } from 'react';
import type { GeneratedDecision, BattleResult, Side } from '../domain/types';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { exportResultImage } from '../utils/imageExport';
import styles from './ResultScreen.module.css';

interface Props {
  decision: GeneratedDecision;
  battleResult: BattleResult;
  finalWinner: Side;
  isReversal: boolean;
  reactionTime: number;
  onPlayAgain: () => void;
}

function reactionText(s: number): string {
  if (s < 1) return '你甚至没有犹豫。';
  if (s < 3) return '短暂思考后，你还是站到了它这一边。';
  return '绕了一圈，你还是把它救了回来。';
}

function acceptText(input: GeneratedDecision['input'], winner: Side): string {
  if (input.question === '今晚应该早睡，还是再刷十分钟手机？' && input.optionB === '再刷十分钟手机' && winner === 'B') {
    return '允许再刷十分钟。变量工坊不负责解释为什么天已经亮了。';
  }
  return '你接受了这个答案。至少这一刻，它和你的直觉站在同一边。';
}

export function ResultScreen({ decision, battleResult, finalWinner, isReversal, reactionTime, onPlayAgain }: Props) {
  const [charA, charB] = decision.characters;
  const systemChar = battleResult.winner === 'A' ? charA : charB;
  const winChar = finalWinner === 'A' ? charA : charB;
  const winColor = finalWinner === 'A' ? 'var(--side-a)' : 'var(--side-b)';

  const doExport = useCallback(async () => {
    try { await exportResultImage({ decision, battleResult, finalWinner, isReversal, reactionTime }); }
    catch { alert('图片导出失败，请重试'); }
  }, [decision, battleResult, finalWinner, isReversal, reactionTime]);

  return (
    <div className={styles.screen}>
      <header className={styles.head}>
        <p className={styles.hLabel}>结果</p>
        <p className={styles.hQ}>"{decision.input.question}"</p>
      </header>

      {/* Avatars + VS */}
      <div className={styles.showdown}>
        <div className={`${styles.slot} ${finalWinner !== 'A' ? styles.lose : ''}`}>
          <CharacterAvatar side="A" size="sm" />
          <span className={styles.cName} style={{ color: 'var(--side-a)' }}>{charA.name}</span>
        </div>
        <div className={styles.vsCol}><span className={styles.vs}>VS</span></div>
        <div className={`${styles.slot} ${finalWinner !== 'B' ? styles.lose : ''}`}>
          <CharacterAvatar side="B" size="sm" />
          <span className={styles.cName} style={{ color: 'var(--side-b)' }}>{charB.name}</span>
        </div>
      </div>

      {/* Winner */}
      <div className={styles.winBox}>
        <span className={styles.wLabel}>{isReversal ? '本人改判' : '系统判决'}</span>
        <h2 className={styles.wName} style={{ color: winColor }}>{winChar.name}</h2>
        <p className={styles.wOpt}>「{winChar.option}」</p>
        {isReversal && <p className={styles.original}>系统原判：{systemChar.option}</p>}
      </div>

      {/* Reversal */}
      {isReversal && (
        <div className={styles.revBox}>
          <span className={styles.revTag}>改判成功</span>
          <p className={styles.revTime}>反悔用时 {reactionTime.toFixed(1)} 秒</p>
          <p className={styles.revSpeed}>{reactionText(reactionTime)}</p>
          <p className={styles.revQuote}>其实你心里早就有答案。你缺的不是答案，只是一次确认。</p>
        </div>
      )}

      {!isReversal && <p className={styles.acceptTxt}>{acceptText(decision.input, finalWinner)}</p>}

      {/* Round summary */}
      <div className={styles.rSummary}>
        <h4 className={styles.rTitle}>战斗回顾</h4>
        {battleResult.rounds.map((r, i) => (
          <div key={i} className={`${styles.rLine} ${styles[`s${r.attacker}`]}`}>
            <span className={styles.rNum}>R{r.round}</span>
            <span className={styles.rDesc}>{r.description}</span>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button className={styles.export} onClick={doExport}>保存战报图片</button>
        <button className={styles.again} onClick={onPlayAgain}>再打一场</button>
      </div>

      <p className={styles.note}>⚠ 本工具仅供日常低风险选择的娱乐参考，不适用于医疗、投资、法律等重大决策。</p>
    </div>
  );
}
