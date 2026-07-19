const Joi = require('joi');
const { AppError } = require('../utils/errors');

// schema: Joi.object({...})
const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { stripUnknown: true, abortEarly: true });
  if (error) return next(new AppError(error.details[0].message, 400));
  req.body = value;
  next();
};

module.exports = { validateBody };