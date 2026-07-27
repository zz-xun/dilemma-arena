(() => {
function createRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedScore(fighter) {
  const { life, attack, defense, speed, chaos } = fighter.stats;
  return life * 0.2 + attack * 0.29 + defense * 0.2 + speed * 0.19 + chaos * 0.12;
}

function simulateDemo(decision) {
  const a = decision.fighters.A;
  const b = decision.fighters.B;
  const maxHp = { A: 116, B: 108 };
  const hp = { ...maxHp };
  const plan = [
    { attacker: "A", skill: a.skills.find((item) => item.name.includes("早八")) || a.skills[0], damage: 20, text: `${a.name}把明早八点的闹钟提前砸进擂台！` },
    { attacker: "B", skill: b.skills.find((item) => item.name.includes("最后")) || b.skills[0], damage: 12, text: `${b.name}熟练地承诺：真的只看最后一个。` },
    { attacker: "B", skill: b.skills.find((item) => item.name.includes("算法")) || b.skills[1], damage: 12, text: "下一个视频精准出现，早睡的动作被短暂打断。" },
    { attacker: "A", skill: a.skills.find((item) => item.heal) || a.skills[1], damage: 22, heal: 8, text: `${a.name}想起最近的睡眠亏空，恢复 8 点生命。` },
    { attacker: "B", skill: b.skills[0], damage: 18, critical: true, text: `${b.name}发动连续推荐，打出意料之外的暴击！` },
    { attacker: "B", skill: { name: "时间蒸发" }, damage: 19, text: "说好的十分钟悄悄膨胀，完成最后反超。" },
  ];
  return finishPlan(plan, hp, maxHp, "B");
}

function finishPlan(plan, hp, maxHp, forcedWinner) {
  const events = plan.map((event, index) => {
    const defender = event.attacker === "A" ? "B" : "A";
    const before = { ...hp };
    hp[defender] = Math.max(1, hp[defender] - event.damage);
    if (event.heal) hp[event.attacker] = Math.min(maxHp[event.attacker], hp[event.attacker] + event.heal);
    return { round: index + 1, defender, before, after: { ...hp }, ...event };
  });

  let winner = forcedWinner || (hp.A / maxHp.A >= hp.B / maxHp.B ? "A" : "B");
  if (forcedWinner) {
    const loser = winner === "A" ? "B" : "A";
    const winnerRatio = hp[winner] / maxHp[winner];
    if (winnerRatio <= hp[loser] / maxHp[loser]) {
      hp[loser] = Math.max(1, Math.floor(maxHp[loser] * (winnerRatio - 0.04)));
      events[events.length - 1].after = { ...hp };
    }
  }
  return { events, hp, maxHp, winner };
}

function simulateBattle(decision) {
  if (decision.isDemo) return simulateDemo(decision);

  const random = createRandom(decision.seed);
  const fighters = decision.fighters;
  const maxHp = {
    A: Math.round(84 + fighters.A.stats.life * 0.48),
    B: Math.round(84 + fighters.B.stats.life * 0.48),
  };
  const hp = { ...maxHp };
  const scores = { A: weightedScore(fighters.A), B: weightedScore(fighters.B) };
  const plan = [];
  const attackCounts = { A: 0, B: 0 };

  for (let round = 0; round < 6; round += 1) {
    let attacker;
    if (round === 0) attacker = fighters.A.stats.speed + random() * 22 >= fighters.B.stats.speed + random() * 22 ? "A" : "B";
    else if (round === 1) attacker = plan[0].attacker === "A" ? "B" : "A";
    else {
      const chanceA = scores.A / (scores.A + scores.B);
      attacker = random() < chanceA ? "A" : "B";
      if (round >= 4 && attackCounts.A < 2) attacker = "A";
      if (round >= 4 && attackCounts.B < 2) attacker = "B";
    }
    attackCounts[attacker] += 1;
    const defender = attacker === "A" ? "B" : "A";
    const acting = fighters[attacker];
    const target = fighters[defender];
    const skill = acting.skills[round % acting.skills.length];
    const variation = 0.82 + random() * 0.36;
    const base = 10 + acting.stats.attack * 0.12 - target.stats.defense * 0.045;
    const criticalChance = 0.05 + acting.stats.chaos * 0.0018 + (skill.critical || 0);
    const critical = random() < criticalChance;
    const dodgeChance = 0.025 + target.stats.chaos * 0.0007 + (target.skills[0].dodge || 0) * 0.12;
    const dodged = random() < dodgeChance;
    const damage = dodged ? 2 : Math.max(7, Math.round(base * variation * (skill.power || 1) * (critical ? 1.45 : 1)));
    const heal = skill.heal && random() > 0.4 ? skill.heal : 0;
    const text = dodged
      ? `${target.name}靠临场变数躲开大半攻势，只受到擦伤。`
      : critical
        ? `${acting.name}发动“${skill.name}”，意外打出暴击！`
        : `${acting.name}用“${skill.name}”正面推进自己的理由。`;
    plan.push({ attacker, skill, damage, heal, critical, dodged, text });
  }

  const projected = { ...hp };
  plan.forEach((event) => {
    const defender = event.attacker === "A" ? "B" : "A";
    projected[defender] = Math.max(1, projected[defender] - event.damage);
    if (event.heal) projected[event.attacker] = Math.min(maxHp[event.attacker], projected[event.attacker] + event.heal);
  });
  const ratioA = projected.A / maxHp.A;
  const ratioB = projected.B / maxHp.B;
  let winner = ratioA === ratioB ? (random() < 0.5 ? "A" : "B") : ratioA > ratioB ? "A" : "B";

  const probabilityA = scores.A / (scores.A + scores.B);
  if (Math.abs(ratioA - ratioB) < 0.08) winner = random() < probabilityA ? "A" : "B";
  return finishPlan(plan, hp, maxHp, winner);
}

window.FlowBattle = { simulateBattle };
})();
