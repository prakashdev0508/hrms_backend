const { User, Organization, Attendance , Leave } = require("../models/mainModal");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const moment = require("moment"); // For date manipulations

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
      reportingManager,
      joinDate,
      salary,
    } = req.body;

    // Generate salt and hash password
    const salt = bcrypt.genSaltSync(10);
    const hashPassword = bcrypt.hashSync(password, salt);

    // Find organization
    const organisation = await Organization.findById(organizationId);
    if (!organisation) {
      return next(createError(404, "Organization not found"));
    }

    console.log(organisation);

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
      reportingManager,
      joinDate,
      salary,
    });

    // Save the user
    await newUser.save();

    // Return success response
    res.status(201).json({ message: "Registration successful", newUser });
  } catch (error) {
    // Handle errors
    if (error?.keyValue?.username) {
      next(createError(403, "Username already exists"));
    } else if (error?.keyValue?.email) {
      next(createError(403, "Email already exists"));
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

    if (!user?.is_active) {
      return next(createError(400, "User is not active"));
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return next(createError(403, "Invlaid credentials"));
    }

    const organisation = await Organization.findById(user.organizationId);

    if (organisation?.onBoardingStatus != "completed") {
      return createSucces(res, 202, organisation?.onBoardingStatus, {
        planId: organisation?.selectedPlan,
        organizationId: user.organizationId,
      });
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role, organizationId: user.organizationId },
      process.env.JWT_SECRETE
    );

    res.cookie("user_Token", token, {
      expires: new Date(Date.now() + 2589200000),
      httpOnly: true,
    });
    res.status(201).json({
      message: "Logged in",
      token,
      role: user.role,
      organizationId: user.organizationId,
    });
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

exports.userDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { month, year } = req.query;

    // Get user data with reporting manager populated
    const user = await User.findById(id)
      .select(
        "name is_active weekLeave createdAt username role email salary joinDate checkInTime checkOutTime"
      )
      .populate("reportingManager", "name");

    if (!user) {
      return next(createError(404, "User not found"));
    }

    // If no month and year are provided, default to the current month and year
    const currentYear = year ? parseInt(year) : moment().year();
    const currentMonth = month ? parseInt(month) - 1 : moment().month(); // 0-based month index for JavaScript Date

    // Find all attendance records for the user in the requested or current month
    const attendanceRecords = await Attendance.find({
      userId: id,
      date: {
        $gte: new Date(currentYear, currentMonth, 1), // Start of the requested month
        $lt: new Date(currentYear, currentMonth + 1, 1), // Start of the next month
      },
    }).select("date status checkInTime checkOutTime");

    // Get all days in the requested or current month
    const daysInMonth = moment({
      year: currentYear,
      month: currentMonth,
    }).daysInMonth();
    let attendanceData = [];

    // Loop through all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth, day);

      // Find if there's an attendance record for the current date
      const record = attendanceRecords.find((attendance) =>
        moment(attendance.date).isSame(currentDate, "day")
      );

      // If no record exists, mark it as "not available"
      if (!record) {
        attendanceData.push({
          date: currentDate,
          status: "not available",
          checkInTime: null,
          checkOutTime: null,
        });
      } else {
        attendanceData.push({
          date: record.date,
          status: record.status,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
        });
      }
    }

    // Attach the attendance data to the response
    const userDetails = {
      ...user._doc,
      attendance: attendanceData,
    };

    createSucces(res, 200, "User details retrieved successfully", userDetails);
  } catch (error) {
    console.log(error);
    next(createError(500, error.message));
  }
};

//Update user
exports.updateuser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { ...req.body, updated_at: Date.now() },
      { new: true }
    );

    if (!updatedUser) {
      return next(createError(404, "User not found"));
    }

    return createSucces(res, 200, "User Updated", null);
  } catch (error) {
    return next(createError(400, error));
  }
};

exports.appUserDetails = async (req, res, next) => {
  try {
    const { _id } = req.user;
    
    // Find user
    const user = await User.findById(_id).populate("organizationId");
    const userDetails = await User.findById(_id).select("name email")
    if (!user) {
      return next(createError(404, "User not found"));
    }

    console.log( "user ",  user)
    
    const organizationId = user.organizationId._id;
    
    // 1. Get today's attendance
    const today = moment().startOf('day'); // Get start of today
    const attendanceRecord = await Attendance.findOne({
      userId: _id,
      date: { $gte: today.toDate(), $lt: moment(today).endOf('day').toDate() },
    }).select("status");

    const attendanceStatus = attendanceRecord ? attendanceRecord.status : "not_available";

    // 2. Get total leaves taken and leaves left
    const leavesTaken = await Leave.find({
      userId: _id,
      status: "approved",
    }).countDocuments();

    const totalAllottedLeave = user.allotedLeave || 0; 
    const leavesLeft = totalAllottedLeave - leavesTaken;

    // 3. Get all members in the organization
    const organizationMembers = await User.find({
      organizationId,
    }).select("name email role is_active");

    // Prepare the response data
    const appUserData = {
      attendanceStatus,
      leavesTaken,
      leavesLeft,
      userDetails,
      organizationMembers,
      workinghours : {
        checkinTime : user?.organizationId?.checkinTime,
        checkoutTime : user?.organizationId?.checkoutTime
      }
    };

    return createSucces(res, 200, "User details retrieved successfully", appUserData);
  } catch (error) {
    console.log(error);
    next(createError(500, error.message));
  }
};

