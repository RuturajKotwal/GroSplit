import mongoose, { Schema } from 'mongoose';
import { IExpense, IGroup } from '../types';

const expenseSchema = new Schema<IExpense>({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group ID is required'],
    index: true,
  },
  paidBy: {
    type: String,
    required: [true, 'Payer is required'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    validate: {
      validator: function (val: number) {
        return Number.isInteger(val) && val > 0;
      },
      message: 'Amount must be a positive integer (in cents)',
    },
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  splitBetween: {
    type: [String],
    default: undefined,
  },
  shares: {
    type: Schema.Types.Mixed,
    default: undefined,
  },
  ratios: {
    type: Schema.Types.Mixed,
    default: undefined,
  },
});

expenseSchema.pre('validate', async function (next) {
  if (!this.groupId) return next();

  const Group = mongoose.model<IGroup>('Group');
  const group = await Group.findById(this.groupId);
  if (!group) {
    this.invalidate('groupId', 'Referenced group does not exist');
    return next();
  }

  if (!this.splitBetween || this.splitBetween.length === 0) {
    this.splitBetween = [...group.members];
  }

  if (this.paidBy && !group.members.includes(this.paidBy)) {
    this.invalidate(
      'paidBy',
      `Payer '${this.paidBy}' is not a member of this group`
    );
  }

  if (Array.isArray(this.splitBetween)) {
    for (const member of this.splitBetween) {
      if (!group.members.includes(member)) {
        this.invalidate(
          'splitBetween',
          `Member '${member}' in splitBetween is not a member of this group`
        );
      }
    }
  }

  next();
});

export default mongoose.model<IExpense>('Expense', expenseSchema);
