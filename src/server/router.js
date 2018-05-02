const Entity = require('./controllers/entity');
const Authentication = require('./controllers/authentication');
const Transaction = require('./controllers/transactions');
const passportService = require('./services/passport');
const passport = require('passport');
const {Constants} = require('./constants/constants');
const requireAuth = passport.authenticate('jwt', { session: false });
const requireSignin = passport.authenticate('local', { session: false });

module.exports = function (app) {
  app.get('/', requireAuth, function (req, res) {
    res.send({ message: 'Super secret code is ABC123' });
  });
  //Auth routes
  app.post('/signin', requireSignin, Authentication.signin);
  app.post('/signup', Authentication.signup);

  // Transaction Routes
  app.post(`/${Constants.Transactions}/${Constants.add}`, requireAuth, Transaction.addTransaction);
  app.get(`/${Constants.Transactions}/${Constants.get}`, requireAuth, Transaction.getTransactions);
  app.post(`/${Constants.Transactions}/${Constants.get}`, requireAuth, Transaction.searchTransactions);
  app.post(`/${Constants.Reports}`,requireAuth,Transaction.getReports);

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