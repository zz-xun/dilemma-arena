/** A or B side */
export type Side = 'A' | 'B';

/** Raw user input */
export interface DecisionInput {
  question: string;
  optionA: string;
  reasonA: string;
  optionB: string;
  reasonB: string;
}

/** Five attributes derived from the user's language */
export interface CharacterStats {
  life: number;   // 长期价值与持续影响力——让角色更耐久
  attack: number; // 欲望强度与紧迫程度——让角色更主动
  defense: number;// 理由的具体性与可信度——让角色站得住
  speed: number;  // 执行便利性与启动成本——决定出手快慢
  chaos: number;  // 不确定性带来的翻盘空间——意外之源
}

/** A combat skill — one argument dramatized into a move */
export interface Skill {
  name: string;
  description: string;
  power: number;
  heal: number;
  criticalBonus: number;
  dodgeBonus: number;
  /** If true, this skill targets self (heal/buff only, never deals damage) */
  healOnly: boolean;
}

/** A fully generated character (one side's "inner agent") */
export interface Character {
  side: Side;
  name: string;
  option: string;
  reason: string;
  stats: CharacterStats;
  skills: [Skill, Skill, Skill, Skill];
}

/** Complete generator output */
export interface GeneratedDecision {
  input: DecisionInput;
  seed: string;
  characters: [Character, Character];
}

/** One round in the internal debate */
export interface RoundEvent {
  round: number;
  attacker: Side;
  defender: Side;
  skill: Skill;
  damage: number;
  heal: number;
  isCrit: boolean;
  isDodge: boolean;
  attackerHpBefore: number;
  defenderHpBefore: number;
  attackerHpAfter: number;
  defenderHpAfter: number;
  description: string;
}

/** Complete battle result — pre-computed before any animation */
export interface BattleResult {
  winner: Side;
  rounds: RoundEvent[];
  seed: string;
  finalHp: { A: number; B: number };
  maxHp: { A: number; B: number };
}
