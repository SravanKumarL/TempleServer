const { Constants } = require('../constants/constants');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const backup = new Schema({ createdDate: Date });
module.exports = mongoose.model(Constants.backup, backup);