const {
  Organization,
  User,
  Attendance,
  Leave,
} = require("../models/mainModal");
const { createError, createSucces } = require("../utils/response");

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the earth in meters
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
    
    const newAttendance = new Attendance({
      organizationId,
      userId: _id,
      date,
      checkInTime: Date.now(),
      chcekInlocation: location,
    });

    await newAttendance.save();

    return createSucces(res, 201, "Check-in successful", null);
  } catch (error) {
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
      existingAttendance.status = "early";
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

exports.applyregularize = async (req, res, next) => {
  try {
    const { _id, organizationId } = req.user;
  } catch (error) {}
};
