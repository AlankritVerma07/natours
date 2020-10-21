const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}:${err.value}`;
  return new AppError(message, 400);
};
const handleDuplicateFieldsDB = (err) => {
  const message = `Duplicate feild value:${err.keyValue.name}.Please use another value`;
  return new AppError(message, 400);
};
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid Input Data:${errors.join('. ')}`;
  return new AppError(message, 404);
};
const handleJWTError = () =>
  new AppError(`You got Invalid token please log in again`, 401);
const handleJWTExpiredError = () =>
  new AppError(`Token expired.Please log in again..`, 401);
const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    //API
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
  }
  //RENDERED SITE
  console.log('ERROR!!!💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something Went Wrong!',
    msg: err.message,
  });
};
const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    //API
    //Operational,trusted error:send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    //Programing or other unknown errors:don't leak error details
    //1)Log error
    console.log('ERROR!!!💥', err);
    //2)Send generic mewssage
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }
  //RENDERED SITE
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something Went Wrong!',
      msg: err.message,
    });
  }
  //Programing or other unknown errors:don't leak error details
  //1)Log error
  console.log('ERROR!!!💥', err);
  //2)Send generic mewssage
  return res.status(err.statusCode).render('error', {
    title: 'Something Went Wrong!',
    msg: 'Please try again later...',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
    sendErrorProd(error, req, res);
  }
};
