const jwt = require("jsonwebtoken")
const User = require("../models/User.model")
const { isTokenBlacklisted } = require("../utils/auth")

exports.protect = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1]
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" })
  }

  try {
    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token)
    if (isBlacklisted) {
      return res.status(401).json({ message: "Not authorized, token has been revoked" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id).select("-password")
    next()
  } catch (error) {
    console.error(error)
    res.status(401).json({ message: "Not authorized, token failed" })
  }
}

exports.admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next()
  } else {
    res.status(403).json({ message: "Not authorized as an admin" })
  }
}

exports.affiliate = (req, res, next) => {
  if (req.user && (req.user.role === "affiliate" || req.user.role === "admin")) {
    next()
  } else {
    res.status(403).json({ message: "Not authorized as an affiliate" })
  }
}
