const { User, Payment, Organization , SubscribedPlan  } = require("../../models/mainModal");
const { createError  } = require("../response")

exports.checkPlanValidation = async (req, res, next) => {
  try {
    const { organizationId } = req.user;

    const organisation = await Organization.findById(organizationId).populate("currentActivePlan")

    if (!organisation?.currentActivePlanEndDate) return next(createError(403 , "No active Plan for your organisation"))

    if(organisation.currentActivePlan.planStatus === "active"){
      next()
    }else{
      next(createError(401 , "Your plan is not active please reacharge"))
    }
  } catch (error) {
    console.log(error);

  }
};
