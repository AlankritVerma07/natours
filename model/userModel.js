const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User Must Have A Name'],
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      required: [true, 'User Must Have An Email-Address'],
      validate: [validator.isEmail, 'Please provide a valid email Address'],
    },
    photo: {
      type: String, //photo is stored in database with a field called photo
      default: 'default.jpg',
    },
    role: {
      type: String,
      enum: ['user', 'guide', 'lead-guide', 'admin'],
      default: 'user',
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm the password'],
      validate: {
        //This only works on Save and Create i.e User.create or User.save
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords are not same!',
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false, //Hide implementation details from user
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
userSchema.virtual('bookings', {
  ref: 'Booking',
  foreignField: 'user',
  localField: '_id',
});

userSchema.pre('save', async function (next) {
  //Only run this if passwrd was actually modified
  if (!this.isModified('password')) return next();

  //Hash the password with CPU incentive call of 12
  this.password = await bcrypt.hash(this.password, 12);

  //Delete passwordConfirm field
  this.passwordConfirm = undefined; //passwordConfirm is required for input but no need to be persisted i DB
  next();
});

// an instance method is a method that is available to all documents on a certain collection
//-------------------------------INSTANCE METHOD--------------------------------
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000; //since it takes a little longer for data to persist in DB
  next();
});
//----------QUERY MW------------->something which happens before query
userSchema.pre(/^find/, function (next) {
  //this points to the current obj
  //this.find({ active: true });---->no result since others are not explicitly seet to active:true
  this.find({ active: { $ne: false } });
  next();
});
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword); //we could have used this.password===userPassword-->but under password{select:false} therefore this will not have access to password
};
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp; //true or false
  }
  //False means not changed
  return false;
};
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex'); //encryted token to be saved in DB for further comparison
  console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken; //unencrypted token being sent to email
};

const User = mongoose.model('User', userSchema);
module.exports = User;
