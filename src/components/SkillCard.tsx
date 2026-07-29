import type { Skill } from '../domain/types';
import styles from './SkillCard.module.css';

interface Props {
  skill: Skill;
  accent: string;
}

export function SkillCard({ skill, accent }: Props) {
  const tags: string[] = [];
  if (skill.power > 0) tags.push(`威力${skill.power}`);
  if (skill.heal > 0) tags.push(`恢复${skill.heal}`);
  if (skill.criticalBonus > 0) tags.push(`暴击+${skill.criticalBonus}`);
  if (skill.dodgeBonus > 0) tags.push(`闪避+${skill.dodgeBonus}`);

  return (
    <div className={styles.card} style={{ borderLeftColor: accent }}>
      <div className={styles.name} style={{ color: accent }}>{skill.name}</div>
      <div className={styles.desc}>{skill.description}</div>
      {tags.length > 0 && <div className={styles.tags}>{tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}</div>}
    </div>
  );
}
