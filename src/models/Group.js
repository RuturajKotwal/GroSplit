const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
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
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: 'Group must have at least one member',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Group', groupSchema);
