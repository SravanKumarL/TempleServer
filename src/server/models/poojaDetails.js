const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { convertToProperCase } = require('../constants/constants');

// Define our model
const poojaSchema = new Schema({
  id: String,
  poojaName: { type: String, sparse: true },
  amount: Number,
  time: String
});
poojaSchema.pre('save', function (next, errCb) {
  this.poojaName = convertToProperCase(this.poojaName);
  next();
});

// Create the model class
const modelClass = mongoose.model('poojaDetail', poojaSchema);
//Export the model
module.exports = modelClass;