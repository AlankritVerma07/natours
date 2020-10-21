const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError('No document found with I.D', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null, //its a common practice not to sent any data in rest api when we delete
    });
  });
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, //return the updated value to the database
      runValidators: true, //rechecks schema to validate the new input
    });
    if (!doc) {
      return next(new AppError('No document found with I.D', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });
exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    //const newTour=new Tour({})
    //newTour.save()---->both the above lines can b written as :-Tour.create
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: { data: doc },
    });
  });
exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = Model.findById(req.params.id).populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with I.D', 404));
    }
    res.status(200).json({
      status: 'success!',
      data: {
        data: doc,
      },
    });
  });
exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    //To allow nested GET reviews on Tour(hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    //EXECUTE QUERY
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate(); // instance of APIFeatures class
    const doc = await features.query; //query.sort().select().limit()------thats how it may look!
    //const doc = await features.query.explain();-->for INDEXING
    //SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length, //while sending multiple data inform no. of data(array of obj. being send) not compulsory
      data: {
        data: doc, //using es6 feature doc=doc since same name also same name as endpoint
      },
    });
  });
