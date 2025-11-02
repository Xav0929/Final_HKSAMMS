const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    console.error("No token provided in Authorization header");
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded);
    const userId = decoded._id || decoded.id; // Support both _id and id
    if (!userId) {
      console.error("JWT payload missing _id or id:", decoded);
      return res.status(401).json({ message: "Invalid token payload" });
    }
    req.user = { _id: userId };
    console.log("Set req.user:", req.user);
    next();
  } catch (err) {
    console.error("Token error:", err.message);
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;