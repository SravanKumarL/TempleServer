// Main starting point of the application.
// const dbConfig = require('./dbconfig');
const express = require('express');
const http = require('http')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const mongoose = require('mongoose');
const cors = require('cors');

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
console.log('Server listening on port:', port);