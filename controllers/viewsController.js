const Tour = require('../model/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../model/userModel');
const Booking = require('../model/bookingModel');

exports.getOverview = catchAsync(async (req, res) => {
  //1)Get Tour data from collection
  const tours = await Tour.find();
  //2 Build Template
  //3)Render that data using tour data from 1
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});
exports.getTour = catchAsync(async (req, res, next) => {
  //1)Get data for the requested tour(includiong tour and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });
  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }
  //2 Build Template
  //3)Render that data using tour data from 1
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});
exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Login into your account',
  });
};
exports.getSignupForm = (req, res) => {
  res.status(200).render('signup', {
    title: 'Create your account',
  });
};
exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your Account',
  });
};
exports.getMyTours = catchAsync(async (req, res, next) => {
  //1)Find all booking
  const booking = await Booking.find({ user: req.user.id });
  //2)Find the tours with returned id
  const tourIDs = booking.map((el) => el.tour);

  const tours = await Tour.find({ _id: { $in: tourIDs } });
  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});
//-------------------------VIRTUAL POPULATE--------------------------------
// exports.getMyTours = catchAsync(async (req, res, next) => {
//   //1)Find all booking
//   console.log(req.user.id);

//   // const bookings = (await User.findById(req.user.id).populate('bookings'))
//   //   .bookings;
//   const { bookings } = await User.findById(req.user.id).populate('bookings');
//   const tours = bookings.map((el) => el.tour);
//   console.log(bookings);
//   console.log(tours);
//   res.status(200).render('overview', {
//     title: 'My Tours',
//     tours,
//   });
// });

exports.updateUserData = catchAsync(async (req, res) => {
  //console.log(req.body);
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email, //since we named the name attribute as name and email in  our html form
    },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).render('account', {
    title: 'Your Account',
    user: updatedUser, //since the template's user.id is coming from authController.protect wich is not updated
  });
});
