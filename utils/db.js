const mongoose = require("mongoose");

exports.connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI); 
    console.log("Connected to database".gray.bold);
  } catch (error) {
    console.log("Not Connected to database ".red.bold + error.message);
  }
};
