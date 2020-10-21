const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

//const {getAllTour,createTour,getTour,updateTour,deleteTour}=require('./../controllers/') --> we can also use destructuring if we dont want to write tourController.getTour,etc
const router = express.Router();
//router.param('id', tourController.checkId);

// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview
//   );--->Not cool since create reviews is a part of reviewRoute

router.use('/:tourId/reviews', reviewRouter);
router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours); //tourController.aliasTopTours acys as a MIDDLEWARE which prequills the query for the user
router.route('/tour-stat').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// /tour-within?distance=333&center=-37,45&unit=mi
// /tour-within/333/center/33.954118, -118.038240/unit/mi

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router //convention to call it router instead of tourRouter
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );
//.post(tourController.checkBody, tourController.createTour);-->when we wanted to show how MIDDLEWARE works

router
  //.route('/api/v1/tours/:id')-->since middle ware provies the default root therefore no need to write since it is already on route (/api/v1/tours) i.e tourRouter  runs on this /api/v1/tours route only
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourPhoto,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
