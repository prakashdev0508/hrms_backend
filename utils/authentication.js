const jwt = require("jsonwebtoken");
const { createError } = require("./response");
const { User } = require("../models/mainModal")


const verifyToken = async (req, res, next) => {

    const token = req.headers.authorization;
  
    if (!token) {
      return next(createError(403, "Please login"));
    }
  
    let data = jwt.verify(token, process.env.JWT_SECRETE);

    if(!data){
      return next(createError(403, "Invladid token"));
    }

    const user = await User.findById(data._id);
    if (!user) {
      return next(createError(401, "User not found"));
    }


    if (user.passwordChangedAt) {
      const passwordChangedAt = new Date(user.passwordChangedAt).getTime();
      const tokenIssuedAt = data.iat * 1000;

      if (tokenIssuedAt < passwordChangedAt) {
        return next(createError(403, "Password changed. Please login again."));
      }
    }

    req.user = data
  
    next();
  }; 


module.exports = {
    verifyToken
}