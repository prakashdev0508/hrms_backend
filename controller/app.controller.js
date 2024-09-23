const {
  Organization,
  User,
  Attendance,
  Leave,
} = require("../models/mainModal");

const { createError, createSucces } = require("../utils/response");
const moment = require("moment");

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
    const { _id, organizationId, role } = req.user;
    const { month, year } = req.body;
    
    const user = await User.findById(_id)
      .select(
        "name username organizationId weekLeave allotedLeave salary joinDate leaveTaken workDuration reportingManager"
      )
      .populate("reportingManager", "name")
      .populate("organizationId", "name");

    if (!user) {
      return next(createError(404, "User not found"));
    }

    
    const currentYear = year ? parseInt(year) : moment().year();
    const currentMonth = month ? parseInt(month) - 1 : moment().month();
    const attendanceRecords = await Attendance.find({
      userId: _id,
      date: {
        $gte: new Date(currentYear, currentMonth, 1), 
        $lt: new Date(currentYear, currentMonth + 1, 1), 
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
              status: `${ moment(currentDate).isBefore(user.joinDate) ? "before_join"  : "not available"}`,
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
    

    createSucces(res, 200, "user details", {user , attendanceData});
  } catch (error) {
    console.log(error);
    return next(createError(400, error));
  }
};
