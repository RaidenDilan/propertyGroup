const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const s3 = require('../lib/s3');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  firstname: { type: String, required: true },
  surname: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  profileImage: { type: String, required: true }
});

userSchema
  .path('profileImage')
  .set(function getPreviousImage(profileImage) {
    this._profileImage = this.profileImage;
    return profileImage;
  });

userSchema
  .virtual('profileImageSRC')
  .get(function getprofileImageSRC() {
    if(!this.profileImage) return null;
    return `https://s3-eu-west-1.amazonaws.com/wdi-london-express-project2/${this.profileImage}`;
  });

userSchema.pre('save', function checkPreviousProfileImage(next) {
  if(this.isModified('profileImage') && this._profileImage) {
    return s3.deleteObject({ Key: this._profileImage }, next);
  }
  next();
});

userSchema.pre('remove', function deleteImage(next) {
  if(this.profileImage) return s3.deleteObject({ Key: this.profileImage}, next);
  next();
});

userSchema
.virtual('passwordConfirmation')
.set(function setPasswordConfirmation(passwordConfirmation) {
  this._passwordConfirmation = passwordConfirmation;
});

userSchema.pre('validate', function checkPassword(next) {
  if(!this._passwordConfirmation || this._passwordConfirmation !== this.password) {
    this.invalidate('passwordConfirmation', 'does not match');
  }
  next();
});

userSchema.pre('save', function hashPassword(next) {
  if(this.isModified('password')) {
    this.password = bcrypt.hashSync(this.password, bcrypt.genSaltSync(11));
  }
  next();
});

userSchema.methods.validatePassword = function validatePassword(password) {
  return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
