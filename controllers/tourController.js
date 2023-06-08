const { findByIdAndUpdate } = require('../models/tourModel');
const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
}


exports.getAllTours = catchAsync(async (req, res, next) => {
  //EXECUTE QUERY

  const features = new APIFeatures(Tour.find(), req.query).filter().sort().limitFields().paginate();

  const tours = await features.query;

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });

});

exports.getTour = catchAsync(async (req, res, next) => {

  const tour = await Tour.findById(req.params.id);

  if (!tour) {
    return next(new AppError('Tour not found for requested id', 404))
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });

});



exports.createTour = catchAsync(async (req, res, next) => {

  const newTour = await Tour.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      tour: newTour,
    },
  });

});

exports.updateTour = catchAsync(async (req, res, next) => {

  // 1. Validate the request body
  const allowedUpdates = ['name', 'price', 'description', 'duration'];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );
  if (!isValidOperation) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid updates',
    });
  }

  // 2. Check if the user is authorized to update the tour
  // ...

  // 3. Update the tour and handle validation errors
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!tour) {
    return next(new AppError('Tour not found for requested id', 404))
  }
  // 4. Return the updated tour to the client
  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });

});

/*
exports.updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};
*/
exports.deleteTour = catchAsync(async (req, res, next) => {

  const tour = await Tour.findByIdAndDelete(req.params.id);

  if (!tour) {
    return next(new AppError('Tour not found for requested id', 404))
  }
  res.status(204).json({
    status: 'success',
    data: null,
  });

});


exports.getTourStats = catchAsync(async (req, res, next) => {

  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      }
    },
    {
      $sort: { avgPrice: 1 }
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });


});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {

  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }

      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });

});
