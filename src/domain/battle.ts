import type { GeneratedDecision, BattleResult, RoundEvent, Side, Skill, Character } from './types';
import { hashString, createRNG } from './rng';
import { isDemoInput } from './generator';

// ---------------------------------------------------------------------------
// Battle math
// ---------------------------------------------------------------------------

/** Battle HP equals the life stat directly — no conversion formula. */
function calcMaxHp(life: number): number {
  return life;
}

function persuasiveness(c: Character): number {
  const { life, attack, defense, speed, chaos } = c.stats;
  return life * 0.20 + attack * 0.29 + defense * 0.20 + speed * 0.19 + chaos * 0.12;
}

function variance(rng: () => number): number {
  return 0.82 + rng() * 0.36;
}

// ---------------------------------------------------------------------------
// Demo battle — FIXED values guarantee B wins by narrow margin in round 6.
// Damage/heal numbers are hardcoded, not read from generated skills (which
// have jitter).  The skill OBJECTS (name, description) still come from the
// generated character so the log shows the right skill names.
// ---------------------------------------------------------------------------

function demoBattle(decision: GeneratedDecision): BattleResult {
  const [charA, charB] = decision.characters;
  const maxA = calcMaxHp(charA.stats.life);
  const maxB = calcMaxHp(charB.stats.life);
  let hpA = maxA, hpB = maxB;
  const rounds: RoundEvent[] = [];

  const attackSkill = (char: Character, preferredIndex: number) =>
    (char.skills[preferredIndex]?.power > 0 ? char.skills[preferredIndex] : undefined)
    ?? char.skills.find(skill => skill.power > 0)
    ?? char.skills[0];
  const fallbackRecovery: Skill = {
    name: '睡眠恢复', description: '把积累的疲惫转化为恢复力',
    power: 0, heal: 20, criticalBonus: 0, dodgeBonus: 0, healOnly: true,
  };
  const healSkill = (char: Character, preferredIndex: number) =>
    (char.skills[preferredIndex]?.heal > 0 ? char.skills[preferredIndex] : undefined)
    ?? char.skills.find(skill => skill.heal > 0)
    ?? fallbackRecovery;

  // Damage as % of target's max HP — works with any life value.
  // B's damage % is higher to overcome A's typical HP advantage.
  const d = (v: number, max: number) => Math.max(1, Math.round(max * v));
  const dmgs = {
    r1: d(0.16, maxB),        // A→B: solid but not crushing
    r2: d(0.18, maxA),        // B→A: slightly stronger
    r3: d(0.15, maxB),        // A→B
    r4: d(0.28, maxA),        // B→A crit: turns the tide
    r5heal: d(0.16, maxA),    // A self-heal
    r6: d(0.30, maxA),        // B→A crit: decisive
  };

  hpB -= dmgs.r1;
  rounds.push(buildRound(1, 'A', 'B', attackSkill(charA, 0), dmgs.r1, 0, false, false, maxA, maxB, hpA, hpB, charA.name, charB.name));

  hpA -= dmgs.r2;
  rounds.push(buildRound(2, 'B', 'A', attackSkill(charB, 0), dmgs.r2, 0, false, false, hpA + dmgs.r2, hpB, hpA, hpB, charA.name, charB.name));

  hpB -= dmgs.r3;
  rounds.push(buildRound(3, 'A', 'B', attackSkill(charA, 2), dmgs.r3, 0, false, false, hpA, hpB + dmgs.r3, hpA, hpB, charA.name, charB.name));

  hpA -= dmgs.r4;
  rounds.push(buildRound(4, 'B', 'A', attackSkill(charB, 1), dmgs.r4, 0, true, false, hpA + dmgs.r4, hpB, hpA, hpB, charA.name, charB.name));

  const h = Math.min(dmgs.r5heal, maxA - hpA);
  hpA += h;
  rounds.push(buildRound(5, 'A', 'A', healSkill(charA, 1), 0, h, false, false, hpA - h, hpB, hpA, hpB, charA.name, charB.name));

  hpA -= dmgs.r6;
  rounds.push(buildRound(6, 'B', 'A', attackSkill(charB, 2), dmgs.r6, 0, true, false, hpA + dmgs.r6, hpB, hpA, hpB, charA.name, charB.name));

  return {
    winner: hpB > hpA ? 'B' : 'A',
    rounds, seed: decision.seed,
    finalHp: { A: hpA, B: hpB },
    maxHp: { A: maxA, B: maxB },
  };
}

