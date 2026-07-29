import type { GeneratedDecision, BattleResult, Side } from '../domain/types';

interface ExportData {
  decision: GeneratedDecision;
  battleResult: BattleResult;
  finalWinner: Side;
  isReversal: boolean;
  reactionTime: number;
}

export async function exportResultImage(data: ExportData): Promise<void> {
  const { decision, battleResult, finalWinner, isReversal, reactionTime } = data;
  const [a, b] = decision.characters;
  const systemChar = battleResult.winner === 'A' ? a : b;
  const winChar = finalWinner === 'A' ? a : b;
  const W = 1080, H = 1440;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1a1c24'); bg.addColorStop(1, '#222530');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.02)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Header
  ctx.fillStyle = '#545360'; ctx.font = '22px monospace'; ctx.textAlign = 'center';
  ctx.fillText('DILEMMA ARENA', W / 2, 90);
  ctx.fillStyle = '#e6e4df'; ctx.font = 'bold 60px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('纠结擂台', W / 2, 170);
  ctx.fillStyle = '#8a8890'; ctx.font = '30px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('今日纠结', W / 2, 240);
  ctx.fillStyle = '#e6e4df'; ctx.font = '34px "PingFang SC","Microsoft YaHei",sans-serif';
  wrap(ctx, `"${decision.input.question}"`, W / 2, 300, 900, 44);

  // A/B cards
  const cardY = 420;
  drawCard(ctx, 60, cardY, 440, 280, a, 'A', '#e8816b');
  drawCard(ctx, 580, cardY, 440, 280, b, 'B', '#4cb8c4');
  ctx.fillStyle = '#e6c954'; ctx.font = 'bold 44px monospace'; ctx.textAlign = 'center';
  ctx.fillText('VS', W / 2, cardY + 150);

  // Result
  const rY = 770;
  ctx.fillStyle = '#8a8890'; ctx.font = '26px "PingFang SC","Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(isReversal ? '本人改判' : '系统判决', W / 2, rY);
  const wc = finalWinner === 'A' ? '#e8816b' : '#4cb8c4';
  ctx.fillStyle = wc; ctx.font = 'bold 48px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(`胜者：${winChar.name}`, W / 2, rY + 60);
  ctx.fillStyle = '#e6e4df'; ctx.font = '30px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(`「${winChar.option}」`, W / 2, rY + 110);

  if (isReversal) {
    ctx.fillStyle = '#e0556a'; ctx.font = 'bold 34px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText('改判成功', W / 2, rY + 190);
    ctx.fillStyle = '#e6e4df'; ctx.font = '26px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(`反悔用时：${reactionTime.toFixed(1)} 秒`, W / 2, rY + 240);
    const speed = reactionTime < 1 ? '你甚至没有犹豫。' : reactionTime < 3 ? '短暂思考后，你还是站到了它这一边。' : '绕了一圈，你还是把它救了回来。';
    ctx.fillStyle = '#8a8890'; ctx.font = '24px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(speed, W / 2, rY + 290);
    ctx.fillStyle = '#e6c954'; ctx.font = '22px "PingFang SC","Microsoft YaHei",sans-serif';
    wrap(ctx, '其实你心里早就有答案。你缺的不是答案，只是一次确认。', W / 2, rY + 340, 880, 32);
    ctx.fillStyle = '#545360'; ctx.font = '20px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(`系统原判：${systemChar.option}`, W / 2, rY + 390);
  } else {
    const isDemo = decision.input.question === '今晚应该早睡，还是再刷十分钟手机？' && decision.input.optionB === '再刷十分钟手机' && finalWinner === 'B';
    ctx.fillStyle = '#e6e4df'; ctx.font = '26px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(isDemo ? '允许再刷十分钟。变量工坊不负责解释为什么天已经亮了。' : '你接受了这个答案。至少这一刻，它和你的直觉站在同一边。', W / 2, rY + 190);
  }

  // Battle rounds
  const bY = isReversal ? rY + 420 : rY + 290;
  ctx.fillStyle = '#8a8890'; ctx.font = '22px "PingFang SC","Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('战斗回顾', W / 2, bY);
  ctx.textAlign = 'left'; ctx.fillStyle = '#545360'; ctx.font = '18px "PingFang SC","Microsoft YaHei",sans-serif';
  battleResult.rounds.forEach((r, i) => {
    const y = bY + 40 + i * 54;
    drawEllipsizedText(ctx, `R${r.round}  ${r.description}`, 80, y, 920);
  });

  // Disclaimer
  ctx.fillStyle = '#3a3850'; ctx.font = '18px "PingFang SC","Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('⚠ 本工具仅供日常低风险选择的娱乐参考', W / 2, H - 55);
  ctx.fillText('不适用于医疗、投资、法律等重大决策', W / 2, H - 25);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('Export failed')); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `纠结擂台_${Date.now()}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, mw: number, lh: number) {
  const chars = [...text]; let line = '', cy = y;
  for (const ch of chars) {
    if (ctx.measureText(line + ch).width > mw && line) { ctx.fillText(line, x, cy); line = ch; cy += lh; }
    else line += ch;
  }
  if (line) ctx.fillText(line, x, cy);
}

function drawEllipsizedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  let value = text;
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1);
  ctx.fillText(`${value}…`, x, y);
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: { name: string; option: string; stats: { life: number; attack: number; defense: number; speed: number; chaos: number } }, side: 'A' | 'B', color: string) {
  ctx.fillStyle = side === 'A' ? 'rgba(232,129,107,0.06)' : 'rgba(76,184,196,0.06)';
  roundedRectPath(ctx, x, y, w, h, 14); ctx.fill();
  ctx.strokeStyle = side === 'A' ? 'rgba(232,129,107,0.15)' : 'rgba(76,184,196,0.15)';
  ctx.lineWidth = 2; roundedRectPath(ctx, x, y, w, h, 14); ctx.stroke();

  ctx.fillStyle = color; ctx.font = 'bold 32px "PingFang SC","Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(c.name, x + w / 2, y + 42);
  ctx.fillStyle = '#e6e4df'; ctx.font = '26px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(c.option, x + w / 2, y + 80);
  ctx.fillStyle = '#8a8890'; ctx.font = '20px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(`生命${c.stats.life} 攻击${c.stats.attack} 防御${c.stats.defense} 速度${c.stats.speed} 变数${c.stats.chaos}`, x + w / 2, y + 115);
}
