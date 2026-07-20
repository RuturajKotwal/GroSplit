import { Document, Types } from 'mongoose';

export interface IGroup extends Document {
  _id: Types.ObjectId;
  name: string;
  members: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GroupInput {
  name: string;
  members: string[];
}

export interface IExpense extends Document {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  paidBy: string;
  amount: number;
  description: string;
  date: Date;
  splitBetween: string[];
  shares?: Record<string, number>;
  ratios?: Record<string, number>;
}

export interface ExpenseInput {
  paidBy: string;
  amount: number;
  description: string;
  splitBetween?: string[];
  shares?: Record<string, number>;
  ratios?: Record<string, number>;
}

export interface ISettlement extends Document {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  from: string;
  to: string;
  amount: number;
  date: Date;
}

export interface SettlementInput {
  from: string;
  to: string;
  amount: number;
}

export type BalanceMap = Record<string, number>;

export interface SimplifiedTransaction {
  from: string;
  to: string;
  amount: number;
}

export interface ExpenseCalculationObject {
  paidBy?: string;
  amount?: number;
  splitBetween?: string[];
  shares?: Record<string, number>;
  ratios?: Record<string, number>;
}

export interface SettlementCalculationObject {
  from?: string;
  to?: string;
  amount?: number;
}
