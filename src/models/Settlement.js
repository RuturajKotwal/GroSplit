const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group ID is required'],
    index: true,
  },
  from: {
    type: String,
    required: [true, 'Payer (from) is required'],
    trim: true,
  },
  to: {
    type: String,
    required: [true, 'Recipient (to) is required'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    validate: {
      validator: function (val) {
        return Number.isInteger(val) && val > 0;
      },
      message: 'Amount must be a positive integer (in cents)',
    },
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

settlementSchema.pre('validate', async function (next) {
  if (this.from && this.to && this.from === this.to) {
    this.invalidate('to', "'from' and 'to' members cannot be the same");
  }

  if (!this.groupId) return next();

  const Group = mongoose.model('Group');
  const group = await Group.findById(this.groupId);
  if (!group) {
    this.invalidate('groupId', 'Referenced group does not exist');
    return next();
  }

  if (this.from && !group.members.includes(this.from)) {
    this.invalidate(
      'from',
      `Member '${this.from}' is not a member of this group`
    );
  }

  if (this.to && !group.members.includes(this.to)) {
    this.invalidate('to', `Member '${this.to}' is not a member of this group`);
  }

  next();
});

module.exports = mongoose.model('Settlement', settlementSchema);
