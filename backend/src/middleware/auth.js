import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Protect route (check JWT)
const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({ success: false, message: "User not found" });
      }

      if (user.status === "inactive") {
        return res.status(403).json({ success: false, message: "User account is suspended" });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token" });
  }
};

// Restrict access by role (Admin always has full access)
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || (!roles.includes(req.user.role) && req.user.role !== "Admin")) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user ? req.user.role : "Guest"}) is not allowed to access this resource`,
      });
    }
    next();
  };
};

export { protect, restrictTo };
