const {
  Organization,
  Payment,
  SubscribedPlan,
  Pricing,
} = require("../models/mainModal");
const { createError, createSucces } = require("../utils/response");

exports.createPayment = async (req, res, next) => {
  try {
    const { amount, paymentStatus, paymentMethod, selectedPlan, organizationId } = req.body; 

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
    });

    if (!payment) {
      return next(createError(402, "Payment Falied please try again"));
    }

    let startDate = new Date();
    let endDate = new Date(startDate.getTime() + plan.duration * 24 * 60 * 60 * 1000); // Correct calculation

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
      await payment.save();
      return next(createError(404, ` Plan Activation failed`));
    }

    const organization = await Organization.findById(organizationId);

    if(!organization){
      return next(createError(404, "Organization not found"));
    }

    if(organization.firstPayment && plan.slug == "free_plan"){
      return next(createError(400 , "Please select a paid plan"));
    }

    if (!organization?.currentActivePlanStartDate) {
      organization.currentActivePlanStartDate = startDate;
    } 

    // Ensure currentActivePlanEndDate is calculated properly and added correctly
    organization.currentActivePlanEndDate = organization?.currentActivePlanEndDate 
      ? new Date(organization?.currentActivePlanEndDate.getTime() + plan.duration * 24 * 60 * 60 * 1000)
      : endDate;

    organization.currentActivePlan = planActivation._id;
    organization.onBoardingStatus = "completed";
    organization.firstPayment = organization.firstPayment === false ? true : organization.firstPayment;
    
    await organization.save();

    return createSucces(
      res,
      200,
      "Payment successful and plan activated for your organization"
    );
  } catch (error) {
    console.log(error);
    next(createError(403, error.message));
  }
};

