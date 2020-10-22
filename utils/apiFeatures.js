class APIFeatures {
  constructor(query, queryString) {
    this.query = query; //----query obj----Mongoose query i.e when we pass Tour.find() it returns a query class which has access to various methods such as sort,limit,fields,etc
    this.queryString = queryString; //----query string-----Express query i.e req.query
  }

  filter() {
    const queryObj = { ...this.queryString }; //shallow copy
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach((el) => delete queryObj[el]);

    //1B)ADVANCE FILTERING
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); // we are trying to replace {difficulty:'easy',duration;{$gte:5}}---->{difficulty:'easy',duration;{gte:'5'}}
    this.query = this.query.find(JSON.parse(queryStr));
    //let query = Tour.find(JSON.parse(queryStr));
    return this; // for chaining methods in instances of class
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' '); //since in url we cant write space(price ratingsAverage) therefore we need to replace it with(price,ratingsAverage) in url
      // console.log(sortBy);
      this.query = this.query.sort(sortBy); //instead of query.sort(req.query.sort)
      //sort(price ratingsAverage)
      //sort:-price means dscending ordr
    } else {
      this.query = this.query.sort('-createdBy');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      // console.log(fields);
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v'); //-field will remove the field
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
    //-------------------NO USE----------------------------
    // if (this.queryString.page) {
    //   const numTours = await Tour.countDocuments();
    //   if (skip >= numTours) throw new Error(' PAGE DOES NOT EXIST!!');
    // }
    //---------------------NO USE----------------------------
  }
}
module.exports = APIFeatures;
