const {
  Organization,
  Payment,
  SubscribedPlan,
  Pricing,
} = require("../models/mainModal");
const { createError, createSucces } = require("../utils/response");

exports.createPayment = async (req, res, next) => {
  try {
    const { organizationId, _id, role } = req.user;

    if (!organizationId || !_id) {
      return next(createError(401, "You are not authorized to create payment"));
    }
    const { amount, paymentStatus, paymentMethod, selectedPlan } = req.body; 

    const plan = await Pricing.findById(selectedPlan);

    if(!plan){
      return next(createError(404, "Plan not found"))
    }

    if (amount < plan.price) {
      return next(createError(401, "Price is low"));
    }

    const payment = await Payment.create({
      amount,
      paymentStatus,
      paymentMethod,
      organizationId,
      created_by: _id,
    });

    if (!payment) {
      return next(createError(402, "Payment Falied please try again"));
    }

    if (!plan) {
      payment.paymentStatus = "failed";
      payment.save();
      return next(createError(404, "No Plan Found"));
    }

    let startDate = new Date();
    let endDate = new Date(
      startDate.getTime() + plan.duration * 24 * 60 * 60 * 1000
    );

    const planActivation = await SubscribedPlan.create({
      organizationId,
      paymentId: payment._id,
      planEndDate: endDate,
      planStartDate: startDate,
      pricingPlan: plan._id,
      planStatus: "active",
    });

    if (!planActivation) {
      payment.paymentStatus = "failed";
      payment.save();
      return next(createError(404, ` Plan Activation failed`));
    }

    const organization = await Organization.findById(organizationId);

    if(!organization){
      return next(createError(404, "Organization not found"))
    }

    if (!organization?.currentActivePlanStartDate) {
      organization.currentActivePlanStartDate = startDate;
    }
    organization.currentActivePlanEndDate =
      organization?.currentActivePlanEndDate
        ? organization?.currentActivePlanEndDate + endDate
        : endDate;
    organization.currentActivePlan = planActivation._id;
    organization.save();

    return createSucces(
      res,
      200,
      "Payment successfull and plan activate for your organisation "
    );
  } catch (error) {
    console.log(error)
    next(createError(403, error));
  }
};
