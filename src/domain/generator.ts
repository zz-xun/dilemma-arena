import type { DecisionInput, CharacterStats, Skill, Character, GeneratedDecision, Side } from './types';
import { hashString, createRNG, generateSeed, seededShuffle } from './rng';

// ---------------------------------------------------------------------------
// Semantic feature groups — what we detect in user language
// ---------------------------------------------------------------------------

interface FeatureGroup {
  /** Chinese label for the semantic category */
  label: string;
  keywords: string[];
  statDirection: Partial<CharacterStats>;
  skillPool: SkillTemplate[];
}

interface SkillTemplate {
  name: string;
  /** Effect description — will be prefixed with source explanation at generation time */
  effect: string;
  power: number;
  heal: number;
  criticalBonus: number;
  dodgeBonus: number;
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: '截止压力',
    keywords: ['明天', '早八', '八点', '汇报', '截止', '考试', '周五', '周一', '上课', '上班', 'ddl'],
    statDirection: { life: 1, defense: 1, attack: 1 },
    skillPool: [
      { name: '截止日逼近', effect: '把时间压力转化为凌厉一击', power: 72, heal: 0, criticalBonus: 10, dodgeBonus: 0 },
      { name: '倒计时冲锋', effect: '趁还有时间，先发制人', power: 65, heal: 0, criticalBonus: 8, dodgeBonus: 0 },
    ],
  },
  {
    label: '恢复需求',
    keywords: ['睡', '休息', '累', '困', '状态', '健康', '精神', '恢复', '调整'],
    statDirection: { life: 1, defense: 1 },
    skillPool: [
      { name: '状态回收', effect: '把疲惫转化为恢复力，重新站稳', power: 0, heal: 35, criticalBonus: 0, dodgeBonus: 0 },
      { name: '深度修复', effect: '沉入恢复状态，为明天积蓄能量', power: 0, heal: 25, criticalBonus: 0, dodgeBonus: 10 },
    ],
  },
  {
    label: '即时行动',
    keywords: ['现在', '马上', '立刻', '已经', '正在', '顺手', '这就', '立即'],
    statDirection: { speed: 1, attack: 1 },
    skillPool: [
      { name: '零步启动', effect: '无需准备，此刻就能出手', power: 62, heal: 0, criticalBonus: 5, dodgeBonus: 5 },
      { name: '先手必胜', effect: '抢占先机，打对方一个措手不及', power: 55, heal: 0, criticalBonus: 15, dodgeBonus: 0 },
    ],
  },
  {
    label: '屏幕诱惑',
    keywords: ['十分钟', '手机', '刷', '视频', '最后一个', '一局', '这集', '游戏', '玩', '看', '剧', '番', 'b站', '抖音'],
    statDirection: { attack: 1, speed: 1, chaos: 1, life: -1 },
    skillPool: [
      { name: '就看最后一个', effect: '用"最后一个"的许诺发动连续攻击', power: 65, heal: 0, criticalBonus: 5, dodgeBonus: 10 },
      { name: '算法推荐', effect: '精准命中你的兴趣点，防不胜防', power: 60, heal: 0, criticalBonus: 12, dodgeBonus: 0 },
      { name: '时间蒸发', effect: '让对手的时间感失控，一边消耗一边恢复', power: 55, heal: 10, criticalBonus: 8, dodgeBonus: 0 },
      { name: '蓝光结界', effect: '用屏幕微光形成保护，回避正面冲突', power: 0, heal: 20, criticalBonus: 0, dodgeBonus: 15 },
    ],
  },
  {
    label: '稀缺紧迫',
    keywords: ['打折', '限时', '今天', '新店', '优惠', '错过', '抢', '秒杀', '特价', '限量'],
    statDirection: { attack: 1, speed: 1, chaos: 1 },
    skillPool: [
      { name: '限时诱惑', effect: '用"仅限今日"的紧迫感压迫对方', power: 70, heal: 0, criticalBonus: 8, dodgeBonus: 0 },
      { name: '错过等一年', effect: '把错过的恐惧变成高暴击的一击', power: 65, heal: 0, criticalBonus: 15, dodgeBonus: 0 },
    ],
  },
  {
    label: '长期积累',
    keywords: ['三天', '很久', '总是', '一直', '坚持', '计划', '存钱', '攒', '长期', '每天'],
    statDirection: { life: 1, defense: 1 },
    skillPool: [
      { name: '亏空清算', effect: '把长期拖欠的代价一次性释放', power: 75, heal: 0, criticalBonus: 5, dodgeBonus: 0 },
      { name: '长期积累', effect: '每一分坚持都转化为底气，自我补充', power: 0, heal: 30, criticalBonus: 0, dodgeBonus: 5 },
    ],
  },
  {
    label: '环境阻力',
    keywords: ['下雨', '太冷', '太热', '外面', '堵车', '天气', '冷', '热', '出门'],
    statDirection: { speed: -1, chaos: 1 },
    skillPool: [
      { name: '天气结界', effect: '坏天气成为最好的挡箭牌，规避伤害并恢复', power: 0, heal: 10, criticalBonus: 0, dodgeBonus: 20 },
      { name: '环境闪避', effect: '路况和环境成为天然掩护', power: 0, heal: 5, criticalBonus: 0, dodgeBonus: 25 },
    ],
  },
  {
    label: '明确产出',
    keywords: ['论文', '方案', '工作', '完成', '交', '做饭', '运动', '健身', '锻炼', '写', '报告', '代码'],
    statDirection: { life: 1, defense: 1 },
    skillPool: [
      { name: '进度推进器', effect: '用明确的产出目标驱动进攻', power: 65, heal: 0, criticalBonus: 6, dodgeBonus: 0 },
      { name: '成果收割', effect: '把已有的努力兑现为实际收益', power: 55, heal: 15, criticalBonus: 5, dodgeBonus: 0 },
    ],
  },
  {
    label: '犹豫摆烂',
    keywords: ['不想', '懒', '躺', '随便', '不太', '可能', '纠结', '犹豫', '算了', '再说'],
    statDirection: { defense: -1, chaos: 2 },
    skillPool: [
      { name: '摆烂烟雾', effect: '放弃思考反而变得无法预测，大幅提高闪避', power: 40, heal: 0, criticalBonus: 10, dodgeBonus: 25 },
      { name: '随缘一击', effect: '不抱希望的一击反而可能命中要害', power: 45, heal: 0, criticalBonus: 25, dodgeBonus: 0 },
    ],
  },
  {
    label: '直接偏好',
    keywords: ['喜欢', '想', '开心', '期待', '馋', '好玩', '舒服', '爽', '超爱'],
    statDirection: { attack: 1, chaos: 1 },
    skillPool: [
      { name: '欲望直球', effect: '不加掩饰的正面出击，威力极高', power: 80, heal: 0, criticalBonus: 5, dodgeBonus: 0 },
      { name: '心动一击', effect: '心动了就立刻行动，攻击同时给自己打气', power: 60, heal: 10, criticalBonus: 8, dodgeBonus: 0 },
    ],
  },
  {
    label: '成本阻力',
    keywords: ['贵', '花钱', '麻烦', '远', '来不及', '成本', '太贵', '太远', '好远'],
    statDirection: { speed: -1, defense: -1 },
    skillPool: [
      { name: '成本反噬', effect: '高昂代价削弱了行动力，但仍可一搏', power: 55, heal: 0, criticalBonus: 5, dodgeBonus: 0 },
      { name: '阻力屏障', effect: '客观困难被转化为防御', power: 0, heal: 20, criticalBonus: 0, dodgeBonus: 5 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Generic skill templates — fill when matched groups don't give enough
// ---------------------------------------------------------------------------

const GENERIC_SKILLS: SkillTemplate[] = [
  { name: '理由重击', effect: '把说服力转化为正面一击', power: 60, heal: 0, criticalBonus: 5, dodgeBonus: 0 },
  { name: '临场变卦', effect: '临时改变策略，打乱对方节奏', power: 50, heal: 0, criticalBonus: 5, dodgeBonus: 10 },
  { name: '执行冲刺', effect: '不假思索的直接行动', power: 55, heal: 0, criticalBonus: 10, dodgeBonus: 0 },
  { name: '自我说服', effect: '给自己重新打气，恢复信心', power: 0, heal: 25, criticalBonus: 0, dodgeBonus: 0 },
  { name: '直觉护盾', effect: '靠本能形成临时防御', power: 0, heal: 20, criticalBonus: 0, dodgeBonus: 5 },
  { name: '突然上头', effect: '情绪爆发带来高暴击的一击', power: 70, heal: 0, criticalBonus: 15, dodgeBonus: 0 },
  { name: '冷静分析', effect: '理性分析后找到破绽，小幅度攻守兼备', power: 45, heal: 10, criticalBonus: 10, dodgeBonus: 0 },
  { name: '惯性反击', effect: '趁对方还没反应过来的一记回击', power: 48, heal: 0, criticalBonus: 8, dodgeBonus: 8 },
];

// ---------------------------------------------------------------------------
// Naming — turning options into "agent" names
// ---------------------------------------------------------------------------

interface NameRule { keywords: string[]; name: string; }

const NAME_RULES: NameRule[] = [
  { keywords: ['早睡', '早八', '睡', '熬夜', '晚睡'], name: '早睡执行官' },
  { keywords: ['手机', '刷', '视频', '十分钟', '抖音'], name: '十分钟诱惑体' },
  { keywords: ['论文', '写作', '方案', '写', '报告', '作业', '代码'], name: '进度推进官' },
  { keywords: ['游戏', '一局', '开黑', '玩'], name: '快乐开黑兽' },
  { keywords: ['减肥', '运动', '健身', '锻炼', '跑步', '健康'], name: '自律燃烧者' },
  { keywords: ['吃', '外卖', '做饭', '新店', '美食', '饭', '味道'], name: '味觉召唤师' },
  { keywords: ['出门', '散步', '旅行', '出去', '走', '逛'], name: '出走行动派' },
  { keywords: ['躺', '在家', '不去', '宅', '沙发'], name: '沙发结界师' },
  { keywords: ['买', '下单', '购物', '消费'], name: '下单冲锋手' },
  { keywords: ['存钱', '等等', '省钱', '攒钱'], name: '钱包守门员' },
  { keywords: ['发消息', '主动', '表白', '联系', '搭话'], name: '直球通讯员' },
];

const NAME_SUFFIXES = ['行动体', '代言人', '突击手', '守擂官', '裁决者', '先锋官', '执行官', '守护者'];

// ---------------------------------------------------------------------------
// Detection — returns matched groups WITH the keyword that triggered each
// ---------------------------------------------------------------------------

interface MatchedFeature {
  group: FeatureGroup;
  keyword: string;
}

function detectFeatureMatches(text: string): MatchedFeature[] {
  const matches: MatchedFeature[] = [];
  for (const g of FEATURE_GROUPS) {
    for (const kw of g.keywords) {
      if (text.includes(kw)) {
        matches.push({ group: g, keyword: kw });
        break; // one match per group is enough
      }
    }
  }
  return matches;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isDemoInput(input: DecisionInput): boolean {
  return (
    input.question === '今晚应该早睡，还是再刷十分钟手机？' &&
    input.optionA === '今晚早睡' &&
    input.reasonA === '明天八点有课，最近也总是睡不够。' &&
    input.optionB === '再刷十分钟手机' &&
    input.reasonB === '这个视频马上看完了，而且现在还不太困。'
  );
}

function getSideText(input: DecisionInput, side: Side): string {
  return side === 'A'
    ? `${input.optionA} ${input.reasonA}`
    : `${input.optionB} ${input.reasonB}`;
}

function generateName(option: string, rng: () => number): string {
  for (const rule of NAME_RULES) {
    if (rule.keywords.some(kw => option.includes(kw))) return rule.name;
  }
  const chinese = option.replace(/[^一-鿿]/g, '');
  const latin = (option.match(/[a-z0-9]+/gi) ?? []).join('').slice(0, 6).toUpperCase();
  const prefix = chinese.slice(0, rng() > 0.5 ? 4 : 5) || latin || '未知';
  return prefix + NAME_SUFFIXES[Math.floor(rng() * NAME_SUFFIXES.length)];
}

function computeStats(text: string, baseSeed: number): CharacterStats {
  const matches = detectFeatureMatches(text);
  const rng = createRNG(baseSeed);

  const base: CharacterStats = {
    life: Math.floor(rng() * 15) + 47,
    attack: Math.floor(rng() * 15) + 47,
    defense: Math.floor(rng() * 15) + 47,
    speed: Math.floor(rng() * 15) + 47,
    chaos: Math.floor(rng() * 15) + 47,
  };

  const impactPerMatch = 7;
  for (const { group } of matches) {
    for (const [stat, dir] of Object.entries(group.statDirection)) {
      if (dir !== undefined) {
        base[stat as keyof CharacterStats] += dir * impactPerMatch;
      }
    }
  }

  const stripped = text.replace(/\s/g, '');
  if (stripped.length > 28) base.defense += 3;
  if (/\d/.test(text)) base.defense += 3;
  if (/[！!]/.test(text)) base.attack += 4;

  const clamp = (v: number) => Math.max(30, Math.min(95, v));
  return {
    life: clamp(base.life),
    attack: clamp(base.attack),
    defense: clamp(base.defense),
    speed: clamp(base.speed),
    chaos: clamp(base.chaos),
  };
}

/**
 * Build a skill description that explains HOW the skill was generated.
 * Format: "从「{keyword}」识别到{groupLabel}——{effect}"
 * For generic skills: "基于你的整体陈述——{effect}"
 */
function buildSkillDescription(
  tpl: SkillTemplate,
  match: MatchedFeature | null,
): string {
  if (match) {
    return `从「${match.keyword}」识别到${match.group.label}——${tpl.effect}`;
  }
  return `基于你的整体陈述——${tpl.effect}`;
}

function generateSkills(text: string, seed: number): [Skill, Skill, Skill, Skill] {
  const matches = detectFeatureMatches(text);
  const rng = createRNG(seed);

  // Collect skill templates with their matched keyword context
  interface SkillCandidate { tpl: SkillTemplate; match: MatchedFeature; }
  const matched: SkillCandidate[] = [];
  for (const m of matches) {
    for (const tpl of m.group.skillPool) {
      matched.push({ tpl, match: m });
    }
  }

  const shuffled = seededShuffle(matched, rng);
  const selected: SkillCandidate[] = shuffled.slice(0, 4);
  const usedNames = new Set(selected.map(s => s.tpl.name));

  // Fill remaining with generic
  if (selected.length < 4) {
    const genericPool = seededShuffle([...GENERIC_SKILLS], rng);
    for (const tpl of genericPool) {
      if (selected.length >= 4) break;
      if (!usedNames.has(tpl.name)) {
        selected.push({ tpl, match: null as unknown as MatchedFeature });
        usedNames.add(tpl.name);
      }
    }
  }

  return selected.slice(0, 4).map(({ tpl, match }) => {
    const healOnly = tpl.power === 0 && tpl.heal > 0;
    return {
      name: tpl.name,
      description: buildSkillDescription(tpl, match),
      // Pure heal skills keep power=0; attack skills get jitter
      power: healOnly ? 0 : Math.max(0, tpl.power + Math.floor(rng() * 6) - 3),
      heal: tpl.heal > 0 ? Math.max(1, tpl.heal + Math.floor(rng() * 4) - 2) : 0,
      criticalBonus: tpl.criticalBonus > 0 ? Math.max(1, tpl.criticalBonus + Math.floor(rng() * 4) - 2) : 0,
      dodgeBonus: tpl.dodgeBonus > 0 ? Math.max(1, tpl.dodgeBonus + Math.floor(rng() * 4) - 2) : 0,
      healOnly,
    };
  }) as [Skill, Skill, Skill, Skill];
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function generateDecision(input: DecisionInput): GeneratedDecision {
  const combined = `${input.question}|${input.optionA}|${input.reasonA}|${input.optionB}|${input.reasonB}`;
  const seed = generateSeed(combined);
  const baseNum = hashString(combined);

  const charA: Character = {
    side: 'A',
    name: isDemoInput(input) ? '早睡执行官' : generateName(input.optionA, createRNG(baseNum)),
    option: input.optionA,
    reason: input.reasonA,
    stats: computeStats(getSideText(input, 'A'), baseNum),
    skills: generateSkills(getSideText(input, 'A'), baseNum + 1),
  };

  const charB: Character = {
    side: 'B',
    name: isDemoInput(input) ? '十分钟诱惑体' : generateName(input.optionB, createRNG(baseNum + 2)),
    option: input.optionB,
    reason: input.reasonB,
    stats: computeStats(getSideText(input, 'B'), baseNum + 3),
    skills: generateSkills(getSideText(input, 'B'), baseNum + 4),
  };

  return { input, seed, characters: [charA, charB] };
}
