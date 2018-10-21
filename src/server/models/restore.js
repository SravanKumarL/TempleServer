const { Constants } = require('../constants/constants');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const restore = new Schema({ restoredDate: Date });
module.exports = mongoose.model(Constants.restore, restore);