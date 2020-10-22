const mongoose = require('mongoose');
const dotenv = require('dotenv');

//-----------------LISTEN TO UNHANDLED SYNC. CODE ERROR--------------------------
process.on('uncaughtException', (err) => {
  //WE ARE LISTENING TO AN EVENT uncaughtException
  console.log(err.name, err.message);
  console.log('Uncaught Exxception!!Shutting Down.. ');
  process.exit(1); //it has nothing to do with server since it is a sync code err handler therefore removed it!!
});

dotenv.config({ path: './config.env' });
const app = require('./app');

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
//.catch((err) => console.log('error!'));

//read our files from config.env and save it to node env. variable
//console.log(process.env);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`app running on ${port}`);
});
//-----------------LISTEN TO UNHANDLED ASYNC. CODE ERROR--------------------------
process.on('unhandledRejection', (err) => {
  //WE ARE LISTENING TO AN EVENT unhandledRejection
  console.log(err.name, err.message);
  console.log('Unhandled promise rejections!!Shutting Down.. ');
  server.close(() => {
    //server.close to shutdown the running app smoothly
    process.exit(1); //process.exit(0)-->success & process.exit(1)-->exception
  });
});
process.on('SIGTERM', () => {
  console.log('👋SIGTERM received.Shutting Down gracefully!!');
  server.close(() => {
    console.log('😔Process Terminated!');
  });
});
