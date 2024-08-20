const { Leave, Attendance } = require("../models/mainModal");
const { createError, createSucces } = require("../utils/response");
const mongoose = require("mongoose");

exports.applyLeave = async (req, res, next) => {
    try {
      const { _id, organizationId } = req.user;
      const { leaveType, startDate, endDate, reason } = req.body;
  
      if (new Date(endDate) < new Date(startDate)) {
        return next(createError(400, "End date cannot be earlier than start date"));
      }
  
      // Check if there are existing leave applications or attendance records for the requested leave period
      const existingLeave = await Leave.findOne({
        userId: _id,
        organizationId,
        $or: [
          { startDate: { $lte: endDate }, endDate: { $gte: startDate } }, // Overlapping leave dates
        ],
        status: { $in: ["pending", "approved"] },
      });
  
      if (existingLeave) {
        return next(createError(400, "Leave already applied for the selected dates"));
      }
  
      const existingAttendance = await Attendance.findOne({
        userId: _id,
        organizationId,
        date: { $gte: startDate, $lte: endDate },
      });
  
      if (existingAttendance) {
        return next(createError(400, "Attendance already recorded for the selected dates"));
      }
  
      // Create new leave application
      const leave = new Leave({
        organizationId: organizationId,
        userId: _id,
        leaveType: leaveType || "casual",
        reason,
        startDate,
        endDate,
        status: "pending",
      });
  
      const appliedLeave = await leave.save();
  
      if (appliedLeave) {
        return createSucces(res, 200, "Leave applied successfully");
      }
    } catch (error) {
      next(createError(400, error));
    }
  };
  

exports.approveLeave = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { _id, organizationId, role } = req.user;
    const { leaveID, status } = req.body;

    const leave = await Leave.findOne({
      _id: leaveID,
      organizationId,
    })
      .populate("userId")
      .session(session);

      if(!leave){
        return next(createError(400, `Leave not found`));
      }

    if (leave.status == "approved" || leave.status == "rejected") {
      return next(createError(400, `Already ${leave?.status}`));
    }

    if (
      role !== "super_admin" &&
      leave?.userId?.reportingManager?.toString() !== _id.toString()
    ) {
      await session.abortTransaction();
      session.endSession();
      return next(
        createError(401, "You are not authorized to approve this leave")
      );
    }
    if (status !== "approved" && status !== "rejected") {
      await session.abortTransaction();
      session.endSession();
      return next(
        createError(
          400,
          "Invalid status. Only 'approved' or 'rejected' statuses are allowed."
        )
      );
    }
    leave.status = status;
    leave.approvedBy = _id;

    await leave.save({ session });

    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < days; i++) {
      const attendanceDate = new Date(startDate);
      attendanceDate.setDate(startDate.getDate() + i);

      await Attendance.create(
        [
          {
            organizationId: leave.organizationId,
            userId: leave.userId._id,
            date: attendanceDate,
            status: status == "approved" ? "on_leave" : "paid_leave",
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    createSucces(res, 200, `Leave has been ${status}`);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(createError(400, error));
  }
};
