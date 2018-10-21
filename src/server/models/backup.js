const { Constants } = require('../constants/constants');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const backup = new Schema({ createdDate: Date, backupFilePath: String });
module.exports = mongoose.model(Constants.backup, backup);