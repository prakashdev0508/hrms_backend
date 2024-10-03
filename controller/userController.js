const {
  User,
  Organization,
  Attendance,
  Leave,
} = require("../models/mainModal");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const moment = require("moment-timezone");
const ExcelJS = require("exceljs");

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
      _id: user._id
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

    // Get user data with reporting manager populated
    const user = await User.findById(id)
      .select(
        "name is_active weekLeave createdAt username role email salary joinDate checkInTime checkOutTime"
      )
      .populate("reportingManager", "name")
      .populate("organizationId", "holidays weakHoliday");

    // Attach the attendance data to the response
    const userDetails = {
      ...user._doc,
    };

    createSucces(res, 200, "User details retrieved successfully", userDetails);
  } catch (error) {
    console.log(error);
    next(createError(500, error.message));
  }
};

exports.userAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { month, year } = req.query;

    // Get user data with reporting manager populated
    const user = await User.findById(id)
      .select(
        "name is_active weekLeave createdAt username role email salary joinDate checkInTime checkOutTime"
      )
      .populate("reportingManager", "name")
      .populate("organizationId", "holidays weakHoliday");

    if (!user) {
      return next(createError(404, "User not found"));
    }

    const currentYear = year ? parseInt(year) : moment().year();
    const currentMonth = month ? parseInt(month) - 1 : moment().month();

    // Get attendance records for the user for the specified month
    const attendanceRecords = await Attendance.find({
      userId: id,
      date: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1),
      },
    }).select("date status checkInTime checkOutTime");

    // Get the organization's holidays
    const organization = await Organization.findById(user.organizationId);
    const holidays = organization.holidays;

    // Get all days in the requested or current month
    const daysInMonth = moment({
      year: currentYear,
      month: currentMonth,
    }).daysInMonth();

    let attendanceData = [];

    // Loop through all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      const isHoliday = holidays.some((holiday) =>
        moment(currentDate).isBetween(
          moment(holiday.startDate),
          moment(holiday.endDate),
          "day",
          "[]"
        )
      );

      // Find if there's an attendance record for the current date
      const record = attendanceRecords.find((attendance) =>
        moment(attendance.date).isSame(currentDate, "day")
      );

      // If no record exists, mark it as "absent" or "holiday"
      if (!record) {
        attendanceData.push({
          date: currentDate,
          status: `${
            moment(currentDate).isBefore(user.joinDate)
              ? "before_join"
              : isHoliday
              ? "holiday"
              : moment(currentDate).isSameOrAfter(moment())
              ? "not available"
              : "absent"
          }`,
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
      attendance: attendanceData,
    };

    createSucces(res, 200, "User details retrieved successfully", userDetails);
  } catch (error) {}
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
    const { _id, organizationId } = req.user;

    // Start date for today
    const today = moment().tz("Asia/Kolkata").startOf("day");

    // 1. Parallelize independent queries using Promise.all
    const [
      userDetails,
      attendanceRecord,
      leavesApprovedCount,
      leavesRejectedCount,
      leavesPendingCount,
      organizationMembers,
      regularizationsApprovedCount,
      regularizationsPendingCount,
      regularizationsRejectedCount,
    ] = await Promise.all([
      User.findById(_id).select(
        "name email allotedLeave checkInTime checkOutTime leaveTaken"
      ),
      Attendance.findOne({
        userId: _id,
        date: {
          $gte: today.toDate(),
          $lt: moment(today).endOf("day").toDate(),
        },
      }).select("status"),
      Leave.find({ userId: _id, status: "approved" }).countDocuments(),
      Leave.find({ userId: _id, status: "rejected" }).countDocuments(),
      Leave.find({ userId: _id, status: "pending" }).countDocuments(),
      User.find({ organizationId }).select("name email role is_active"),
      Attendance.find({
        userId: _id,
        isRegularized: true,
        regularizeRequest: "approved",
      }).countDocuments(),
      Attendance.find({
        userId: _id,
        regularizeRequest: "pending",
      }).countDocuments(),
      Attendance.find({
        userId: _id,
        regularizeRequest: "rejected",
      }).countDocuments(),
    ]);

    // Attendance status
    const attendanceStatus = attendanceRecord
      ? attendanceRecord.status
      : "not_available";

    // Leaves calculations
    const totalAllottedLeave = userDetails.allotedLeave || 0;

    // Prepare the response data
    const appUserData = {
      attendanceStatus,
      requests: {
        allRequests:
          leavesApprovedCount +
          leavesRejectedCount +
          leavesPendingCount +
          (regularizationsApprovedCount +
            regularizationsRejectedCount +
            regularizationsPendingCount),
        pendingRequests: regularizationsPendingCount + leavesPendingCount,
        approvedLeaves: leavesApprovedCount + regularizationsApprovedCount,
        rejectedRequests: leavesRejectedCount + regularizationsRejectedCount,
      },
      userDetails,
      organizationMembers,
      totalAllottedLeave,
      leaveTaken: userDetails.leaveTaken || 0,
    };

    // Return success response
    return createSucces(
      res,
      200,
      "User details retrieved successfully",
      appUserData
    );
  } catch (error) {
    console.log(error);
    next(createError(500, error.message));
  }
};

