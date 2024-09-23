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

    const user = await User.findById(_id)
      .select(
        "name username organizationId weekLeave allotedLeave salary joinDate leaveTaken workDuration reportingManager"
      )
      .populate("reportingManager", "name")
      .populate("organizationId", "name");

    if (!user) {
      return next(createError(404, "User not found"));
    }

    createSucces(res, 200, "user details", user);
  } catch (error) {
    console.log(error);
    return next(createError(400, error));
  }
};
