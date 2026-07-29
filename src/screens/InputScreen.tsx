import { useState, useCallback } from 'react';
import type { DecisionInput } from '../domain/types';
import styles from './InputScreen.module.css';

const DEMO: DecisionInput = {
  question: '今晚应该早睡，还是再刷十分钟手机？',
  optionA: '今晚早睡',
  reasonA: '明天八点有课，最近也总是睡不够。',
  optionB: '再刷十分钟手机',
  reasonB: '这个视频马上看完了，而且现在还不太困。',
};

const LIMITS: Record<keyof DecisionInput, number> = {
  question: 60, optionA: 30, reasonA: 100, optionB: 30, reasonB: 100,
};

interface Props { onSubmit: (input: DecisionInput) => void; }

export function InputScreen({ onSubmit }: Props) {
  const [input, setInput] = useState<DecisionInput>({ ...DEMO });
  const [errors, setErrors] = useState<Partial<Record<keyof DecisionInput, string>>>({});

  const change = useCallback((f: keyof DecisionInput, v: string) => {
    setInput(p => ({ ...p, [f]: v }));
    setErrors(p => { const n = { ...p }; delete n[f]; return n; });
  }, []);

  const validate = useCallback((): boolean => {
    const es: Partial<Record<keyof DecisionInput, string>> = {};
    const names: Record<keyof DecisionInput, string> = { question: '纠结的问题', optionA: '选项 A', reasonA: 'A 的理由', optionB: '选项 B', reasonB: 'B 的理由' };
    for (const f of Object.keys(names) as (keyof DecisionInput)[]) {
      const v = input[f].trim();
      if (!v) es[f] = `请填写${names[f]}`;
      else if (v.length > LIMITS[f]) es[f] = `不超过${LIMITS[f]}字`;
    }
    if (!es.optionA && !es.optionB && input.optionA.trim() === input.optionB.trim()) {
      es.optionB = '两个选项需要有所不同';
    }
    setErrors(es);
    return Object.keys(es).length === 0;
  }, [input]);

  const submit = useCallback(() => {
    if (validate()) {
      onSubmit({
        question: input.question.trim(),
        optionA: input.optionA.trim(),
        reasonA: input.reasonA.trim(),
        optionB: input.optionB.trim(),
        reasonB: input.reasonB.trim(),
      });
    }
  }, [input, validate, onSubmit]);

  return (
    <div className={styles.screen}>
      <header className={styles.head}>
        <span className={styles.eng}>DILEMMA ARENA</span>
        <h1 className={styles.title}>纠结擂台</h1>
        <p className={styles.sub}>把两个选项变成选手，让它们替你打一架。</p>
      </header>

      <div className={styles.form}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>你在纠结什么</span>
          <textarea className={styles.textarea} rows={2} maxLength={LIMITS.question} value={input.question} onChange={e => change('question', e.target.value)} placeholder="描述你的两难困境" />
          {errors.question && <span className={styles.err}>{errors.question}</span>}
        </label>

        <div className={styles.sides}>
          <div className={`${styles.side} ${styles.sideA}`}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>选项 A</span>
              <input className={styles.input} maxLength={LIMITS.optionA} value={input.optionA} onChange={e => change('optionA', e.target.value)} placeholder="选项 A" />
              {errors.optionA && <span className={styles.err}>{errors.optionA}</span>}
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>选 A 的理由</span>
              <textarea className={styles.textarea} rows={2} maxLength={LIMITS.reasonA} value={input.reasonA} onChange={e => change('reasonA', e.target.value)} placeholder="为什么站 A" />
              {errors.reasonA && <span className={styles.err}>{errors.reasonA}</span>}
            </label>
          </div>
          <div className={styles.vsCol}><span className={styles.vs}>VS</span></div>
          <div className={`${styles.side} ${styles.sideB}`}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>选项 B</span>
              <input className={styles.input} maxLength={LIMITS.optionB} value={input.optionB} onChange={e => change('optionB', e.target.value)} placeholder="选项 B" />
              {errors.optionB && <span className={styles.err}>{errors.optionB}</span>}
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>选 B 的理由</span>
              <textarea className={styles.textarea} rows={2} maxLength={LIMITS.reasonB} value={input.reasonB} onChange={e => change('reasonB', e.target.value)} placeholder="为什么站 B" />
              {errors.reasonB && <span className={styles.err}>{errors.reasonB}</span>}
            </label>
          </div>
        </div>
      </div>

      <button className={styles.btn} onClick={submit}>生成选手，马上开打</button>
      <p className={styles.note}>⚠ 本工具仅供日常低风险选择的娱乐参考，不适用于医疗、投资、法律等重大决策。</p>
    </div>
  );
}
