const { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, generateDecision } = window.FlowGenerator;
const { simulateBattle } = window.FlowBattle;

const views = [...document.querySelectorAll(".view")];
const elements = {
  form: document.querySelector("#decisionForm"),
  roster: document.querySelector("#roster"),
  scanProgress: document.querySelector("#scanProgress"),
  scanLetter: document.querySelector("#scanLetter"),
  scanOrb: document.querySelector(".scan-orb"),
  scanTitle: document.querySelector("#scanTitle"),
  scanText: document.querySelector("#scanText"),
  battleQuestion: document.querySelector("#battleQuestion"),
  roundNumber: document.querySelector("#roundNumber"),
  battleNameA: document.querySelector("#battleNameA"),
  battleNameB: document.querySelector("#battleNameB"),
  hpTextA: document.querySelector("#hpTextA"),
  hpTextB: document.querySelector("#hpTextB"),
  hpBarA: document.querySelector("#hpBarA"),
  hpBarB: document.querySelector("#hpBarB"),
  fighterA: document.querySelector("#battleFighterA"),
  fighterB: document.querySelector("#battleFighterB"),
  damage: document.querySelector("#damageNumber"),
  flash: document.querySelector("#impactFlash"),
  skill: document.querySelector("#skillCallout"),
  skillOwner: document.querySelector("#skillOwner"),
  skillName: document.querySelector("#skillName"),
  commentary: document.querySelector("#battleCommentary"),
  battleLog: document.querySelector("#battleLog"),
  toast: document.querySelector("#toast"),
};

let decision = null;
let battle = null;
let battleTimers = [];
let reactionStartedAt = 0;
let reactionTimerId = null;
let toastId = null;