// ---------------------------------------------------------------------------
// General battle simulation
// ---------------------------------------------------------------------------

function simulateGeneralBattle(decision: GeneratedDecision): BattleResult {
  const [charA, charB] = decision.characters;
  const combined = `${decision.input.question}|${decision.input.optionA}|${decision.input.reasonA}|${decision.input.optionB}|${decision.input.reasonB}`;
  const rng = createRNG(hashString(combined + '|battle'));

  const maxA = calcMaxHp(charA.stats.life);
  const maxB = calcMaxHp(charB.stats.life);
  let hpA = maxA, hpB = maxB;

  const wA = persuasiveness(charA);
  const wB = persuasiveness(charB);

  const rounds: RoundEvent[] = [];
  let lastAttacker: Side | null = null;
  const attackCount: Record<Side, number> = { A: 0, B: 0 };
  const usedA = new Set<number>();
  const usedB = new Set<number>();

  function pickSkill(char: Character, used: Set<number>): Skill {
    const available = char.skills.map((s, i) => ({ s, i })).filter(({ i }) => !used.has(i));
    const pick = available.length > 0
      ? available[Math.floor(rng() * available.length)]
      : { s: char.skills[Math.floor(rng() * char.skills.length)], i: -1 };
    if (pick.i >= 0) used.add(pick.i);
    return pick.s;
  }

  for (let r = 1; r <= 6; r++) {
    // --- Who acts this round ---
    let attacker: Side;
    if (r === 1) {
      attacker = charA.stats.speed + rng() * 20 >= charB.stats.speed + rng() * 20 ? 'A' : 'B';
    } else if (r === 2) {
      attacker = lastAttacker === 'A' ? 'B' : 'A';
    } else {
      const remaining = 6 - r + 1;
      const needA = Math.max(0, 2 - attackCount.A);
      const needB = Math.max(0, 2 - attackCount.B);
      if (needA >= remaining) attacker = 'A';
      else if (needB >= remaining) attacker = 'B';
      else attacker = rng() < wA / (wA + wB) ? 'A' : 'B';
    }

    lastAttacker = attacker;
    attackCount[attacker]++;

    const attChar = attacker === 'A' ? charA : charB;
    const usedSet = attacker === 'A' ? usedA : usedB;
    const skill = pickSkill(attChar, usedSet);

    // --- Resolve action ---
    let defender: Side;
    let damage = 0, heal = 0;
    let isCrit = false, isDodge = false;

    if (skill.healOnly) {
      // Self-targeting heal: no damage, no dodge, heals caster
      defender = attacker;
      heal = Math.floor(skill.heal * (0.8 + rng() * 0.4));
    } else {
      // Attack (or hybrid attack+heal): target is opponent
      defender = attacker === 'A' ? 'B' : 'A';
      const defChar = defender === 'A' ? charA : charB;

      // Damage
      const rawPower = skill.power > 0
        ? (attChar.stats.attack * 0.6 + skill.power * 0.4) * (1 - defChar.stats.defense / 260)
        : 0;
      const varied = rawPower * variance(rng);

      // Crit
      const critChance = 0.05 + attChar.stats.chaos / 200 + skill.criticalBonus / 200;
      isCrit = rng() < critChance;
      const critMul = isCrit ? (1.4 + rng() * 0.1) : 1;

      // Dodge
      const dodgeChance = 0.03 + defChar.stats.chaos / 300 + skill.dodgeBonus / 300;
      isDodge = rng() < dodgeChance;

      damage = Math.floor(varied * critMul);
      if (isDodge) damage = Math.max(1, Math.floor(damage * 0.08));
      damage = Math.max(1, Math.min(damage, 999));

      // Heal component (hybrid skills heal attacker while damaging opponent)
      heal = skill.heal > 0 ? Math.floor(skill.heal * (0.8 + rng() * 0.4)) : 0;
    }

    const aBefore = hpA, bBefore = hpB;

    // Heal always goes to attacker
    if (heal > 0) {
      if (attacker === 'A') hpA = Math.min(maxA, hpA + heal);
      else hpB = Math.min(maxB, hpB + heal);
    }

    // Damage always goes to defender
    if (damage > 0) {
      if (defender === 'A') hpA = Math.max(1, hpA - damage);
      else hpB = Math.max(1, hpB - damage);
    }

    rounds.push(buildRound(
      r, attacker, defender, skill, damage, heal, isCrit, isDodge,
      aBefore, bBefore, hpA, hpB, charA.name, charB.name,
    ));
  }

  return {
    winner: hpA >= hpB ? 'A' : 'B',
    rounds,
    seed: decision.seed,
    finalHp: { A: hpA, B: hpB },
    maxHp: { A: maxA, B: maxB },
  };
}

