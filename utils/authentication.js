const jwt = require("jsonwebtoken");
const { createError } = require("./response");


const verifyToken = async (req, res, next) => {

    const token = req.headers.authorization;
  
    if (!token) {
      return next(createError(403, "Please login"));
    }
  
    let data = jwt.verify(token, process.env.JWT_SECRETE);

    if(!data){
      return next(createError(403, "Invladid token"));
    }

    req.user = data
  
    next();
  }; 


module.exports = {
    verifyToken
}