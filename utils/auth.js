const jwt = require("jsonwebtoken")
const BlacklistedToken = require("../models/BlacklistedToken.model")

/**
 * Blacklists a JWT token
 * @param {string} token - The JWT token to blacklist
 * @returns {Promise<boolean>} - True if token was blacklisted successfully
 */
exports.blacklistToken = async (token) => {
  try {
    // Get token expiration from the decoded token
    const decoded = jwt.decode(token)
    const expiresAt = new Date(decoded.exp * 1000)
    
    // Add token to blacklist
    await BlacklistedToken.create({
      token,
      expiresAt
    })
    
    return true
  } catch (error) {
    console.error("Token blacklisting error:", error)
    return false
  }
}

/**
 * Checks if a token is blacklisted
 * @param {string} token - The JWT token to check
 * @returns {Promise<boolean>} - True if token is blacklisted
 */
exports.isTokenBlacklisted = async (token) => {
  try {
    const blacklistedToken = await BlacklistedToken.findOne({ token })
    return !!blacklistedToken
  } catch (error) {
    console.error("Token blacklist check error:", error)
    return false
  }
} 