// ---------------------------------------------------------------------------
// Round event builder
// ---------------------------------------------------------------------------

function buildRound(
  round: number,
  attacker: Side,
  defender: Side,
  skill: Skill,
  damage: number,
  heal: number,
  isCrit: boolean,
  isDodge: boolean,
  aBefore: number,
  bBefore: number,
  aAfter: number,
  bAfter: number,
  nameA: string,
  nameB: string,
): RoundEvent {
  const attName = attacker === 'A' ? nameA : nameB;
  const defName = defender === 'A' ? nameA : nameB;
  const selfTarget = attacker === defender;

  let log: string;

  if (selfTarget && heal > 0) {
    log = `${attName} 转向自身——「${skill.name}」恢复 ${heal} 点。`;
  } else if (heal > 0 && damage > 0) {
    const defHp = defender === 'A' ? aAfter : bAfter;
    const prefix = isCrit ? '突然发力，' : '';
    const suffix = isDodge ? `，${defName} 勉强避开大半` : '';
    log = `${attName} ${prefix}「${skill.name}」造成 ${damage} 点${suffix}，同时自身恢复 ${heal} 点。${defName} 余 ${defHp}。`;
  } else if (isCrit) {
    const defHp = defender === 'A' ? aAfter : bAfter;
    log = `${attName} 突然发力——「${skill.name}」击中要害，造成 ${damage} 点冲击。${defName} 余 ${defHp}。`;
  } else if (isDodge) {
    log = `${attName} 「${skill.name}」被 ${defName} 闪开大半，仅擦伤 ${damage} 点。`;
  } else {
    const defHp = defender === 'A' ? aAfter : bAfter;
    log = `${attName} 「${skill.name}」——${damage} 点。${defName} 余 ${defHp}。`;
  }

  return {
    round, attacker, defender, skill, damage, heal, isCrit, isDodge,
    attackerHpBefore: attacker === 'A' ? aBefore : bBefore,
    defenderHpBefore: defender === 'A' ? aBefore : bBefore,
    attackerHpAfter: attacker === 'A' ? aAfter : bAfter,
    defenderHpAfter: defender === 'A' ? aAfter : bAfter,
    description: log,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function simulateBattle(decision: GeneratedDecision): BattleResult {
  return isDemoInput(decision.input) ? demoBattle(decision) : simulateGeneralBattle(decision);
}

export function reverseWinner(result: BattleResult): Side {
  return result.winner === 'A' ? 'B' : 'A';
}

export { calcMaxHp, persuasiveness };
