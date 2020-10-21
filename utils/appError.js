class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor); //this-->object instance created & this.contructor is our AppError class itself
    /* this way(the above line) when a new obj is creted and a constructor func is called
so that func call is not gonna appear in our stack  and pollute it */
  }
}
module.exports = AppError;
