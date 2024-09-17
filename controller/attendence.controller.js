const {
  Organization,
  User,
  Attendance,
  Leave,
} = require("../models/mainModal");
const { createError, createSucces } = require("../utils/response");
const moment = require("moment")

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in meters
  return distance;
}

exports.checkInAttendance = async (req, res, next) => {
  try {
    const { _id, organizationId } = req.user;
    const { date, location } = req.body;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const existingAttendance = await Attendance.findOne({
      organizationId,
      userId: _id,
      date: {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lt: new Date(date).setHours(23, 59, 59, 999),
      },
      checkInTime: { $exists: true },
    });

    const existingLeaveAttendance = await Attendance.findOne({
      organizationId,
      userId: _id,
      date: {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lt: new Date(date).setHours(23, 59, 59, 999),
      },
      checkInTime: { $exists: false },
    });

    if (existingAttendance) {
      return next(createError(400, "You have already checked in today"));
    }

    const { latitude: orgLat, longitude: orgLon } = organization.location;
    const userLat = location.latitude;
    const userLon = location.longitude;

    const distance = getDistanceFromLatLonInMeters(
      orgLat,
      orgLon,
      userLat,
      userLon
    );

    if (distance > 100) {
      return next(
        createError(400, "Check-in location is not within the allowed range")
      );
    } 

    
    if(existingLeaveAttendance){
      existingLeaveAttendance.checkInLocation = location
      existingLeaveAttendance.checkInTime = Date.now()
      existingLeaveAttendance.status = "checked_in"
      await existingLeaveAttendance.save()
      return createSucces(res, 201, "Check-in successful on leave date ", null);
    }

    const newAttendance = new Attendance({
      organizationId,
      userId: _id,
      date,
      checkInTime: Date.now(),
      chcekInlocation: location,
      status: "checked_in",
    });

    await newAttendance.save();

    return createSucces(res, 201, "Check-in successful", null);
  } catch (error) {
    console.log(error)
    return next(createError(400, error));
  }
};

exports.checkOutAttendance = async (req, res, next) => {
  try {
    const { _id, organizationId } = req.user;
    const { date, location } = req.body;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return next(createError(404, "Organization not found"));
    }

    const existingAttendance = await Attendance.findOne({
      organizationId,
      userId: _id,
      date: {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lt: new Date(date).setHours(23, 59, 59, 999),
      },
      checkInTime: { $exists: true },
      checkOutTime: { $exists: false },
    });

    if (!existingAttendance) {
      return next(
        createError(400, "You have not checked in or already checked out today")
      );
    }

    const { latitude: orgLat, longitude: orgLon } = organization.location;
    const userLat = location.latitude;
    const userLon = location.longitude;

    const distance = getDistanceFromLatLonInMeters(
      orgLat,
      orgLon,
      userLat,
      userLon
    );

    if (distance > 100) {
      return next(
        createError(400, "Check-in location is not within the allowed range")
      );
    }

    existingAttendance.checkOutTime = Date.now();
    existingAttendance.checkOutlocation = location;

    const user = await User.findById(_id);

    if (!user) {
      return next(createError(404, "User Not Found"));
    }

    const workDuration =
      (existingAttendance.checkOutTime - existingAttendance.checkInTime) /
      (1000 * 60 * 60); // Calculate work duration in hours
    existingAttendance.workDuration = workDuration;

    if (workDuration < user?.workDuration) {
      existingAttendance.status = "half_day";
    } else {
      existingAttendance.status = "present";
    }

    await existingAttendance.save();

    return createSucces(res, 201, "Check-out successful", null);
  } catch (error) {
    return next(createError(400, error));
  }
};

exports.getMonthlyAttendanceDetails = async (req, res, next) => {
  try {
    const { _id, organizationId } = req.user;
    const { month, year } = req.body;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch attendance records for the given user and date range
    const attendanceRecords = await Attendance.find({
      organizationId,
      userId: _id,
      date: { $gte: startDate, $lte: endDate },
    });

    // Fetch leave records for the given user and date range
    const leaveRecords = await Leave.find({
      organizationId,
      userId: _id,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
      status: "approved",
    });

    // Initialize totals
    let totalDays = 0;
    let totalHours = 0;
    let leaveDays = 0;

    // Process attendance records
    const dailyRecords = attendanceRecords.map((record) => {
      totalDays += 1; // Each attendance record represents a day
      if (record.checkInTime && record.checkOutTime) {
        totalHours += record.checkOutTime - record.checkInTime;
      }

      return {
        date: record.date.toISOString().split("T")[0], // Format date as YYYY-MM-DD
        checkInTime: record.checkInTime
          ? new Date(record.checkInTime).toISOString()
          : null,
        checkOutTime: record.checkOutTime
          ? new Date(record.checkOutTime).toISOString()
          : null,
        status: record.status || null,
      };
    });

    // Process leave records
    leaveRecords.forEach((leave) => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);

      // Calculate leave days within the specified month
      for (
        let day = new Date(leaveStart);
        day <= leaveEnd;
        day.setDate(day.getDate() + 1)
      ) {
        if (day >= startDate && day <= endDate) {
          leaveDays += 1;
          totalDays += 1; // Each leave day represents a day
          // dailyRecords.push({
          //   date: day.toISOString().split("T")[0],
          //   checkInTime: null,
          //   checkOutTime: null,
          //   status: "on_leave",
          // });
        }
      }
    });

    // Convert total hours from milliseconds to hours
    const totalHoursInHours = totalHours / (1000 * 60 * 60);

    // Sort records by date
    dailyRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.status(200).json({
      message: "Monthly attendance details",
      data: {
        totalDays,
        totalHours: totalHoursInHours,
        leaveDays,
        dailyRecords,
      },
    });
  } catch (error) {
    console.error("Error fetching monthly attendance details:", error);
    return next(createError(400, error));
  }
};

