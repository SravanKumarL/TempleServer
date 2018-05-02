const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt-nodejs');

// Define our model
const userSchema = new Schema({
  username: { type: String, unique: true, lowercase: true, },
  password: String,
  role: String,
});

//On Save Hook encrypt password,
//Before saving a model, run this function
userSchema.pre('save', function (next) {
  // get access to the user model
  const user = this;
  hashPassword(user.password, hash => user.password = hash, next);
})

const hashPassword = (password, hashCb, next) => {
  // Generate a salt, then run call back
  bcrypt.genSalt(10, function (err, salt) {
    if (err) { return next(err); }
    //hash (encrypt) password using the salt
    bcrypt.hash(password, salt, null, function (err, hash) {
      if (err) { return next(err) }
      // Override plain text password with encrypted password
      hashCb(hash);
      next();
    })
  });
}
exports.hashPassword = hashPassword;

userSchema.methods.comparePassword = function (candidatePassword, callback) {
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    if (err) { return callback(err) }
    callback(null, isMatch);
  });
}
// Create the model class
const modelClass = mongoose.model('user', userSchema);

//Export the model
exports.User = modelClass;