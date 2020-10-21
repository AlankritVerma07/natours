const express = require('express');
const userContoller = require('../controllers/userController');
const authContoller = require('../controllers/authController');

const router = express.Router(); //Sub App.
router.post('/signup', authContoller.signup); //we only want to have a route for signup where we can only post data(not RESTful since does not follow:urls should have nothing to do with the actions performed on it..)
router.post('/login', authContoller.login);
router.get('/logout', authContoller.logout);
router.post('/forgotPassword', authContoller.forgotPassword);
router.patch('/resetPassword/:token', authContoller.resetPassword);

router.use(authContoller.protect); //Ading this protect MW to all routes which come after this MW

router.patch('/updateMyPassword', authContoller.updatePassword);

router.get('/me', userContoller.getMe, userContoller.getUser);
router.patch(
  '/updateMe',
  userContoller.uploadUserPhoto,
  userContoller.resizeUserPhoto,
  userContoller.updateMe
);
router.delete('/deleteMe', userContoller.deleteMe);

router.use(authContoller.restrictTo('admin'));

router.route('/').get(userContoller.getAllUsers).post(userContoller.createUser);
router
  .route('/:id')
  .get(userContoller.getUser)
  .patch(userContoller.updateUser)
  .delete(userContoller.deleteUser);
module.exports = router;
