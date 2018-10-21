const Entity = require('./controllers/entity');
const Authentication = require('./controllers/authentication');
const Transaction = require('./controllers/transactions');
require('./services/passport');
const passport = require('passport');
const { Constants } = require('./constants/constants');
const requireAuth = passport.authenticate('jwt', { session: false });
const requireSignin = passport.authenticate('local', { session: false });

module.exports = function (app) {
  app.get('/', function (req, res) {
    res.send({ message: 'Server is up and ready to serve ...' });
  });
  //Auth routes
  app.post('/signin', requireSignin, Authentication.signin);
  app.post('/signup', Authentication.signup);

  // Transaction Routes
  let Transactions = Entity.entity(Constants.Transactions);
  app.post(`/${Constants.Transactions}/${Constants.add}`, requireAuth, Transaction.addTransaction);
  app.get(`/${Constants.Transactions}`, requireAuth, Transaction.getTransactions);
  app.post(`/${Constants.Transactions}`, requireAuth, Transaction.searchTransactions);
  app.put(`/${Constants.Transactions}/:id`, requireAuth, Transactions.update);
  app.post(`/${Constants.Reports}`, requireAuth, Transaction.getReports);
  app.post(`/${Constants.Reports}/totalAmount`,Transaction.getTotalAmount);

  //Pooja Routes
  let Pooja = Entity.entity(Constants.Poojas);
  app.post(`/${Constants.Poojas}/${Constants.add}`, requireAuth, Pooja.add);
  app.get(`/${Constants.Poojas}`, requireAuth, Pooja.get);
  app.get(`/${Constants.Poojas}/${Constants.Schema}`, requireAuth, Pooja.schema);
  app.delete(`/${Constants.Poojas}/:id`, requireAuth, Pooja.delete);
  app.put(`/${Constants.Poojas}/:id`, requireAuth, Pooja.update);

  //User Routes
  let User = Entity.entity(Constants.Users);
  app.post(`/${Constants.Users}/${Constants.add}`, requireAuth, User.add);
  app.get(`/${Constants.Users}`, requireAuth, User.get);
  app.get(`/${Constants.Users}/${Constants.Schema}`, requireAuth, User.schema);
  app.delete(`/${Constants.Users}/:username`, requireAuth, User.delete);
  app.put(`/${Constants.Users}/:username`, requireAuth, User.update);
}