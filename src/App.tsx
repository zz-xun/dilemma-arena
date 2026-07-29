import { useReducer } from 'react';
import type { DecisionInput, GeneratedDecision, BattleResult, Side } from './domain/types';
import { generateDecision } from './domain/generator';
import { simulateBattle } from './domain/battle';
import { InputScreen } from './screens/InputScreen';
import { AnalysisScreen } from './screens/AnalysisScreen';
import { CharacterScreen } from './screens/CharacterScreen';
import { BattleScreen } from './screens/BattleScreen';
import { VerdictScreen } from './screens/VerdictScreen';
import { ResultScreen } from './screens/ResultScreen';
import styles from './App.module.css';

// ---------------------------------------------------------------------------
// State machine — one phase active at a time, no cross-phase data access
// ---------------------------------------------------------------------------

type GamePhase =
  | { id: 'input' }
  | { id: 'analyzing'; input: DecisionInput }
  | { id: 'characters'; decision: GeneratedDecision }
  | { id: 'battle'; decision: GeneratedDecision; battleResult: BattleResult }
  | { id: 'verdict'; decision: GeneratedDecision; battleResult: BattleResult; startTime: number }
  | { id: 'result'; decision: GeneratedDecision; battleResult: BattleResult; finalWinner: Side; isReversal: boolean; reactionTime: number };

type GameAction =
  | { type: 'SUBMIT'; input: DecisionInput }
  | { type: 'ANALYSIS_DONE'; decision: GeneratedDecision }
  | { type: 'ENTER_BATTLE'; battleResult: BattleResult }
  | { type: 'BATTLE_DONE' }
  | { type: 'ACCEPT' }
  | { type: 'REVERSAL'; reactionTime: number }
  | { type: 'PLAY_AGAIN' };

function reducer(_s: GamePhase, a: GameAction): GamePhase {
  switch (a.type) {
    case 'SUBMIT':          return { id: 'analyzing', input: a.input };
    case 'ANALYSIS_DONE':   return { id: 'characters', decision: a.decision };
    case 'ENTER_BATTLE':    return { id: 'battle', decision: (_s as { id: 'characters'; decision: GeneratedDecision }).decision, battleResult: a.battleResult };
    case 'BATTLE_DONE': {
      const s = _s as { id: 'battle'; decision: GeneratedDecision; battleResult: BattleResult };
      return { id: 'verdict', decision: s.decision, battleResult: s.battleResult, startTime: performance.now() };
    }
    case 'ACCEPT': {
      const s = _s as { id: 'verdict'; decision: GeneratedDecision; battleResult: BattleResult; startTime: number };
      return { id: 'result', decision: s.decision, battleResult: s.battleResult, finalWinner: s.battleResult.winner, isReversal: false, reactionTime: (performance.now() - s.startTime) / 1000 };
    }
    case 'REVERSAL': {
      const s = _s as { id: 'verdict'; decision: GeneratedDecision; battleResult: BattleResult; startTime: number };
      const reversed: Side = s.battleResult.winner === 'A' ? 'B' : 'A';
      return { id: 'result', decision: s.decision, battleResult: s.battleResult, finalWinner: reversed, isReversal: true, reactionTime: a.reactionTime };
    }
    case 'PLAY_AGAIN':      return { id: 'input' };
    default:                return _s;
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const [phase, dispatch] = useReducer(reducer, { id: 'input' });

  return (
    <div className={styles.app}>
      <div className={styles.container}>
        {phase.id === 'input' && (
          <InputScreen onSubmit={input => dispatch({ type: 'SUBMIT', input })} />
        )}
        {phase.id === 'analyzing' && (
          <AnalysisScreen input={phase.input} onDone={() => dispatch({ type: 'ANALYSIS_DONE', decision: generateDecision(phase.input) })} />
        )}
        {phase.id === 'characters' && (
          <CharacterScreen decision={phase.decision} onEnter={() => dispatch({ type: 'ENTER_BATTLE', battleResult: simulateBattle(phase.decision) })} />
        )}
        {phase.id === 'battle' && (
          <BattleScreen decision={phase.decision} battleResult={phase.battleResult} onDone={() => dispatch({ type: 'BATTLE_DONE' })} />
        )}
        {phase.id === 'verdict' && (
          <VerdictScreen
            decision={phase.decision}
            battleResult={phase.battleResult}
            startTime={phase.startTime}
            onAccept={() => dispatch({ type: 'ACCEPT' })}
            onReversal={rt => dispatch({ type: 'REVERSAL', reactionTime: rt })}
          />
        )}
        {phase.id === 'result' && (
          <ResultScreen
            decision={phase.decision}
            battleResult={phase.battleResult}
            finalWinner={phase.finalWinner}
            isReversal={phase.isReversal}
            reactionTime={phase.reactionTime}
            onPlayAgain={() => dispatch({ type: 'PLAY_AGAIN' })}
          />
        )}
      </div>
    </div>
  );
}
