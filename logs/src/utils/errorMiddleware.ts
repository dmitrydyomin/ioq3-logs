import { ErrorRequestHandler } from 'express';

export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  if (err) {
    const status: number = err.httpCode || 500;
    res.status(status).json({ message: err.message, name: err.name });
    if (status === 500) {
      console.log(err);
    }
  } else {
    next();
  }
};