function showView(name) {
  views.forEach((view) => view.classList.toggle("is-active", view.dataset.view === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getFormData() {
  const formData = new FormData(elements.form);
  return Object.fromEntries([...formData.entries()].map(([key, value]) => [key, String(value).trim()]));
}

function startScan(input) {
  decision = generateDecision(input);
  showView("scan");
  elements.scanProgress.style.width = "8%";
  elements.scanLetter.textContent = "A";
  elements.scanOrb.classList.remove("is-b");
  elements.scanTitle.textContent = "正在读取你的言外之意";
  elements.scanText.textContent = "提取时间压力、执行成本与隐藏欲望…";

  setTimeout(() => { elements.scanProgress.style.width = "42%"; }, 80);
  setTimeout(() => {
    elements.scanLetter.textContent = "B";
    elements.scanOrb.classList.add("is-b");
    elements.scanTitle.textContent = "正在把理由变成战斗力";
    elements.scanText.textContent = "分配五项属性，拼装专属技能…";
    elements.scanProgress.style.width = "76%";
  }, 1100);
  setTimeout(() => {
    elements.scanTitle.textContent = "角色构建完成";
    elements.scanText.textContent = `本局随机种子：${decision.seed.toString(16).toUpperCase().padStart(8, "0")}`;
    elements.scanProgress.style.width = "100%";
  }, 2100);
  setTimeout(() => {
    renderRoster();
    showView("roster");
  }, 2750);
}

function renderRoster() {
  elements.roster.replaceChildren();
  ["A", "B"].forEach((side) => {
    const fighter = decision.fighters[side];
    const article = document.createElement("article");
    article.className = `fighter-card card-${side.toLowerCase()}`;
    const stats = ATTRIBUTE_KEYS.map((key) => `
      <div class="stat">
        <label>${ATTRIBUTE_LABELS[key]}</label>
        <span class="stat-track"><i style="--value:${fighter.stats[key]}%"></i></span>
        <b>${fighter.stats[key]}</b>
      </div>`).join("");
    const skills = fighter.skills.map((skill, index) => `
      <div class="skill"><small>技能${["一", "二", "三", "四"][index]}</small><div><b>${escapeHtml(skill.name)}</b><p>${escapeHtml(skill.text)}</p></div></div>`).join("");
    const mascotParts = side === "A"
      ? `<i class="mascot-ear left"></i><i class="mascot-ear right"></i>`
      : `<i class="mascot-antenna"><em></em></i>`;
    article.innerHTML = `
      <div class="fighter-top">
        <div class="mascot mascot-${side.toLowerCase()} mini-avatar">
          ${mascotParts}
          <span class="mascot-face"><i class="eye left"></i><i class="eye right"></i><i class="mouth"></i></span>
          <b>${side}</b><i class="mascot-arm"></i>
        </div>
        <div class="fighter-identity"><small>${side} 方选手</small><h3>${escapeHtml(fighter.name)}</h3><p>${escapeHtml(fighter.option)}</p></div>
      </div>
      <div class="stats">${stats}</div>
      <div class="skills">${skills}</div>`;
    elements.roster.append(article);
  });
}

function startBattle() {
  battle = simulateBattle(decision);
  showView("battle");
  resetBattleUI();
  battle.events.forEach((event, index) => {
    const timer = setTimeout(() => playEvent(event), 700 + index * 1650);
    battleTimers.push(timer);
  });
  // Keep the complete six-round report visible before revealing the verdict.
  battleTimers.push(setTimeout(showVerdict, 700 + battle.events.length * 1650 + 2100));
}

function resetBattleUI() {
  clearBattleTimers();
  elements.battleQuestion.textContent = decision.question;
  elements.battleNameA.textContent = decision.fighters.A.name;
  elements.battleNameB.textContent = decision.fighters.B.name;
  elements.hpTextA.textContent = battle.maxHp.A;
  elements.hpTextB.textContent = battle.maxHp.B;
  elements.hpBarA.style.width = "100%";
  elements.hpBarB.style.width = "100%";
  elements.roundNumber.textContent = `1 / ${battle.events.length}`;
  elements.battleLog.replaceChildren();
  elements.commentary.textContent = "双方正在互相打量，空气里都是没做完的决定。";
}

function playEvent(event, instant = false) {
  const attackerEl = event.attacker === "A" ? elements.fighterA : elements.fighterB;
  const defenderEl = event.defender === "A" ? elements.fighterA : elements.fighterB;
  elements.roundNumber.textContent = `${event.round} / ${battle.events.length}`;
  elements.skillOwner.textContent = `${event.attacker} 发动技能`;
  elements.skillName.textContent = event.skill.name;
  elements.commentary.textContent = event.text;
  addLog(event);

  if (instant) {
    updateHealth(event.after);
    return;
  }

  restartClass(elements.skill, "is-active");
  restartClass(attackerEl, "is-attacking");
  const impactTimer = setTimeout(() => {
    restartClass(defenderEl, "is-hit");
    restartClass(elements.flash, "is-active");
    elements.damage.textContent = event.dodged ? "闪避" : `-${event.damage}${event.critical ? "!" : ""}`;
    elements.damage.className = `damage-number is-on-${event.defender.toLowerCase()}`;
    restartClass(elements.damage, "is-active");
    updateHealth(event.after);
  }, 430);
  battleTimers.push(impactTimer);
}

function restartClass(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function updateHealth(hp) {
  elements.hpTextA.textContent = hp.A;
  elements.hpTextB.textContent = hp.B;
  elements.hpBarA.style.width = `${(hp.A / battle.maxHp.A) * 100}%`;
  elements.hpBarB.style.width = `${(hp.B / battle.maxHp.B) * 100}%`;
}

function addLog(event) {
  if (elements.battleLog.querySelector(`[data-round="${event.round}"]`)) return;
  const item = document.createElement("li");
  item.className = "is-complete";
  item.dataset.round = event.round;
  item.innerHTML = renderBattleLogContent(event);
  elements.battleLog.append(item);
}

function renderBattleLogContent(event) {
  const resultText = event.dodged
    ? `${event.defender} 方闪避，受到 ${event.damage} 点擦伤`
    : `${event.defender} 方受到 ${event.damage} 点伤害${event.critical ? " · 暴击" : ""}`;
  const healText = event.heal ? ` · ${event.attacker} 方恢复 ${event.heal} 点` : "";
  return `<b>${event.round}</b><span><em>${event.attacker} 方 · ${escapeHtml(event.skill.name)}</em><small>${resultText}${healText}</small></span>`;
}

function skipBattle() {
  if (!battle) return;
  clearBattleTimers();
  battle.events.forEach((event) => playEvent(event, true));
  setTimeout(showVerdict, 900);
}

function clearBattleTimers() {
  battleTimers.forEach(clearTimeout);
  battleTimers = [];
}

function showVerdict() {
  clearBattleTimers();
  const winner = decision.fighters[battle.winner];
  document.querySelector("#winnerLetter").textContent = battle.winner;
  document.querySelector("#winnerName").textContent = winner.name;
  document.querySelector("#winnerOption").textContent = `“${winner.option}”`;
  document.querySelector("#winnerEmblem").classList.toggle("is-a", battle.winner === "A");
  document.querySelector("#winnerHp").textContent = battle.hp[battle.winner];
  document.querySelector("#winnerRounds").textContent = battle.events.length;
  document.querySelector("#winningSkill").textContent = battle.events[battle.events.length - 1].skill.name;
  showView("verdict");
  reactionStartedAt = performance.now();
  clearInterval(reactionTimerId);
  reactionTimerId = setInterval(() => {
    document.querySelector("#reactionTimer").textContent = `${((performance.now() - reactionStartedAt) / 1000).toFixed(1)}s`;
  }, 100);
}

function settle(rejected) {
  const elapsed = Math.max(0.1, (performance.now() - reactionStartedAt) / 1000);
  clearInterval(reactionTimerId);
  const systemSide = battle.winner;
  const finalSide = rejected ? (systemSide === "A" ? "B" : "A") : systemSide;
  renderResult({ rejected, elapsed, systemSide, finalSide });
  showView("result");
}

function renderResult(result) {
  const systemWinner = decision.fighters[result.systemSide];
  const finalWinner = decision.fighters[result.finalSide];
  document.querySelector("#resultNameA").textContent = decision.fighters.A.option;
  document.querySelector("#resultNameB").textContent = decision.fighters.B.option;
  document.querySelector("#reportQuestion").textContent = `${shorten(decision.optionA)} vs ${shorten(decision.optionB)}`;
  document.querySelector("#reportOptionA").textContent = decision.optionA;
  document.querySelector("#reportOptionB").textContent = decision.optionB;
  document.querySelector("#systemWinner").textContent = systemWinner.option;
  document.querySelector("#finalWinner").textContent = finalWinner.option;
  document.querySelector("#reactionTime").textContent = `${result.elapsed.toFixed(1)} 秒`;
  document.querySelector("#overrideRow").hidden = !result.rejected;
  document.querySelector("#reactionRow").hidden = !result.rejected;

  if (result.rejected) {
    document.querySelector("#resultHeading").textContent = `改判成功：${finalWinner.name}获胜`;
    document.querySelector("#resultLead").textContent = "你亲自把输掉的选项救了回来。";
    const reaction = result.elapsed < 1
      ? "你甚至没有犹豫。"
      : result.elapsed <= 3
        ? "短暂思考后，你还是站到了它这一边。"
        : "绕了一圈，你还是把它救了回来。";
    document.querySelector("#resultConclusion").innerHTML = `其实你心里早就有答案。<br><span>${escapeHtml(reaction)}你缺的不是答案，只是一次确认。</span>`;
  } else {
    document.querySelector("#resultHeading").textContent = "裁定生效，擂台下班";
    document.querySelector("#resultLead").textContent = decision.isDemo
      ? "允许再刷十分钟。变量工坊不负责解释为什么天已经亮了。"
      : `好，今天就选“${finalWinner.option}”。`;
    document.querySelector("#resultConclusion").textContent = "你接受了这个答案。至少这一刻，它和你的直觉站在同一边。";
  }

  window.currentResult = result;
}

function saveCard() {
  if (!decision || !window.currentResult) return;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext("2d");
  const result = window.currentResult;
  const finalFighter = decision.fighters[result.finalSide];
  const systemFighter = decision.fighters[result.systemSide];

  context.fillStyle = "#e9e8df";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(30,32,34,.12)";
  context.lineWidth = 1;
  for (let x = 0; x <= 1080; x += 48) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 1440); context.stroke(); }
  for (let y = 0; y <= 1440; y += 48) { context.beginPath(); context.moveTo(0, y); context.lineTo(1080, y); context.stroke(); }
  drawText(context, "今日纠结", 72, 118, "700 22px 'Noto Sans SC'", "#777872");
  wrapText(context, `${shorten(decision.optionA)} vs ${shorten(decision.optionB)}`, 72, 178, 900, 58, "900 51px 'Noto Sans SC'", "#15171a", 1.3);
  context.fillStyle = "#ff765f";
  context.fillRect(72, 294, 420, 190);
  context.fillStyle = "#52cfe1";
  context.fillRect(588, 294, 420, 190);
  drawText(context, "A", 104, 360, "900 55px Arial", "#17191c");
  wrapText(context, decision.optionA, 104, 409, 350, 32, "800 27px 'Noto Sans SC'", "#17191c", 1.35);
  drawText(context, "B", 620, 360, "900 55px Arial", "#17191c");
  wrapText(context, decision.optionB, 620, 409, 350, 32, "800 27px 'Noto Sans SC'", "#17191c", 1.35);
  drawText(context, "VS", 540, 406, "900 italic 34px Arial", "#484a47", "center");
  drawReportRow(context, 550, "系统胜者", systemFighter.option);
  if (result.rejected) {
    drawReportRow(context, 620, "本人改判", finalFighter.option);
    drawReportRow(context, 690, "反悔用时", `${result.elapsed.toFixed(1)} 秒`);
  }
  context.fillStyle = "#181a1e";
  context.fillRect(72, result.rejected ? 780 : 660, 936, 420);
  const boxY = result.rejected ? 780 : 660;
  drawText(context, "本次偏好分析", 112, boxY + 58, "700 21px 'Noto Sans SC'", "#e5f454");
  const conclusion = result.rejected
    ? "其实你心里早就有答案。你缺的不是答案，只是一次确认。"
    : "你接受了这个答案。至少这一刻，它和你的直觉站在同一边。";
  wrapText(context, conclusion, 112, boxY + 126, 840, 50, "900 39px 'Noto Sans SC'", "#f5f1e9", 1.5);
  drawText(context, "仅供娱乐，重大决定请认真考虑", 72, 1374, "500 19px 'Noto Sans SC'", "#696b67");

  const link = document.createElement("a");
  link.download = `纠结擂台-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  showToast("战报图片已生成");
}

function drawText(context, text, x, y, font, color, align = "left") {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = "alphabetic";
  context.fillText(text, x, y);
}

function wrapText(context, text, x, y, maxWidth, fontSize, font, color, lineHeight) {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = "left";
  let line = "";
  let lineIndex = 0;
  [...text].forEach((character, index) => {
    const test = line + character;
    if (context.measureText(test).width > maxWidth && line) {
      context.fillText(line, x, y + lineIndex * fontSize * lineHeight);
      line = character;
      lineIndex += 1;
    } else line = test;
    if (index === text.length - 1) context.fillText(line, x, y + lineIndex * fontSize * lineHeight);
  });
}

function drawReportRow(context, y, label, value) {
  context.fillStyle = "rgba(21,23,26,.22)";
  context.fillRect(72, y + 38, 936, 2);
  drawText(context, label, 72, y, "600 22px 'Noto Sans SC'", "#666862");
  drawText(context, value, 1008, y, "800 28px 'Noto Sans SC'", "#17191c", "right");
}

function playAgain() {
  clearBattleTimers();
  clearInterval(reactionTimerId);
  decision = null;
  battle = null;
  showView("input");
}

function shorten(text) {
  return text.length > 8 ? `${text.slice(0, 8)}…` : text;
}

function escapeHtml(value) {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
}

function showToast(message) {
  clearTimeout(toastId);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastId = setTimeout(() => elements.toast.classList.remove("is-visible"), 1800);
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!elements.form.reportValidity()) return;
  startScan(getFormData());
});
document.querySelector("#startBattleButton").addEventListener("click", startBattle);
document.querySelector("#skipBattleButton").addEventListener("click", skipBattle);
document.querySelector("#acceptButton").addEventListener("click", () => settle(false));
document.querySelector("#rejectButton").addEventListener("click", () => settle(true));
document.querySelector("#saveCardButton").addEventListener("click", saveCard);
document.querySelector("#playAgainButton").addEventListener("click", playAgain);
