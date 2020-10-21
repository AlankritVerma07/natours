const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../model/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactoory');

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
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);
//upload.single('image')--> When we hav to upload a single image-->req.file
//upload.array('images',5)-->When we hav to loop over a single field-->req.files

exports.resizeTourPhoto = catchAsync(async (req, res, next) => {
  //console.log(req.files);
  if (!req.files.imageCover || !req.files.images) return next();
  //1) Cover Images
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1300)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);
  //2)Imags
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      //await sharp(req.files.images[i].buffer)-->My Way
      await sharp(file.buffer)
        .resize(2000, 1300)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      req.body.images.push(filename);
    })
  );
  // console.log(req.body);
  next();
});
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingAverage,price';
  req.query.fields = 'name,price,ratingAverage,summary,difficulty';
  next();
};

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );
//----------------------MIDDLEWARE FOR CHECKING ID------------------------
// exports.checkId = (req, res, next, val) => {
//   console.log(`id is ${val}`);
//   if (req.params.id * 1 > tours.length) {
//     //Method:1
//     //if (!tour) {
//     //Method:2
//     return res.status(404).json({
//       //return since we want to exit the func.
//       status: 404,
//       message: 'Invalid Id',
//     });
//   }
//   next(); //since we have used 'return' therefore next() will not get executed & we want to come out of the func
// };
// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 400,
//       message: 'price and mane not present',
//     });
//   }
// };
exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
//----------------------TESTING--------------------------
// console.log(req.params);
// const id = req.params.id * 1; //since params id's are in string we need to convert them into int in order to compare ids from json exp:-"4"*1=4
// const tour = tours.find((el) => el.id === id); //find is amethod on array to check every elelment of array and then makes a new array of the elements which are matched

//  if (id > tours.length)//Method:1
// if (!tour) {
//   //Method:2
//   return res.status(404).json({
//     //return since we want to exit the func.
//     status: 404,
//     message: 'Invalid Id'
//   });
// }
//----------------CATCHASYNC TESTING---------------------------------------
// const catchAsync = (fn) => {
//   return (req, res, next) => {
//     fn(req, res, next).catch(next);-->same as .catch(err=>next(err))
//   };
// };

exports.createTour = factory.createOne(Tour);
//-----------TESTING---------------
//exports.createTour = (req, res) => {
//console.log(req.body); //body is available to us since we use middleware
//res.send('done');
// const newId = tours[tours.length - 1].id + 1;
// const newTour = Object.assign({ id: newId }, req.body);
// tours.push(newTour);
// fs.writeFile(
//   `${__dirname}/dev-data/data/tours-simple.json`,
//   JSON.stringify(tours),
//   (err) => {
//     res.status(201).json({
//       status: 'success',
//       data: { tour: newTour },
//     });
//   }
// );
//}
exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);
//----------------------Below code has been converted to FACTORY FUNC.-----------------------
// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);
//   if (!tour) {
//     return next(new AppError('No tour found with I.D', 404));
//   }
//   res.status(204).json({
//     status: 'success',
//     data: null, //its a common practice not to sent any data in rest api when we delete
//   });
// });
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        //_id: null,
        // _id: '$difficulty',
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: {
        avgPrice: 1,
      },
    },
    // {
    //   $match: {
    //     _id: { $ne: 'EASY' },
    //   },
    // },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; //to transform the year from URL into a no.
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, //_id specifies on what basis we want to group our doc.
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // since we want it in radians
  if (!lat || !lng) {
    next(new AppError('Please provide lat. & lng. in the format lat,lng', 400));
  }
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  // console.log(distance, unit, lat, lng);
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: tours,
  });
});
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const multiplier = unit === 'mi' ? 0.00062137119224 : 0.001;
  if (!lat || !lng) {
    next(new AppError('Please provide lat. & lng. in the format lat,lng', 400));
  }
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  // console.log(distance, unit, lat, lng);
  res.status(200).json({
    status: 'success',
    data: distances,
  });
});
