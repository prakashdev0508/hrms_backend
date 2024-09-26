const mongoose = require("mongoose");

// Organization Schema
const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    contactEmail: { type: String, required: true, unique: true },
    contactPhone: { type: String, required: true, unique: true },
    currentActivePlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscribedPlan",
    },
    currentActivePlanStartDate: { type: Date },
    currentActivePlanEndDate: { type: Date },
    is_active: { type: Boolean, default: true },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    onBoardingStatus: {
      type: String,
      enum: ["lead", "pending_details", "panding_payment", "completed"],
    },
    selectedPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PricingPlan",
    },
    firstPayment: { type: Boolean, default: false },
    checkinTime: { type: String },
    checkoutTime: { type: String },
    weakHoliday: {
      type: String,
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },
    holidays: [
      {
        name: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

const Lead = new mongoose.Schema({
  mobileNumber: { type: Number },
  leadStatus: {
    type: String,
    enum: [
      "lead",
      "contacted",
      "intrested",
      "notIntrested",
      "lost",
      "onboarded",
    ],
  },
});

const SubscribedPlan = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    planStartDate: { type: Date, required: true },
    planEndDate: { type: Date, required: true },
    planStatus: { type: String, enum: ["active", "deactivate", "hold"] },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },
    pricingPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PricingPlan",
      required: true,
    },
  },
  { timestamps: true }
);

const PricingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    benefits: { type: Array },
    duration: { type: Number, required: true },
  },
  { timestamps: true }
);

const PaymentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    amount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    activePlanStartDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ["credit_card", "paypal", "bank_transfer", "offline"],
      required: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// User Schema
const UserSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["employee", "super_admin", "reporting_manager"],
      required: true,
    },
    is_active: { type: Boolean, default: true },
    salary: { type: Number },
    joinDate: { type: Date, default: Date.now },
    checkInTime: { type: String },
    checkOutTime: { type: String },
    allotedLeave: { type: Number },
    leaveTaken: { type: Number , default : 0 },
    workDuration: { type: Number },
    reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    weekLeave: {
      type: String,
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },
    passwordChangedAt: Date,
  },
  { timestamps: true }
);

const AttendanceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: [
        "present",
        "absent",
        "late",
        "on_leave",
        "half_day",
        "paid_leave",
        "approved_regularise",
        "reject_regularise",
        "pending_regularize",
        "checked_in",
      ],
    },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    checkInLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    checkOutLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    // Regularization fields
    isRegularized: { type: Boolean, default: false },
    regularizeRequest: {
      type: String,
      enum: ["approved", "pending", "rejected"],
    },
    regularizationReason: { type: String },
    regularizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    regularizedCheckInTime: { type: Date },
    regularizedCheckOutTime: { type: Date },
  },
  { timestamps: true }
);

// Leave Schema
const LeaveSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    leaveType: {
      type: String,
      enum: ["sick", "casual", "paid"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    appliedDate: { type: Date, default: Date.now },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reason: { type: String },
  },
  { timestamps: true }
);

// Salary Schema
const SalarySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    salaryStartDate: { type: Date },
    salaryEndDate: { type: Date },
    salaryAmountPerMonth: { type: Number, required: true },
    bonuses: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
  },
  { timestamps: true }
);

// Report Schema
const ReportSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportType: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },
    date: { type: Date, required: true },
    attendance: { type: [AttendanceSchema], required: true },
    salary: { type: SalarySchema, required: true },
    leaves: { type: [LeaveSchema] },
  },
  { timestamps: true }
);

// Settings Schema
const SettingsSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    leavePolicies: {
      sickLeave: { type: Number, default: 12 },
      casualLeave: { type: Number, default: 12 },
      paidLeave: { type: Number, default: 12 },
    },
    salaryRules: {
      bonusPercentage: { type: Number, default: 10 },
      deductionPercentage: { type: Number, default: 5 },
    },
  },
  { timestamps: true }
);

// Exporting Schemas
module.exports = {
  Organization: mongoose.model("Organization", OrganizationSchema),
  User: mongoose.model("User", UserSchema),
  Attendance: mongoose.model("Attendance", AttendanceSchema),
  Leave: mongoose.model("Leave", LeaveSchema),
  Salary: mongoose.model("Salary", SalarySchema),
  Report: mongoose.model("Report", ReportSchema),
  Settings: mongoose.model("Settings", SettingsSchema),
  Payment: mongoose.model("Payment", PaymentSchema),
  Pricing: mongoose.model("Pricing", PricingSchema),
  SubscribedPlan: mongoose.model("SubscribedPlan", SubscribedPlan),
  Lead: mongoose.model("Lead", Lead),
};
