const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define our model
const poojaSchema = new Schema({
  id:String,
  poojaName: { type: String, sparse: true, lowercase: true, },
  amount: Number,
});


// Create the model class
const modelClass = mongoose.model('poojaDetail', poojaSchema);
//Export the model
module.exports = modelClass;