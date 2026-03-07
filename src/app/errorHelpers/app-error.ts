export class AppError extends Error {
  statusCode: number;

  constructor(statusCode = 500, message: string, stack = "") {
    super(message);
    this.statusCode = statusCode

    if(stack){
        this.stack = stack;
    }
    else{
        Error.captureStackTrace(this, this.constructor);
    }
  }
}

