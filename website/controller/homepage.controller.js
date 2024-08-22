const { Pricing } = require("../../models/mainModal");
const { createSucces, createError } = require("../../utils/response");

exports.homePageData = async (req, res, next) => {
  try {
    const pricing = await Pricing.find();

    return createSucces(res, 200 ,"Home Page data", {
      pricingData: pricing,
    });
  } catch (error) {
    console.log("errr" , error)
    next(createError(400, "Error fetching data"));
  }
};