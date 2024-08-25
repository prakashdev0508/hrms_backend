const { Organization, User, Pricing } = require("../models/mainModal");
const { createError, createSucces } = require("../utils/response");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// Create Organization
exports.createOrganization = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      name,
      address,
      contactEmail,
      contactPhone,
      username,
      password,
      selectedPlan,
    } = req.body;

    // Create Organization
    const newOrganization = new Organization({
      name,
      address,
      contactEmail,
      contactPhone,
      onBoardingStatus: "pending_details",
      selectedPlan,
    });

    const plan = await Pricing.findById(selectedPlan);

    if (!plan) {
      return next(createError(404, "Please select a vlaid plan"));
    }

    const organisation = await newOrganization.save({ session });

    if (!organisation) {
      await session.abortTransaction();
      session.endSession();
      return next(
        createError(400, "Organization not created, please try again")
      );
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const hashPassword = bcrypt.hashSync(password, salt);

    // Create User
    const newUser = new User({
      username,
      email: contactEmail,
      password: hashPassword,
      role: "super_admin",
      name,
      organizationId: organisation._id,
    });

    const user = await newUser.save({ session });

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(createError(400, "User not created, please try again"));
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return createSucces(res, 201, "Organization and User Created", {
      organization: organisation._id,
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await session.abortTransaction();
    session.endSession();

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue);
      const message = `${field} already exists.`;
      return next(createError(400, message));
    }
    return next(createError(400, error.message || "An error occurred"));
  }
};

// Get All Organizations
exports.getAllOrganizations = async (req, res, next) => {
  try {
    const organizations = await Organization.find().populate(
      "currentActivePlan"
    );
    return createSucces(res, 200, "All Organizations", organizations);
  } catch (error) {
    return next(createError(400, error));
  }
};

// Get Organization by ID
exports.getOrganizationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organization = await Organization.findById(id).populate(
      "currentActivePlan"
    );

    if (!organization) {
      return next(createError(404, "Organization not found"));
    }

    return createSucces(res, 200, "Organization Data", organization);
  } catch (error) {
    return next(createError(400, error));
  }
};

// Update Organization
exports.updateOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updatedOrganization = await Organization.findByIdAndUpdate(
      id,
      { ...req.body, updated_at: Date.now() },
      { new: true }
    );

    if (!updatedOrganization) {
      return next(createError(404, "Organization not found"));
    }

    return createSucces(res, 200, "Organization Updated", updatedOrganization);
  } catch (error) {
    return next(createError(400, error));
  }
};

// Delete Organization
// Soft Delete Organization (Set is_active to false)
exports.deleteOrganization = async (req, res, next) => {
  try {
    const { _id, organizationId, role } = req.user;

    if (role !== "super_Admin") {
      return next(
        createError(403, "You are not authorized to delete this organization")
      );
    }

    const updatedOrganization = await Organization.findByIdAndUpdate(
      id,
      { is_active: false },
      { new: true }
    );

    if (!updatedOrganization) {
      return next(createError(404, "Organization not found"));
    }

    return createSucces(
      res,
      200,
      "Organization Deactivated",
      updatedOrganization
    );
  } catch (error) {
    return next(createError(400, error));
  }
};
