const Review = require('../model/reviewModel');
// const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactoory');

exports.setTourUserIds = (req, res, next) => {
  //Allowed nested routes-->Allow user to write it in the body or URL
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id; //-->Is on the protect
  next();
};
exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
