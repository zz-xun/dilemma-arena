(() => {
const ATTRIBUTE_KEYS = ["life", "attack", "defense", "speed", "chaos"];

const ATTRIBUTE_LABELS = {
  life: "生命",
  attack: "攻击",
  defense: "防御",
  speed: "速度",
  chaos: "变数",
};

const keywordRules = [
  {
    words: ["明天", "早八", "八点", "上课", "汇报", "截止", "deadline", "考试"],
    delta: { life: 10, attack: 8, defense: 13, speed: -3 },
    reason: "明确的时间压力让这个选项更站得住脚",
    skill: { name: "截止日期逼近", text: "把未来的压力提前送进本回合。", power: 1.18 },
  },
  {
    words: ["睡", "休息", "累", "困", "状态", "健康"],
    delta: { life: 18, defense: 8, chaos: -3 },
    reason: "恢复与健康会对之后的状态持续生效",
    skill: { name: "状态回收", text: "恢复少量生命，并重新找回节奏。", heal: 9 },
  },
  {
    words: ["现在", "马上", "立刻", "已经", "正在", "顺手"],
    delta: { attack: 7, speed: 17 },
    reason: "当前就能执行，几乎不需要启动成本",
    skill: { name: "零步启动", text: "趁对方还在思考，立刻发动攻击。", power: 1.12 },
  },
  {
    words: ["十分钟", "最后一个", "再看", "刷", "视频", "手机", "一局", "这集"],
    delta: { attack: 13, speed: 15, chaos: 13, life: -7 },
    reason: "即时反馈很强，而且入口已经近在手边",
    skill: { name: "就看最后一个", text: "一句熟悉的承诺，带来连续伤害。", power: 1.25 },
  },
  {
    words: ["打折", "限时", "今天", "新店", "优惠", "错过"],
    delta: { attack: 14, speed: 9, chaos: 8 },
    reason: "稀缺感放大了此刻选择它的冲动",
    skill: { name: "限时诱惑", text: "倒计时出现，理性防线短暂松动。", power: 1.2 },
  },
  {
    words: ["三天", "很久", "总是", "一直", "坚持", "计划", "存钱"],
    delta: { life: 13, defense: 10 },
    reason: "累积效应让它拥有更高的长期价值",
    skill: { name: "亏空结算", text: "把此前积累的欠账一次摆上台面。", power: 1.16 },
  },
  {
    words: ["下雨", "太冷", "太热", "外面", "堵车"],
    delta: { defense: 8, speed: -13, chaos: 12 },
    reason: "外部环境增加了执行成本，也制造了变数",
    skill: { name: "天气结界", text: "环境突然变脸，削弱对手的攻势。", dodge: 0.2 },
  },
  {
    words: ["论文", "方案", "工作", "完成", "交", "做饭", "运动"],
    delta: { life: 11, defense: 10, attack: 4 },
    reason: "明确产出会留下可持续的实际收益",
    skill: { name: "进度推进器", text: "完成感充能，对拖延造成额外伤害。", power: 1.15 },
  },
  {
    words: ["不想", "懒", "躺", "随便", "不太", "可能", "纠结"],
    delta: { defense: -7, chaos: 15 },
    reason: "犹豫削弱了论据，却也提高了意外翻盘率",
    skill: { name: "摆烂烟雾", text: "逻辑暂时下线，结果突然难以预测。", critical: 0.18 },
  },
  {
    words: ["喜欢", "想", "开心", "期待", "馋", "好玩"],
    delta: { attack: 15, chaos: 6 },
    reason: "直接表达的偏好让当前欲望非常清晰",
    skill: { name: "欲望直球", text: "不再绕弯，直接用想要发动攻击。", power: 1.18 },
  },
  {
    words: ["贵", "花钱", "麻烦", "远", "来不及", "成本"],
    delta: { defense: -4, speed: -16, chaos: 7 },
    reason: "额外成本拖慢了它的出手速度",
    skill: { name: "成本反噬", text: "负担暴露，本回合更容易被打断。", power: 0.95 },
  },
];

const nameRules = [
  { words: ["早睡", "睡觉", "休息"], name: "早睡执行官" },
  { words: ["刷", "手机", "视频", "再看"], name: "十分钟诱惑体" },
  { words: ["论文", "写作", "方案"], name: "进度推进官" },
  { words: ["游戏", "一局", "玩"], name: "快乐开黑兽" },
  { words: ["减肥", "运动", "跑步", "健身"], name: "自律燃烧者" },
  { words: ["吃", "外卖", "做饭", "新店"], name: "味觉召唤师" },
  { words: ["出门", "旅行", "散步"], name: "出走行动派" },
  { words: ["躺", "在家", "不去"], name: "沙发结界师" },
  { words: ["买", "下单"], name: "下单冲锋手" },
  { words: ["存钱", "等等"], name: "钱包守门员" },
  { words: ["发消息", "主动"], name: "直球通讯员" },
];

const fallbackSkills = [
  { name: "理由重击", text: "把输入框里的每个字都变成伤害。", power: 1.12 },
  { name: "临场变卦", text: "纠结本身积蓄能量，小概率突然暴击。", critical: 0.15 },
  { name: "执行冲刺", text: "抓住一个念头，快速发动本回合。", power: 1.08 },
  { name: "自我说服", text: "重复理由，恢复少量生命。", heal: 7 },
  { name: "直觉护盾", text: "相信第一反应，削弱一次正面攻势。", dodge: 0.12 },
  { name: "突然上头", text: "理由暂时退场，冲动获得暴击机会。", critical: 0.12 },
];

function clamp(value) {
  return Math.max(30, Math.min(95, Math.round(value)));
}

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function includesAny(text, words) {
  return words.some((word) => text.toLowerCase().includes(word.toLowerCase()));
}

function makeName(option, side) {
  const match = nameRules.find((rule) => includesAny(option, rule.words));
  if (match) return match.name;
  const clean = option.replace(/[，。！？,.!?\s]/g, "").slice(0, 5) || `选项${side}`;
  const suffixes = ["行动体", "代言人", "突击手", "守擂官"];
  return `${clean}${suffixes[hashText(option) % suffixes.length]}`;
}

function buildFighter(option, reason, side) {
  const source = `${option} ${reason}`;
  const hash = hashText(source);
  const stats = {
    life: 52 + (hash % 9),
    attack: 51 + ((hash >>> 4) % 10),
    defense: 49 + Math.min(reason.length / 5, 12),
    speed: 53 + ((hash >>> 8) % 9),
    chaos: 47 + ((hash >>> 12) % 14),
  };
  const matches = keywordRules.filter((rule) => includesAny(source, rule.words));

  matches.forEach((rule) => {
    Object.entries(rule.delta).forEach(([key, value]) => {
      stats[key] += value;
    });
  });

  if (reason.length > 28) stats.defense += 5;
  if (/[！!]{1,}/.test(reason)) stats.attack += 5;
  if (/\d/.test(reason)) stats.defense += 4;
  ATTRIBUTE_KEYS.forEach((key) => { stats[key] = clamp(stats[key]); });

  const strongestMatches = [...matches].sort((left, right) => {
    const leftPower = Object.values(left.delta).reduce((sum, value) => sum + Math.abs(value), 0);
    const rightPower = Object.values(right.delta).reduce((sum, value) => sum + Math.abs(value), 0);
    return rightPower - leftPower;
  });
  const skills = [];
  strongestMatches.forEach((match) => {
    if (!skills.some((skill) => skill.name === match.skill.name) && skills.length < 4) skills.push(match.skill);
  });
  while (skills.length < 4) {
    const skill = fallbackSkills[(hash + skills.length) % fallbackSkills.length];
    if (!skills.some((item) => item.name === skill.name)) skills.push(skill);
  }

  if (includesAny(source, ["早睡"]) && includesAny(source, ["八点", "早八", "上课"])) {
    skills.splice(
      0,
      4,
      { name: "早八警报", text: "明早的闹钟穿越时间，对拖延造成伤害。", power: 1.18 },
      { name: "睡眠恢复", text: "想起睡眠亏空，恢复少量生命。", heal: 9 },
      { name: "关灯执行", text: "切断所有借口，小概率打出重击。", critical: 0.16 },
      { name: "明日充能", text: "借用明天的清醒，强化本次攻势。", power: 1.1 },
    );
  }
  if (includesAny(source, ["刷", "手机"]) && includesAny(source, ["十分钟", "视频"])) {
    skills.splice(
      0,
      4,
      { name: "就看最后一个", text: "一句熟悉的承诺，带来连续伤害。", power: 1.25 },
      { name: "算法推荐", text: "下一个视频精准出现，让对手短暂停顿。", power: 1.12 },
      { name: "时间蒸发", text: "十分钟悄悄膨胀，制造额外伤害。", critical: 0.14 },
      { name: "蓝光护体", text: "屏幕持续发亮，抵挡一次睡意来袭。", dodge: 0.12 },
    );
  }

  const topStat = [...ATTRIBUTE_KEYS].sort((a, b) => stats[b] - stats[a])[0];
  const genericReasons = {
    life: "这项选择的持续收益决定了它能站多久",
    attack: "语句里的欲望强度决定了它有多想赢",
    defense: "理由的具体程度构成了它的防线",
    speed: "眼下的执行便利度决定了它能否先出手",
    chaos: "犹豫与不确定性给它留下了翻盘空间",
  };
  const mainReason = strongestMatches[0]?.reason || genericReasons[topStat];
  const explanations = {};
  ATTRIBUTE_KEYS.forEach((key) => {
    explanations[key] = key === topStat ? mainReason : genericReasons[key];
  });

  return {
    side,
    option,
    reason,
    name: makeName(option, side),
    stats,
    explanations,
    skills: skills.map((skill) => ({ ...skill })),
  };
}

function generateDecision(input) {
  const fighterA = buildFighter(input.optionA, input.reasonA, "A");
  const fighterB = buildFighter(input.optionB, input.reasonB, "B");
  const source = [input.question, input.optionA, input.reasonA, input.optionB, input.reasonB].join("|");
  const isDemo = includesAny(input.optionA + input.reasonA, ["早睡"]) && includesAny(input.optionB + input.reasonB, ["刷", "手机"]);

  return {
    ...input,
    seed: hashText(source),
    isDemo,
    fighters: { A: fighterA, B: fighterB },
  };
}

window.FlowGenerator = { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, generateDecision, hashText };
})();
