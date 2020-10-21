const multer = require('multer');
const sharp = require('sharp');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../model/userModel');
const factory = require('./handlerFactoory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });-->since for img. processing it is better to store it in memory
const multerStorage = multer.memoryStorage(); //this way img will be stored as a BUFFER
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('No an image!Please upload only images.', 400), false);
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
exports.uploadUserPhoto = upload.single('photo');
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);
  next(); // async-await so that it does not move to next MW without resizeing(sharping) the img
});

const filterObj = (obj, ...allowedFeilds) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFeilds.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
}; /* We used this MW since we have to use getOne factory func but there 
let query = Model.findById(req.params.id) in this line req.params.id has to be replaced by 
the isd coming from the url therefore we use this MW to replace it */

exports.updateMe = catchAsync(async (req, res, next) => {
  //console.log(req.file);
  //console.log(res.body);
  //1)Create err if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates.Kindly go to/updateMyPassword',
        401
      )
    );
  }
  //2)Filtered out unwanted field name that are not allowed to be updated
  const filterBody = filterObj(req.body, 'name', 'email');
  if (req.file) filterBody.photo = req.file.filename;
  //3)Update user document
  const updateUser = await User.findByIdAndUpdate(req.user.id, filterBody, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: {
      user: updateUser,
    },
  });
});
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: 'sucess',
    data: null,
    /* One thing to remember here is that we are not going to delete the user user from DB 
   but simply mark him as in active by setting active:false */
  });
});
exports.getUser = factory.getOne(User);
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'Error',
    message: 'This route is not yet defined..Please use sign up instead',
  });
};
exports.getAllUsers = factory.getAll(User);
//Do not update passwords ith this
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
