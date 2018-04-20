const jwt = require('jwt-simple');
const User = require('../models/user');
const config = require('../../config');

function tokenForUser(user) {
  const timestamp = new Date().getTime();
  return jwt.encode({ sub: user.id, iat: timestamp }, config.secret);
}

exports.signup = function (req, res, next) {
  const username = req.body.username;
  const password = req.body.password;
  const role = req.body.role;
  if (!username || !password || !role) {
    return res.status(422).send({ error: 'You must provide an username ,password & role' });
  }
  // See if a user with given username and password exists
  User.findOne({ username: username }, (err, existingUser) => {
    if (err) { return next(err); }
    // If a user with username does exist
    if (existingUser) {
      res.status(422).send({ error: 'username is in use' });
    }
  });
  // If a user with username does not exist, create and save user record
  const user = new User({
    username: username,
    password: password,
    role: role
  });
  user.save(function (err) {
    if (err) { return next(err); }
    //Respond to request indicating the user was created
    res.json({
      token: tokenForUser(user),
      user: user.username,
      role: user.role
    });
  });
}

exports.signin = function (req, res, next) {
  // User has already username and password authorized
  // We need to give them a token
  res.send({ 
    token: tokenForUser(req.user),
    expiresIn: '3600',
    user: req.user.username,
    role: req.user.role
 });
}