exports.changeUserPassword = async (req, res, next) => {
  try {
    const { role, _id } = req.user;
    const { currentPassword, newPassword, id } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return next(createError(404, "User not found"));
    }

    if (_id != id) {
      let validCall = false;

      if (role === "super_admin") {
        validCall = true;
      }

      if (!validCall) {
        return next(
          createError(403, "You are not authorized to change password")
        );
      }
    }

    if (currentPassword) {
      const isPasswordMatch = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordMatch) {
        return next(createError(403, "Current password is incorrect"));
      }
    }

    const salt = bcrypt.genSaltSync(10);
    const hashNewPassword = bcrypt.hashSync(newPassword, salt);

    user.password = hashNewPassword;

    // Update passwordChangedAt
    user.passwordChangedAt = new Date();
    await user.save();

    return createSucces(res, 200, "Password updated successfully");
  } catch (error) {
    console.log(error);
    next(createError(500, error.message));
  }
};

exports.downloadUserAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { month, year } = req.query;

    // Get user data with organization and reporting manager populated
    const user = await User.findById(id)
      .select(
        "name is_active weekLeave createdAt username role email salary joinDate checkInTime checkOutTime"
      )
      .populate("reportingManager", "name")
      .populate("organizationId", "holidays weekHoliday");

    if (!user) {
      return next(createError(404, "User not found"));
    }

    const currentYear = year ? parseInt(year) : moment().year();
    const currentMonth = month ? parseInt(month) - 1 : moment().month();

    // Fetch attendance records for the specified month
    const attendanceRecords = await Attendance.find({
      userId: id,
      date: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1),
      },
    }).select("date status checkInTime checkOutTime");

    // Get the organization's holidays
    const organization = await Organization.findById(user.organizationId);
    const holidays = organization.holidays;

    // Create an Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance");

    // Add header row to the worksheet
    worksheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Check-In Time", key: "checkInTime", width: 20 },
      { header: "Check-Out Time", key: "checkOutTime", width: 20 },
    ];

    // Get all days in the specified month
    const daysInMonth = moment({
      year: currentYear,
      month: currentMonth,
    }).daysInMonth();

    // Loop through the days of the month to generate attendance data
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      const isHoliday = holidays.some((holiday) =>
        moment(currentDate).isBetween(
          moment(holiday.startDate),
          moment(holiday.endDate),
          "day",
          "[]"
        )
      );

      // Find the attendance record for the current date
      const record = attendanceRecords.find((attendance) =>
        moment(attendance.date).isSame(currentDate, "day")
      );

      // Determine if the user joined by the current date
      const isJoined = moment(currentDate).isSameOrAfter(user.joinDate, "day");

      // Push data to the worksheet
      worksheet.addRow({
        date: moment(currentDate).format("YYYY-MM-DD"),
        status: isHoliday
          ? "holiday"
          : record
          ? record.status
          : isJoined
          ? "absent"
          : "not available",
        checkInTime:
          record && record.checkInTime
            ? moment(record.checkInTime).format("HH:mm:ss")
            : "N/A",
        checkOutTime:
          record && record.checkOutTime
            ? moment(record.checkOutTime).format("HH:mm:ss")
            : "N/A",
      });
    }

    // Set the response headers to indicate a file download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${user.username}_attendance_${
        currentMonth + 1
      }_${currentYear}.xlsx`
    );

    // Write workbook to the response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log(error);
    next(createError(500, error.message));
  }
};



exports.calculateSalary = async (req, res, next) => {
  try {
    const { _id, role } = req.user;
    const { year, month, userId } = req.body;

    const user = await User.findById(userId).select(
      "salary weekLeave joinDate organizationId"
    );
    if (!user) {
      throw new Error("User not found");
    }

    const organization = await Organization.findById(
      user.organizationId
    ).select("holidays weakHoliday");
    if (!organization) {
      throw new Error("Organization not found");
    }

    const currentYear = year ? parseInt(year) : moment().year();
    const currentMonth = month ? parseInt(month) - 1 : moment().month();

    const attendanceRecords = await Attendance.find({
      userId,
      date: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1),
      },
    });

    const daysInMonth = moment({
      year: currentYear,
      month: currentMonth,
    }).daysInMonth();
    const weekLeave = user.weakHoliday;

    let paidDays = 0;
    let halfDays = 0;
    let unpaidDays = 0;

    // Iterate through each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      const dayOfWeek = moment(currentDate).format("dddd");

      // Check if it's a holiday
      const isHoliday = organization.holidays.some((holiday) =>
        moment(currentDate).isBetween(
          holiday.startDate,
          holiday.endDate,
          null,
          "[]"
        )
      );

      // Check if it's a week leave
      const isWeekLeave = dayOfWeek === weekLeave;

      // Find attendance record for the current day
      const record = attendanceRecords.find((attendance) =>
        moment(attendance.date).isSame(currentDate, "day")
      );

      if (!record) {
        if (
          !isHoliday &&
          !isWeekLeave &&
          moment(currentDate).isAfter(user.joinDate)
        ) {
          unpaidDays++;
        }
        continue;
      }

      switch (record.status) {
        case "present":
        case "late":
        case "on_leave":
        case "approved_regularise":
          paidDays++;
          break;
        case "half_day":
          halfDays++;
          break;
        case "absent":
        case "reject_regularise":
        case "pending_regularize":
        case "paid_leave":
          unpaidDays++;
          break;
        default:
          if (!isHoliday && !isWeekLeave) unpaidDays++;
      }
    }

    const totalPaidDays = paidDays + halfDays / 2;
    const workingDaysInMonth =
      daysInMonth - organization.holidays.length - (weekLeave ? 4 : 0);

    const dailySalary = user.salary / workingDaysInMonth;
    const finalSalary = totalPaidDays * dailySalary;

    return res.status(200).json({
      fullSalary: user.salary,
      finalSalary: Math.round(finalSalary),
      paidDays,
      halfDays,
      unpaidDays,
    });
  } catch (error) {
    console.error("Error calculating salary:", error);
    next(createError(500, error.message));
  }
};
