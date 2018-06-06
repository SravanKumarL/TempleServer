// Main starting point of the application.
// const dbConfig = require('./dbconfig');
const express = require('express');
const path = require('path');
const http = require('http')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const mongoose = require('mongoose');
const cors = require('cors');
const logHelper = require(path.join(__dirname, '../../service/helper'));
const serverLogger = logHelper.getLogger('serviceLog.log');
const logToLogFile = (text, type) => logHelper.logToLogFile(serverLogger, text, type);
const logToConsoleAndLogFile = (text, type) => {
  console.log(text);
  logToLogFile(text, type);
}
const logType = { error: 'error', warn: 'warn', fatal: 'fatal' };
const config = {
  mongoURL: process.env.MONGODB_URI || 'mongodb://localhost:/temple',
  port: process.env.PORT || 7000,
};
//DB Setup 
// mongoose.connect(`mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_SERVER}`);
mongoose.connect(`${config.mongoURL}`);

const app = express();
const router = require('./router');
//App Setup
app.use(morgan('combined'));
app.use(cors());
app.use(bodyParser.json({ type: '*/*' }));

router(app);


//Server Setup
const port = process.env.PORT || 7000;
const server = http.createServer(app);
server.listen(port);
server.on('error', error => logToConsoleAndLogFile(error, logType.error));
server.on('close', () => logToConsoleAndLogFile('Closing Temple Server', logType.fatal));
server.on('listening', () => logToConsoleAndLogFile('Server listening on port:' + port));