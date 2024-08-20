exports.createError = (status, message) => {
  const err = new Error();
  err.message = message;
  err.status = status;

  return err;
};


exports.createSucces = (res , status , message , data ) =>{
  return res.status(status).json({ status : "success" , message: message , data })
}

