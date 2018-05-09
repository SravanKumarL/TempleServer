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
  hashPassword(user.password).then(hash => {
    user.password = hash;
    next();
  }).catch(error=>next(error));
})

const hashPassword = (password) => {
  return new Promise((resolve,reject)=>{
    // Generate a salt, then run call back
    bcrypt.genSalt(10, function (err, salt) {
      if (err) { return reject(err); }
      //hash (encrypt) password using the salt
      bcrypt.hash(password, salt, null, function (err, hash) {
        if (err) { return reject(err) }
        // Override plain text password with encrypted password
        resolve(hash);
      })
    });
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