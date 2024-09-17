const { Leave, Attendance , User } = require("../models/mainModal");
const { createError, createSucces } = require("../utils/response");
const mongoose = require("mongoose");
const moment =  require("moment")

exports.applyLeave = async (req, res, next) => {
    try {
      const { _id, organizationId } = req.user;
      const { leaveType, startDate, endDate, reason } = req.body;

      const user = await User.findById(_id)

      if(moment(startDate).isBefore(moment(user.joinDate))){
        return next(createError(400, "leave date is before of joining"));
      }
  
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
  
      if ( existingAttendance && existingAttendance.isRegularized) {
        return next(createError(400, "Already regularized on this date"));
      }
  
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
      console.log(error)
      next(createError(400, error));
    }
  };
  

  exports.approveLeave = async (req, res, next) => {
    const session = await mongoose.startSession();
  
    try {
      session.startTransaction();
  
      const { _id, organizationId, role } = req.user;
      const { leaveID, status } = req.body;
  
      if (leaveID == "" || status == "") {
        return next(createError(400, `Some data missing`));
      }
  
      const leave = await Leave.findOne({
        _id: leaveID,
        organizationId,
      })
        .populate("userId")
        .session(session);

      const user = await User.findById(leave.userId._id).session(session)
  
      if (!leave) {
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
        return next(createError(401, "You are not authorized to approve this leave"));
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
  
        // Check if attendance already exists for the date
        let existingAttendance = await Attendance.findOne({
          organizationId: leave.organizationId,
          userId: leave.userId._id,
          date: attendanceDate,
        }).session(session);
  
        if (existingAttendance) {
          existingAttendance.status = status == "approved" ? "on_leave" : "paid_leave";
          await existingAttendance.save({ session });
        } else {
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
      }
      if(status == "approved"){
        const newLeaveTakenData = user.leaveTaken  + Number(days)
        user.leaveTaken = newLeaveTakenData
        await user.save()
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
  

exports.getLeaveList = async (req, res, next) => {
  try {
    const { _id, organizationId, role } = req.user;

    // Extract pagination, sorting, and filtering parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortField = req.query.sortField || "createdAt";
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;
    const status = req.query.status || null;

    // Build the base query
    let query = { organizationId };

    // Apply role-specific filters
    if (role == 'reporting_manager') {
      const reportingManagerUserIds = await User.find({ reportingManager: _id }).select('_id');
      query.userId = { $in: reportingManagerUserIds.map(user => user._id) };
    }

    // Apply status filter if provided
    if (status) {
      query.status = status;
    }

    // Fetch leaves with pagination, sorting, and filtering
    const leaves = await Leave.find(query)
      .populate('userId', 'name email') // Populate user information if needed
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    // Count total documents for pagination
    const totalLeaves = await Leave.countDocuments(query);

    // Return the paginated and filtered list
    res.status(200).json({
      page,
      limit,
      totalLeaves,
      totalPages: Math.ceil(totalLeaves / limit),
      leaves,
    });
  } catch (error) {
    console.log(error)
    next(createError(400, error));
  }
}; 