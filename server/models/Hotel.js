const mongoose = require("mongoose");

const hotelSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    name: {
      type: String,
      required: [true, "Hotel name is required"],
      trim: true,
      maxlength: [100, "Name too long"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      index: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [2000, "Description too long"],
    },
    photos: [{ type: String }],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    cheapestPrice: {
      type: Number,
      required: [true, "Price is required"],
      min: [1, "Price must be positive"],
      index: true,
    },
    tag: {
      type: String,
      default: "Luxury",
    },
    category: {
      type: String,
      enum: ["Resort", "Urban", "Heritage", "Eco-Luxury", "Other"],
      default: "Resort",
    },
    amenities: [{ type: String }],
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: populate rooms on demand ────────────────────────────
hotelSchema.virtual("rooms", {
  ref: "Room",
  localField: "_id",
  foreignField: "hotelId",
});

// ── Compound index for filtering ──────────────────────────────────
hotelSchema.index({ city: 1, cheapestPrice: 1, rating: -1 });

module.exports = mongoose.model("Hotel", hotelSchema);