// Apply for regularization
exports.applyRegularization = async (req, res, next) => {
  try {
    const { _id, organizationId } = req.user;
    const { date, reason, checkInTime, checkOutTime } = req.body;

    const user = await User.findById(_id)

    if(moment(date).isAfter(moment())){
      return next(createError(400, "You cannot apply regularization request for a future date"));
    }

    if(moment(date).isBefore(moment(user?.joinDate))){
      return next(createError(400, "You cannot apply regularization request before joining date"));
    }


    let attendance = await Attendance.findOne({
      organizationId,
      userId: _id,
      date: {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lt: new Date(date).setHours(23, 59, 59, 999),
      },
    });

    let leaveDetail = await Leave.findOne({
      organizationId,
      userId: _id,
      startDate: { $lte: date },
      endDate: { $gte: date },
      status: { $in: ["pending", "approved"] },
    });
  

    if(leaveDetail){
      return next(createError(400 , "Leave applied on this date"))
    }

    // If attendance data exists for the day, update it
    if (attendance) {
      if (attendance.isRegularized) {
        return next(createError(400, "Attendance is already regularized"));
      }

      // Update the existing attendance record
      attendance.regularizedCheckInTime = checkInTime || attendance.checkInTime;
      attendance.regularizedCheckOutTime = checkOutTime || attendance.checkOutTime;
      attendance.status = "pending_regularize"; // Set status to pending regularization
      attendance.regularizationReason = reason || "";
      attendance.regularizeRequest = "pending"

      await attendance.save();
      return createSucces(
        res,
        200,
        "Attendance record updated and regularization request submitted",
        null
      );
    }

    // If no attendance data exists, create a new attendance record
    attendance = new Attendance({
      organizationId,
      userId: _id,
      date,
      checkInTime: checkInTime || null, // Use provided check-in time or null
      checkOutTime: checkOutTime || null, // Use provided check-out time or null
      status: "pending_regularize", // Set status to pending regularization
      isRegularized: true,
      regularizationReason: reason,
      regularizeRequest : "pending"
    });

    await attendance.save();
    return createSucces(
      res,
      201,
      "New attendance record created and regularization request submitted",
      null
    );
  } catch (error) {
    return next(createError(400, error));
  }
};

// Approve regularization
// Approve regularization
exports.approveRegularization = async (req, res, next) => {
  try {
    const { attendanceId, status } = req.body;
    const { _id: adminId, role } = req.user;

    // Find the attendance record
    const attendance = await Attendance.findById(attendanceId).populate(
      "userId",
      "reportingManager"
    );

    if (!attendance || attendance.status !== "pending_regularize") {
      return next(createError(404, "Pending regularization not found"));
    }
    const user = await User.findById(attendance.userId);
    if (
      role !== "super_admin" &&
      user.reportingManager.toString() !== adminId.toString()
    ) {
      return next(
        createError(
          403,
          "You are not authorized to approve this regularization request"
        )
      );
    }

    if(status == "approved_regularise"){
      attendance.checkInTime = attendance.regularizedCheckInTime
      attendance.checkOutTime = attendance.regularizedCheckOutTime
      attendance.isRegularized = true;
      attendance.regularizeRequest = "approved"
    }else{
      attendance.regularizeRequest = "rejected"
    }
    // Update attendance status and save
    attendance.status = status
    attendance.regularizedBy = adminId;

    await attendance.save();

    return createSucces(res, 200, "Regularization approved", null);
  } catch (error) {
    return next(createError(400, error));
  }
};

exports.getRegularizedAttendanceList = async (req, res, next) => {
  try {
    const { _id, organizationId, role } = req.user;

    // Extract pagination, sorting, and filtering parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortField = req.query.sortField || "createdAt";
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;
    const status = req.query.status || null;

    // Build the base query for regularized attendance
    let query = { organizationId, isRegularized: true };

    // Apply role-specific filters
    if (role === "reporting_manager") {
      const reportingManagerUserIds = await User.find({
        reportingManager: _id,
      }).select("_id");
      query.userId = { $in: reportingManagerUserIds.map((user) => user._id) };
    }

    // Apply status filter if provided
    if (status) {
      query.status = status;
    }

    // Fetch regularized attendance records with pagination, sorting, and filtering
    const regularizedAttendances = await Attendance.find(query)
      .populate("userId", "name email") // Populate user information if needed
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    // Count total documents for pagination
    const totalRegularizedAttendances = await Attendance.countDocuments(query);

    // Return the paginated and filtered list
    res.status(200).json({
      page,
      limit,
      totalRegularizedAttendances,
      totalPages: Math.ceil(totalRegularizedAttendances / limit),
      regularizedAttendances,
    });
  } catch (error) {
    console.log(error);
    next(createError(400, error));
  }
};
