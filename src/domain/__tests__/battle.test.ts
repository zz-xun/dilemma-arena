import { describe, it, expect } from 'vitest';
import { generateDecision } from '../generator';
import { simulateBattle, reverseWinner, calcMaxHp } from '../battle';
import type { DecisionInput } from '../types';

const DEMO: DecisionInput = {
  question: '今晚应该早睡，还是再刷十分钟手机？',
  optionA: '今晚早睡', reasonA: '明天八点有课，最近也总是睡不够。',
  optionB: '再刷十分钟手机', reasonB: '这个视频马上看完了，而且现在还不太困。',
};

const ALT: DecisionInput = {
  question: '中午吃什么？', optionA: '自己做饭', reasonA: '健康省钱，冰箱有菜',
  optionB: '点外卖', reasonB: '下雨不想出门，新店打折',
};

describe('simulateBattle', () => {
  it('calcMaxHp: 生命值即战斗HP', () => {
    expect(calcMaxHp(30)).toBe(30);
    expect(calcMaxHp(95)).toBe(95);
  });

  it('通用战斗恰好 6 回合', () => {
    const r = simulateBattle(generateDecision(ALT));
    expect(r.rounds).toHaveLength(6);
    r.rounds.forEach((rd, i) => expect(rd.round).toBe(i + 1));
  });

  it('HP 永不低于 1，永不超过上限', () => {
    const r = simulateBattle(generateDecision(ALT));
    for (const rd of r.rounds) {
      expect(rd.attackerHpAfter).toBeGreaterThanOrEqual(1);
      expect(rd.defenderHpAfter).toBeGreaterThanOrEqual(1);
      expect(rd.attackerHpAfter).toBeLessThanOrEqual(r.maxHp[rd.attacker]);
      expect(rd.defenderHpAfter).toBeLessThanOrEqual(r.maxHp[rd.defender]);
    }
  });

  it('相同输入 → 相同战斗结果', () => {
    const d = generateDecision(ALT);
    const a = simulateBattle(d), b = simulateBattle(d);
    expect(a.winner).toBe(b.winner);
    expect(a.finalHp).toEqual(b.finalHp);
    a.rounds.forEach((r, i) => expect(r.attacker).toBe(b.rounds[i].attacker));
  });

  it('多次调用不改变结果（预计算）', () => {
    const d = generateDecision(ALT);
    const results = Array.from({ length: 5 }, () => simulateBattle(d));
    results.forEach(r => expect(r.winner).toBe(results[0].winner));
  });

  it('reverseWinner 翻转胜者', () => {
    const r = simulateBattle(generateDecision(ALT));
    expect(reverseWinner(r)).not.toBe(r.winner);
  });

  it('演示：B 第六回合险胜', () => {
    const r = simulateBattle(generateDecision(DEMO));
    expect(r.winner).toBe('B');
    expect(r.finalHp.A).toBeGreaterThan(8);
    expect(r.rounds[5].round).toBe(6);
  });

  it('演示攻击回合不使用纯恢复技能', () => {
    const r = simulateBattle(generateDecision(DEMO));
    for (const rd of r.rounds.filter(round => round.damage > 0)) {
      expect(rd.skill.power).toBeGreaterThan(0);
    }
    expect(r.rounds[4].skill.heal).toBeGreaterThan(0);
  });

  it('双方至少各出手 2 次', () => {
    const r = simulateBattle(generateDecision(ALT));
    const cntA = r.rounds.filter(rd => rd.attacker === 'A').length;
    const cntB = r.rounds.filter(rd => rd.attacker === 'B').length;
    expect(cntA).toBeGreaterThanOrEqual(2);
    expect(cntB).toBeGreaterThanOrEqual(2);
  });

  it('每回合有完整数据和描述', () => {
    const r = simulateBattle(generateDecision(ALT));
    for (const rd of r.rounds) {
      expect(rd.skill.name.length).toBeGreaterThan(0);
      expect(rd.description.length).toBeGreaterThan(0);
      expect(['A', 'B']).toContain(rd.attacker);
    }
  });
});
