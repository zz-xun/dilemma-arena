import { describe, it, expect } from 'vitest';
import { generateDecision, isDemoInput } from '../generator';
import type { DecisionInput } from '../types';

const DEMO: DecisionInput = {
  question: '今晚应该早睡，还是再刷十分钟手机？',
  optionA: '今晚早睡', reasonA: '明天八点有课，最近也总是睡不够。',
  optionB: '再刷十分钟手机', reasonB: '这个视频马上看完了，而且现在还不太困。',
};

describe('generateDecision', () => {
  it('所有属性在 30–95 范围内', () => {
    const r = generateDecision(DEMO);
    for (const c of r.characters) {
      for (const v of Object.values(c.stats)) {
        expect(v).toBeGreaterThanOrEqual(30);
        expect(v).toBeLessThanOrEqual(95);
      }
    }
  });

  it('相同输入 → 完全相同的结果', () => {
    const a = generateDecision(DEMO);
    const b = generateDecision(DEMO);
    expect(a.seed).toBe(b.seed);
    expect(a.characters[0].stats).toEqual(b.characters[0].stats);
    expect(a.characters[1].stats).toEqual(b.characters[1].stats);
    expect(a.characters[0].skills.map(s => s.name)).toEqual(b.characters[0].skills.map(s => s.name));
    expect(a.characters[1].skills.map(s => s.name)).toEqual(b.characters[1].skills.map(s => s.name));
  });

  it('不同输入 → 不同种子', () => {
    const alt: DecisionInput = { question: '中午吃什么？', optionA: '做饭', reasonA: '健康省钱', optionB: '外卖', reasonB: '方便快捷' };
    expect(generateDecision(DEMO).seed).not.toBe(generateDecision(alt).seed);
  });

  it('每方恰好 4 个不重复技能', () => {
    const r = generateDecision(DEMO);
    for (const c of r.characters) {
      expect(c.skills).toHaveLength(4);
      expect(new Set(c.skills.map(s => s.name)).size).toBe(4);
    }
  });

  it('关键词影响方向："下雨"降低速度', () => {
    const input: DecisionInput = { question: '出不出门', optionA: '出门', reasonA: '外面下雨堵车', optionB: '在家', reasonB: '舒服' };
    const r = generateDecision(input);
    expect(r.characters[0].stats.speed).toBeLessThanOrEqual(r.characters[0].stats.chaos + 10);
  });

  it('演示输入被正确识别', () => {
    expect(isDemoInput(DEMO)).toBe(true);
    expect(isDemoInput({ ...DEMO, optionA: '其他' })).toBe(false);
  });

  it('演示生成固定角色名', () => {
    const r = generateDecision(DEMO);
    expect(r.characters[0].name).toBe('早睡执行官');
    expect(r.characters[1].name).toBe('十分钟诱惑体');
  });

  it('英文和符号选项也能生成完整角色名', () => {
    const input: DecisionInput = {
      question: 'Which one?', optionA: 'Netflix', reasonA: 'easy',
      optionB: '!!!', reasonB: 'why not',
    };
    const r = generateDecision(input);
    expect(r.characters[0].name.startsWith('NETFLI')).toBe(true);
    expect(r.characters[1].name.startsWith('未知')).toBe(true);
  });

  it('技能不会从零凭空抖出恢复或加成', () => {
    const r = generateDecision(DEMO);
    const deadline = r.characters[0].skills.find(s => s.name === '截止日逼近');
    expect(deadline?.heal).toBe(0);
    expect(deadline?.dodgeBonus).toBe(0);
  });
});
