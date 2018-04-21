const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
  id:Number,
  phoneNumber: Number,
  names: String,
  gothram: String,
  nakshatram: String,
  pooja: String,
  selectedDates:[String],
  numberOfDays: Number,
  createdBy: String,
  amount:Number,
  bankName:String,
  chequeNo:Number,
  createdDate:String,
  others: Boolean,
});

// Create the model class
const modelClass = mongoose.model('transactions', transactionSchema);

module.exports = modelClass;
