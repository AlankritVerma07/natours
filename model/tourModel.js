const mongoose = require('mongoose');
const slugify = require('slugify');
//const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tour Must Have A Name'], //if no name is thee then an err will display:Tour Must Have A Name
      unique: true,
      trim: true,
      maxlength: [40, 'Name must have less than or equal to 40 characters'],
      minlength: [10, 'Name must have more than or equal to 10 characters'],
      // validate: [validator.isAlpha, 'Tour name should only contain cahracters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'Tour must have a Duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'Tour must have a maxGroupSize'],
    },
    difficulty: {
      type: String,
      required: [true, 'Tour must have a Difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Dufficulty can either be of 3 values',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      max: [5, 'Ratings must be below 5'],
      min: [1, 'Rating must be above 1'],
      set: (val) => Math.round(val * 10) / 10, // 4.666666-->46.6666--->47/10-->4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0, //since in starting there are going to be no ratings
    },
    //------NOTE--> Both ratingAverage & ratingQuantity have no "required" field since both of the are not specified by the user
    price: {
      type: Number,
      required: [true, 'A Tour Must Have A Price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // VAL IS INPUTTED VALUE
          //this only points to the current doc on NEWLY created doc i.e its not gonna work with update requests
          return val < this.price; //RETURNS BOOLEAN VALUE
        },
        message:
          'The discounted price i.e ({VALUE}) should be less than original price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'Tour must have a Description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String, // name of the image is  stored as string  & sent back to the file system to fetch it(we can also store the image into the DB but thats not prefreed)
      required: [true, 'Tour must have a image cover'],
    },
    images: [String], //array of name of images as string (we have multiple images & we want to save those images a a array of strings)
    createdAt: {
      type: Date,
      default: Date.now,
      select: false, //exclude field right from schema exp:-if we dont want to send sensitive data to be send to client like passwrd therefore we can permanently exclude this field from the scheme
    },
    startDates: [Date], //different dates at which a tour start
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'], //We want to specially say that it has to be Point specific only
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    /*     to make it(location) into an embedded object we have to make an array of locations
    So by specifying an array of objects,this will then create brand new documents
    inside of the parent doc. which is in case the tour */

    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // guides: Array,----->for Embedding DATA of users inside TOUR
    guides: [
      //Child ref of tour(c)---->user(p)
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
//tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 }); //Compound Index
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });
tourSchema.virtual('durationweeks').get(function () {
  return this.duration / 7; //we used normal function & not arrow func since we have our own this in normal function
}); //virtual data does not not get stored in database

//---------------------------Virtual Populate------------------------
/* We created parent ref but Tour doc had no access of reviews so one way was to create 
child ref. but that would creae an array of objects there we decided tovirtually populate 
the Tour doc. which does not persist in DB  */
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});
tourSchema.virtual('bookings', {
  ref: 'Booking',
  foreignField: 'tour',
  localField: '_id',
});

//Document middleware runs before .save or .create( ndoes not work with .insertMany)
tourSchema.pre('save', function (next) {
  //console.log(this); //this here points to the current doc being processed or saved
  this.slug = slugify(this.name, { lower: true }); //new property on the currently processed document
  next();
});
//---------------------EMBEDDING USERS IN TOUR-------------------------------------
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });
//----------------------------------------------------------------------------------

// tourSchema.pre('save', function (next) {
//   console.log('Will save document...');
//   next();
// });
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);//post middle ware will work after pre middle ware,post middleware does not accesss to "this" but to the document itself
//   next();
// });

//QUERY MIDDLEWARE

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });

  next();
});

//tourSchema.pre('find', function (next) {
tourSchema.pre(/^find/, function (next) {
  //R.E since we findOne query to also work
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now(); //setting up new property on current query
  next();
});
// tourSchema.post(/^find/, function (doc, next) {
//   console.log(`Query took ${Date.now() - this.start}`);
//   console.log(doc);
//   next();
// });
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
