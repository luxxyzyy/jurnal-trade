export type TransactionDirection = 'LONG' | 'SHORT';
export type TransactionStatus = 'OPEN' | 'PROFIT' | 'LOSS' | 'BREAKEVEN';
export type EvaluationType = 'PROFIT' | 'LOSS' | 'DRAFT';

export interface Transaction {
  id: string;
  dateTime: string;
  instrument: string;
  direction: TransactionDirection;
  lot: number;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  status: TransactionStatus;
  manualPnL: number | null;
  calculatedPnL: number | null;
  strategyId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Evaluation {
  id: string;
  transactionId: string;
  type: EvaluationType;
  chronology: string | null;
  mistakes: string | null;
  correctActions: string | null;
  lessons: string | null;
  actionItems: string | null;
  followedPlan: boolean | null;
  entryMatchesSetup: boolean | null;
  properRiskManagement: boolean | null;
  emotionalDecision: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionInput {
  dateTime: string;
  instrument: string;
  direction: TransactionDirection;
  lot: number;
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  status: TransactionStatus;
  manualPnL?: number;
  strategyId?: string;
}

export interface CreateEvaluationInput {
  transactionId: string;
  type: EvaluationType;
  chronology?: string;
  mistakes?: string;
  correctActions?: string;
  lessons?: string;
  actionItems?: string;
  followedPlan?: boolean;
  entryMatchesSetup?: boolean;
  properRiskManagement?: boolean;
  emotionalDecision?: boolean;
  lossReasonIds?: string[];
}
