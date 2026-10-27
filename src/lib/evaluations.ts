import { getDb } from './db';
import { Evaluation, CreateEvaluationInput } from '@/types';
import { randomUUID } from 'crypto';

export async function createEvaluation(input: CreateEvaluationInput): Promise<Evaluation> {
  const db = await getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  await db.run(
    `
    INSERT INTO evaluations (
      id, transaction_id, type, chronology, mistakes, correct_actions, lessons, action_items,
      followed_plan, entry_matches_setup, proper_risk_management, emotional_decision, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    id,
    input.transactionId,
    input.type,
    input.chronology ?? null,
    input.mistakes ?? null,
    input.correctActions ?? null,
    input.lessons ?? null,
    input.actionItems ?? null,
    input.followedPlan !== undefined ? (input.followedPlan ? 1 : 0) : null,
    input.entryMatchesSetup !== undefined ? (input.entryMatchesSetup ? 1 : 0) : null,
    input.properRiskManagement !== undefined ? (input.properRiskManagement ? 1 : 0) : null,
    input.emotionalDecision !== undefined ? (input.emotionalDecision ? 1 : 0) : null,
    now,
    now
  );

  if (input.lossReasonIds && input.lossReasonIds.length > 0) {
    for (const reasonId of input.lossReasonIds) {
      await db.run('INSERT INTO transaction_loss_reasons (transaction_id, loss_reason_id) VALUES (?, ?)', input.transactionId, reasonId);
    }
  }

  return (await getEvaluationByTransactionId(input.transactionId))!;
}

export async function getEvaluationByTransactionId(transactionId: string): Promise<Evaluation | null> {
  const db = await getDb();
  const row = await db.get('SELECT * FROM evaluations WHERE transaction_id = ?', transactionId);
  if (!row) return null;

  const lossReasons = await db.all(
    `
    SELECT lr.* FROM loss_reasons lr
    JOIN transaction_loss_reasons tlr ON tlr.loss_reason_id = lr.id
    WHERE tlr.transaction_id = ?
    `,
    transactionId
  );

  return {
    ...(mapRowToEvaluation(row) as Evaluation),
    lossReasons: lossReasons as any,
  };
}

export async function updateEvaluation(transactionId: string, updates: Partial<CreateEvaluationInput>): Promise<Evaluation> {
  const current = await getEvaluationByTransactionId(transactionId);
  if (!current) throw new Error('Evaluation not found');

  const db = await getDb();
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: any[] = [];

  const textFields = ['chronology', 'mistakes', 'correctActions', 'lessons', 'actionItems'];
  const boolFields = ['followedPlan', 'entryMatchesSetup', 'properRiskManagement', 'emotionalDecision'];

  textFields.forEach(key => {
    const value = updates[key as keyof CreateEvaluationInput];
    if (value !== undefined) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbKey} = ?`);
      values.push(value);
    }
  });

  boolFields.forEach(key => {
    const value = updates[key as keyof CreateEvaluationInput];
    if (value !== undefined) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbKey} = ?`);
      values.push(value ? 1 : 0);
    }
  });

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(now);
    values.push(transactionId);

    await db.run(`UPDATE evaluations SET ${fields.join(', ')} WHERE transaction_id = ?`, ...values);
  }

  if (updates.lossReasonIds !== undefined) {
    await db.run('DELETE FROM transaction_loss_reasons WHERE transaction_id = ?', transactionId);

    if (updates.lossReasonIds.length > 0) {
      for (const reasonId of updates.lossReasonIds) {
        await db.run('INSERT INTO transaction_loss_reasons (transaction_id, loss_reason_id) VALUES (?, ?)', transactionId, reasonId);
      }
    }
  }

  return (await getEvaluationByTransactionId(transactionId))!;
}

export async function getLossReasons() {
  const db = await getDb();
  return await db.all<{ id: string; key: string; label: string }>('SELECT * FROM loss_reasons ORDER BY label');
}

export async function getTransactionLossReasons(transactionId: string) {
  const db = await getDb();
  return await db.all<{ id: string; key: string; label: string }>(
    `
    SELECT lr.* FROM loss_reasons lr
    JOIN transaction_loss_reasons tlr ON tlr.loss_reason_id = lr.id
    WHERE tlr.transaction_id = ?
    `,
    transactionId
  );
}

function mapRowToEvaluation(row: any): Evaluation {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    type: row.type,
    chronology: row.chronology,
    mistakes: row.mistakes,
    correctActions: row.correct_actions,
    lessons: row.lessons,
    actionItems: row.action_items,
    followedPlan: row.followed_plan === 1 ? true : row.followed_plan === 0 ? false : null,
    entryMatchesSetup: row.entry_matches_setup === 1 ? true : row.entry_matches_setup === 0 ? false : null,
    properRiskManagement: row.proper_risk_management === 1 ? true : row.proper_risk_management === 0 ? false : null,
    emotionalDecision: row.emotional_decision === 1 ? true : row.emotional_decision === 0 ? false : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lossReasons: [],
  };
}
