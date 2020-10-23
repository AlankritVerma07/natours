const express = require('express');
const viewsContoller = require('../controllers/viewsController');
const authController = require('../controllers/authController');
// const bookingController = require('../controllers/bookingController');

const router = express.Router();

// router.use(authController.isLoggedIn);-->since we dont want to do this query-->const freshUser = await User.findById(decoded.id) twice

// router.get('/', (req, res) => {
//   res.status(200).render('base', {
//     tour: 'The forest Hiker',
//     user: 'Alan',
//   });
// });
router.get(
  '/',
  // bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewsContoller.getOverview
);
router.get('/tour/:slug', authController.isLoggedIn, viewsContoller.getTour);
router.get('/login', authController.isLoggedIn, viewsContoller.getLoginForm);
router.get('/signup', authController.isLoggedIn, viewsContoller.getSignupForm);
router.get('/me', authController.protect, viewsContoller.getAccount);
router.get('/my-tours', authController.protect, viewsContoller.getMyTours);

// router.post(
//   '/submit-user-data',
//   authController.protect,
//   viewsContoller.updateUserData
// );

module.exports = router;
