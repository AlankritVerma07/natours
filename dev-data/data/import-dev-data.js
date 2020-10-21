const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../model/tourModel'); //beacause tour model is where  we want to write the tours
const User = require('../../model/userModel');
const Review = require('../../model/reviewModel');

dotenv.config({ path: './config.env' });
const DB = process.env.DATABASE.replace(
  '<password>',
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true, //err. was there
  })
  .then(() => {
    //console.log(con.connections);
    console.log('db connection success!!');
  });
//Read file from json
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8')); // data is in json form
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);

//import data into DB
const importData = async () => {
  try {
    await Tour.create(tours); //.creates can not only create objects but also take in objects (like here it accepts an array of objects and forms a document for each of the object)
    await User.create(users, { validateBeforeSave: false }); //.creates can not only create objects but also take in objects (like here it accepts an array of objects and forms a document for each of the object)
    await Review.create(reviews); //.creates can not only create objects but also take in objects (like here it accepts an array of objects and forms a document for each of the object)
    console.log('Data successfully loaded');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};
// Delete from DB
const deleteData = async () => {
  try {
    await Tour.deleteMany(); //.creates can not only create objects but also take in objects (like here it accepts an array of objects and forms a document for each of the object)
    await Review.deleteMany();
    await User.deleteMany();
    console.log('Data successfully deleted');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};
if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}

// console.log(process.argv);-->The process.argv property is an inbuilt application programming interface of the process module which is used to get the arguments passed to the node.js process when run in the command line.
