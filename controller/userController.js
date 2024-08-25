const { User, Organization } = require("../models/mainModal");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const { createError, createSucces } = require("../utils/response");

exports.register = async (req, res, next) => {
  try {
    const {
      username,
      email,
      password,
      role,
      name,
      organizationId,
      weekLeave,
      allotedLeave,
      checkInTime,
      checkOutTime,
    } = req.body;

    // Generate salt and hash password
    const salt = bcrypt.genSaltSync(10);
    const hashPassword = bcrypt.hashSync(password, salt);

    // Find organization
    const organisation = await Organization.findById(organizationId);
    if (!organisation) {
      return next(createError(404, "Organization not found"));
    }

    const checkInDate = checkInTime
      ? new Date(`1970-01-01T${checkInTime}:00Z`)
      : new Date(`1970-01-01T${organisation?.checkinTime}:00Z`);
    const checkOutDate = checkOutTime
      ? new Date(`1970-01-01T${checkOutTime}:00Z`)
      : new Date(`1970-01-01T${organisation?.checkoutTime}:00Z`);

    // Calculate duration in hours
    const workDuration = (checkOutDate - checkInDate) / (1000 * 60 * 60);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashPassword,
      role,
      name,
      organizationId,
      workDuration,
      weekLeave,
      allotedLeave,
      checkInTime: checkInTime ? checkInTime : organisation?.checkinTime,
      checkOutTime: checkOutTime ? checkOutTime : organisation?.checkoutTime,
    });

    // Save the user
    await newUser.save();

    // Return success response
    res.status(201).json({ message: "Registration successful", newUser });
  } catch (error) {
    // Handle errors
    if (error?.keyValue?.username) {
      next(createError(403, "Username already exists"));
    } else {
      next(createError(403, error));
    }
  }
};

//Login
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return next(createError(403, "User not found"));
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return next(createError(403, "Invlaid credentials"));
    }

    const organisation = await Organization.findById(user.organizationId);

    if (organisation?.onBoardingStatus != "completed") {
      return createSucces(res, 202, organisation?.onBoardingStatus, null);
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role, organizationId: user.organizationId },
      process.env.JWT_SECRETE
    );

    res.cookie("user_Token", token, {
      expires: new Date(Date.now() + 2589200000), 
      httpOnly: true,
    });
    res.status(201).json({ message: "Logged in", token });
  } catch (error) {
    next(createError(403, error));
  }
};

//Me
exports.me = async (req, res, next) => {
  try {
    const { _id, role } = req.user;

    const user = await User.findById(_id).select("name email role is_active");

    if (!user) {
      return next(createError(404, "User Not Found"));
    }

    return createSucces(res, 200, "user data", user);
  } catch (error) {
    console.log(error);
    next(createError(403, error));
  }
};
