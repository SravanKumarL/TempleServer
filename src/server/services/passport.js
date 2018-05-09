const passport = require('passport');
const Users = require('../models/user');
const User= Users.User;
const config = require('../../config');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const LocalStrategy = require('passport-local');

// Create local strategy
const localOptions = {
  usernameField: 'username'
};
const localLogin = new LocalStrategy(localOptions, function (username, password, done) {
  //Vefify this username and password, call done with the user
  User.findOne({ username: username }, function (err, user) {
    if (err) { return done(err) }
    if (!user) { return done(null, false) }

    //Compare passwords - is 'password' equal to user.password?
    user.comparePassword(password, function (err, isMatch) {
      if (err) { return done(err) }
      if (!isMatch) { return done(null, false) }

      return done(null, user);
    })
  });
  //if it is the correct username and password
  // otherwise call done with false
});
//Setup options for JwT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromHeader('authorization'),
  secretOrKey: config.secret,
};

//Create JWT strategy
const jwtLogin = new JwtStrategy(jwtOptions, function (payload, done) {
  // See if the user ID in the payload exists in our database
  // If it does, call'done' with that other
  // otherwise, call done without a user object
  User.findById(payload.sub, function (err, user) {
    if (err) { return done(err, false) }
    if (user) {
      done(null, user);
    } else {
      done(null, false);
    }
  });
});

//Tell passport to use this strategy
passport.use(jwtLogin);
passport.use(localLogin);