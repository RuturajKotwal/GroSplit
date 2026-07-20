import mongoose, { Schema } from 'mongoose';
import { IGroup } from '../types';

const groupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
    },
    members: {
      type: [String],
      required: [true, 'Group members are required'],
      validate: {
        validator: function (val: string[]) {
          return Array.isArray(val) && val.length > 0;
        },
        message: 'Group must have at least one member',
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IGroup>('Group', groupSchema);
