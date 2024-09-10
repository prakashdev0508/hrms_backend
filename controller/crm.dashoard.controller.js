const { Payment, Pricing, User } = require("../models/mainModal");
const { createError, createSucces } = require("../utils/response");

exports.crmDashoardHome = async (req, res) => {
  try {
    const { _id, organizationId, role } = req.user;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortField = req.query.sortField || "name";
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;
    const filter = req.query.filter || {};

    let query = { organizationId: organizationId };

    if (role == "reporting_manager") {
      query.reportingManager = _id;
    }

    if (filter.name) {
      query.name = { $regex: filter.name, $options: "i" };
    }
    if (filter.email) {
      query.email = { $regex: filter.email, $options: "i" };
    }
    if (filter.is_active !== undefined) {
      query.is_active = filter.is_active === "true";
    }

    const users = await User.find(query)
      .select("name username email is_active salary role")
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      usersDetails: {
        page,
        limit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        users,
      },
    });
  } catch (error) {
    console.log("err", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

exports.crmDashoardUser = async (req, res) => {
  try {
    const { _id, organizationId, role } = req.user;

    // Extract pagination, sorting, and filtering parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortField = req.query.sortField || "createdAt";
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;
    const filter = req.query.filter || {};

    // Build query
    let query = { organizationId: organizationId };

    if (role === "reporting_manager") {
      query.reportingManager = _id;
    }

    // Apply filter logic
    if (filter.name) {
      query.name = { $regex: filter.name, $options: "i" };
    }
    if (filter.email) {
      query.email = { $regex: filter.email, $options: "i" };
    }
    if (filter.is_active !== undefined) {
      query.is_active = filter.is_active === "true";
    }

    // Check if sortField is valid, default to "name" otherwise
    const validSortFields = ["name", "email", "createdAt"];
    if (!validSortFields.includes(sortField)) {
      sortField = "name"; // Fallback to default
    }

    const reportingManagerList = await User.find({
      role: { $in: ["super_admin", "reporting_manager"] },
    }).select("name role");

    // Fetch users from database with pagination and sorting
    const users = await User.find(query)
      .select("name username email is_active salary role createdAt")
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      users,
      reportingManagerList,
    });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ message: "Server Error", error });
  }
};
