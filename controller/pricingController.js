const { Pricing } = require("../models/mainModal");
const { createError, createSucces } = require("../utils/response");

exports.createPricing = async (req, res, next) => {
  try {
    const { name, price, description, benefits , slug , duration } = req.body;

    const newPricing = new Pricing({ name, price, description, benefits , slug , duration });
    await newPricing.save();
    
    return createSucces(res, 201, "Pricing Plan Created", newPricing);
  } catch (error) {
    console.log(error)
    if (error.code === 11000) {
      return next(createError(403, "Pricing plan with this name already exists"));
    }
    return next(createError(400, error));
  }
};

exports.getAllPricing = async (req, res, next) => {
  try {
    const pricingPlans = await Pricing.find();
    return createSucces(res, 200, "All Pricing Plans", pricingPlans);
  } catch (error) {
    return next(createError(400, error));
  }
};

exports.getPricingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pricingPlan = await Pricing.findById(id);

    if (!pricingPlan) {
      return next(createError(404, "Pricing Plan not found"));
    }

    return createSucces(res, 200, "Pricing Plan Data", pricingPlan);
  } catch (error) {
    return next(createError(400, error));
  }
};

exports.updatePricing = async (req, res, next) => {
  try {

    const {role } = req.user

    if(role !== "super_admin"){
        return next(createError(401 , "You are not authorized "))
    }

    const { id } = req.params;
    const { name, price, description, benefits } = req.body;

    const updatedPricing = await Pricing.findByIdAndUpdate(
      id,
      { name, price, description, benefits, updated_at: Date.now() },
      { new: true }
    );

    if (!updatedPricing) {
      return next(createError(404, "Pricing Plan not found"));
    }

    return createSucces(res, 200, "Pricing Plan Updated", updatedPricing);
  } catch (error) {
    return next(createError(400, error));
  }
};

exports.deletePricing = async (req, res, next) => {
  try {

    const {role } = req.user

    if(role !== "super_admin"){
        return next(createError(401 , "You are not authorized "))
    }

    const { id } = req.params;

    const deletedPricing = await Pricing.findByIdAndDelete(id);

    if (!deletedPricing) {
      return next(createError(404, "Pricing Plan not found"));
    }

    return createSucces(res, 200, "Pricing Plan Deleted");
  } catch (error) {
    return next(createError(400, error));
  }
};
