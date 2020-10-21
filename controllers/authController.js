const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../model/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  // Remove passowrd from o/p
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // const newUser = await User.create(req.body);
  /*   the above line has a major security flaw i.e this way any user can log in as an 
  admin when we pass the whole req.body in User.create therefore this need to be
  replaced by the lines below */
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
  //---------------------REFACTORED INTO createSENDtOKEN-----------------------------
  // const token = signToken(  newUser._id );
  // // const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
  // //   expiresIn: process.env.JWT_EXPIRES_IN,
  // // });
  // res.status(201).json({
  //   status: 'success',
  //   token,
  //   data: {
  //     user: newUser,
  //   },
  // });
  //------------------------------------------------------------------------------------
});
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; // destructuring

  //1)Check if email & password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  //2)Check if user exist and password is correct
  const user = await User.findOne({ email }).select('+password'); //same as User.findOne({ email:email })
  /* since user is a result of querying User model therefore it is a document
  and all documents have access to instance methods */
  //const correct = await user.correctPassword(password, user.password);-->replaced if(!user ||!correct) because what if there was no user then user.password will not exist
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect user or password', 401));
  }
  //3)If everything ok,send token to client
  createSendToken(user, 202, res);

  // const token = signToken(user._id);
  // res.status(202).json({
  //   status: 'success',
  //   token,
  // });
});
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedOut', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};
exports.protect = catchAsync(async (req, res, next) => {
  //1) Gettin token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  //console.log(token);
  if (!token) {
    return next(new AppError('You are not loged in..', 401));
  }
  //2)Verification of token (If some1 has manupulated the data or the token has exptred)
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //console.log(decoded);

  /* what if the user has been deleted in meantime but the token still exists
  so if the user is non existant we simply dont want him to log in
  or what if the user has changed his passwrd after the token has been issued therefore
  we will take care of the above in the bolow line of code
  */

  //3)Check if user still exists
  const freshUser = await User.findById(decoded.id); // this is the reason we have _id in payload and since we have verified our token therefore we can be sure that the token belong to the user to which it was issued for
  if (!freshUser) {
    return next(
      new AppError('the User belonging to this token does not exist', 401)
    );
  }
  //4) Check if the user changed his password after the token was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User changed password.Please try again..', 401));
  }
  //Grant acceess to protected route
  req.user = freshUser; // append the user object (freshUser) the the request object
  //middleware func will have access to the req object since it is the req object which is being passed to the next MW
  res.locals.user = freshUser;
  next(); // call next middleware in the stack
});

//Only for rendered pages,no errors since we want to change header if user is logged in
exports.isLoggedIn = async (req, res, next) => {
  //1) Gettin token and check if it exists

  if (req.cookies.jwt) {
    try {
      //2)Verification of token (If some1 has manupulated the data or the token has exptred)
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      /* what if the user has been deleted in meantime but the token still exists
  so if the user is non existant we simply dont want him to log in
  or what if the user has changed his passwrd after the token has been issued therefore
  we will take care of the above in the bolow line of code
  */

      //3)Check if user still exists
      const freshUser = await User.findById(decoded.id); // this is the reason we have _id in payload and since we have verified our token therefore we can be sure that the token belong to the user to which it was issued for
      if (!freshUser) {
        return next();
      }
      //4) Check if the user changed his password after the token was issued
      if (freshUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      //There is a logged in user
      res.locals.user = freshUser; //Giving pug temp. access to a variable 'user'

      return next(); // call next middleware in the stack
    } catch (err) {
      return next();
    }
  }
  next(); //if there is no jwt in cookie
};

/* We need a way of passing in the arguments in a middleware which ususally does not work
 therefore we create a wrapper function which returns our middleware which we want to
 create */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles["admin","lead-guide"].roles="user"-->returns false
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`You do not have permission to perform this action`, 403)
      );
    }
    next();
  };
};
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email id', 404));
  }
  //2)Generate random Token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3)Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(`There was error sending Email.Please try again later`),
      500
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  console.log(hashedToken);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  console.log(user);
  //2)If token not expired and there is user,set the new password
  if (!user) {
    return next(new AppError('Token is invalid or expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //3)Update changedPasswordAt property for the user

  /* saving to DB is sometimes a bit slower than issueing a token therefore when we update
the this.passwordChangedAt property in DB it takes a bit longer thats why 
changedTimeStramp is created a bit longer and user is not able to log in
therefore we made an instance method-->userSchema.pre('save',function----) */

  //4)Log the user in, send jwt
  createSendToken(user, 200, res);

  // const token = signToken(user._id);

  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
});
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { passwordCurrent } = req.body;
  //1)Get user from collection
  console.log(req.user);
  //  const user = await User.findById(req.user.id).select-->JONAS'way

  const user = await User.findOne({ email: req.user.email }).select(
    '+password'
  );

  //2)Check if posted current password is correct
  if (!(await user.correctPassword(passwordCurrent, user.password))) {
    return next(new AppError('Incorrect user or password', 401));
  }
  //3)If so update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndRemove will not work as intented
  //4)Log in user,send JWT
  createSendToken(user, 200, res);

  // const token = signToken(user._id);

  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
  //   console.log(req.user);
});
//---------------------------------JONAS'CODE BELOW------------------------------------
// exports.updatePassword = catchAsync(async (req, res, next) => {
//   // 1) Get user from collection
//   const user = await User.findById(req.user.id).select('+password');

//   // 2) Check if POSTed current password is correct
//   if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
//     return next(new AppError('Your current password is wrong.', 401));
//   }

//   // 3) If so, update password
//   user.password = req.body.password;
//   user.passwordConfirm = req.body.passwordConfirm;
//   await user.save();
//   // User.findByIdAndUpdate will NOT work as intended!

//   // 4) Log user in, send JWT
//   createSendToken(user, 200, res);
//--------------------------------------------------------------------------------------
