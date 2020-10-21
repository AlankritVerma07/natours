const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errController');

const app = express();
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
//1)GLOBAL Middle Wares

//Servin Static Files
//app.use(express.static(`${__dirname}/public`)); // to open our static files(html,img,etc) from our current directory
app.use(express.static(path.join(__dirname, 'public')));

//Set secure http headers
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      scriptSrc: ["'self'", 'https:', 'http:', 'data:', 'blob:'],
      styleSrc: ["'self'", 'https:', 'http:', "'unsafe-inline'"],
    },
  })
);

//Development logging
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
//Limiting no. of requests
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many reuests from this IP. Please try again in an hour',
});
app.use('/api', limiter);
//Body parser-->reading data from body into req.body
app.use(express.json({ limit: '10kb' })); //middleware i.e it adds body data to req object
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

//Data sanitization against No sql query injection
app.use(mongoSanitize());
//Data sanitization against XSS
app.use(xss());
//Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'price',
    ],
  })
);

// app.get('/', (req, res) => {
//   res
//     .status(200)
//     .json({ message: 'hello from server side...', app: 'Natours' });
// });
// app.post('/', (req, res) => {
//   res.send('post something!!');
// });
//-----------------MIDDLEWARE--------------------

//-----------------TESTING-----------------------
// app.use((req, res, next) => {
//   console.log('hello middleware..');
//   next(); // move to the next middleware
// });
//-----------------TESTING-----------------------
//Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  //console.log(req.cookies);
  next();
});

//-----------------ROUTE HANDLERS--------------------

//  app.get('/api/v1/tours',getAllTours);
//  app.post('/api/v1/tours', createTour);
//  app.get('/api/v1/tours/:id',getTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

//-----------------ROUTES--------------------
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter); //tourRouter is a middle ware on this specific route-->/api/v1/tours therefore tourRoouter is a sub app.
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

/* error handling with the help of app.all since its goona come
only when the above two routes are not hit  i.e when the req-res cycle
is not yet finished since  middleware is executed in stack order.The 
app.all signifies all the http verbs i.e get,post,etc and * singnifies all the 
urls inder those verbs */
app.all('*', (req, res, next) => {
  //------------------------RAW-RESPOPNSE-----------------------------------------
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Fucked up route request!!.Can't find ${req.originalUrl}`,
  // });
  //---------------USING ERROR CLASS BY PASSING next(error)-------------------------
  // const err = new Error(
  //   `Fucked up route request!!.Can't find ${req.originalUrl}`
  // );
  // err.status = 'fail';
  // err.statusCode = 404;
  //-------------------USING-CUSTOM-MADE-CLASS-------------------------------------
  next(
    new AppError(`Fucked up route request!!.Can't find ${req.originalUrl}`, 404)
  );
});
//--------GLOBAL ERROR HANDLER(later exported this to errController/handler)-------
// app.use((err, req, res, next) => {
//   err.statusCode = err.statusCode || 500;
//   err.status = err.status || 'error';
//   res.status(err.statusCode).json({
//     status: err.status,
//     message: err.message,
//   });
// });
app.use(globalErrorHandler);
// all these route have to b used after they are declared
//----------------START SERVER--------------------
module.exports = app;
