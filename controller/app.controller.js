const {
  Organization,
  User,
  Attendance,
  Leave,
} = require("../models/mainModal");

const { createError, createSucces } = require("../utils/response");
const moment = require("moment-timezone");

exports.getRequestDetails = async (req, res, next) => {
  try {
    const { _id, organizationId } = req.user;

    const [
      leavesApproved,
      leavesRejected,
      leavesPending,
      regularizationsApproved,
      regularizationsPending,
      regularizationsRejected,
    ] = await Promise.all([
      Leave.find({ userId: _id, status: "approved" }),
      Leave.find({ userId: _id, status: "rejected" }),
      Leave.find({ userId: _id, status: "pending" }),
      Attendance.find({
        userId: _id,
        isRegularized: true,
        regularizeRequest: "approved",
      }),
      Attendance.find({ userId: _id, regularizeRequest: "pending" }),
      Attendance.find({ userId: _id, regularizeRequest: "rejected" }),
    ]);

    const requestData = {
      leavesApproved,
      leavesRejected,
      leavesPending,
      regularizationsApproved,
      regularizationsPending,
      regularizationsRejected,
    };

    return createSucces(
      res,
      200,
      "User details retrieved successfully",
      requestData
    );
  } catch (error) {
    console.log(error);
    next(createError(500, error.message));
  }
};

exports.getUserDetails = async (req, res, next) => {
  try {
    const { _id } = req.user;
    const { month, year } = req.body;

    const user = await User.findById(_id)
      .select(
        "name username organizationId weekLeave allotedLeave salary joinDate leaveTaken workDuration reportingManager"
      )
      .populate("reportingManager", "name")
      .populate("organizationId", "name holidays");

    if (!user) {
      return next(createError(404, "User not found"));
    }

    const currentYear = year
      ? parseInt(year)
      : moment().tz("Asia/Kolkata").year();
    const currentMonth = month
      ? parseInt(month) - 1
      : moment().tz("Asia/Kolkata").month();

    const startOfMonth = moment
      .tz([currentYear, currentMonth, 1], "Asia/Kolkata")
      .startOf("day")
      .toDate();
    const endOfMonth = moment
      .tz([currentYear, currentMonth + 1, 1], "Asia/Kolkata")
      .startOf("day")
      .toDate();
      
    const attendanceRecords = await Attendance.find({
      userId: _id,
      date: {
        $gte: startOfMonth,
        $lt: endOfMonth,
      },
    }).select("date status checkInTime checkOutTime");

    const holidays = user.organizationId.holidays || [];

    const daysInMonth = moment({
      year: currentYear,
      month: currentMonth,
    }).daysInMonth();

    let attendanceData = [];
    let holidayCount = 0;
    let presentCount = 0;
    let absentCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = moment
        .tz([currentYear, currentMonth, day], "Asia/Kolkata")
        .startOf("day");

      const isHoliday = holidays.some(
        (holiday) =>
          currentDate.isSame(
            moment.tz(holiday.startDate, "Asia/Kolkata").startOf("day"),
            "day"
          ) &&
          currentDate.isSame(
            moment.tz(holiday.endDate, "Asia/Kolkata").startOf("day"),
            "day"
          )
      );

      const record = attendanceRecords.find((attendance) =>
        moment(attendance.date).tz("Asia/Kolkata").isSame(currentDate, "day")
      );

      if (isHoliday) {
        holidayCount++;
        attendanceData.push({
          date: currentDate.toDate(),
          status: "holiday",
          checkInTime: null,
          checkOutTime: null,
        });
      } else if (!record) {
        const status = moment(currentDate).isBefore(user.joinDate)
          ? "before_join"
          : moment(currentDate).isSameOrAfter(moment())
          ? "not available"
          : "absent";
        
        attendanceData.push({
          date: currentDate.toDate(),
          status: status,
          checkInTime: null,
          checkOutTime: null,
        });

        // Increment absentCount if the status is 'absent'
        if (status === "absent") absentCount++;
      } else {
        if (record.status === "present") presentCount++;
        if (record.status === "absent") absentCount++;

        attendanceData.push({
          date: record.date,
          status: record.status,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
        });
      }
    }

    createSucces(res, 200, "User details", {
      user,
      attendanceData,
      presentCount,
      absentCount,
      holidayCount,
    });
  } catch (error) {
    console.log(error);
    return next(createError(400, error));
  }
};

