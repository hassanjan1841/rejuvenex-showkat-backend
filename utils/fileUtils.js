const fs = require('fs');
const path = require('path');

/**
 * Ensures that a directory exists, creating it if necessary
 * @param {string} dirPath - Path to the directory
 * @returns {boolean} - True if directory exists or was created, false otherwise
 */
exports.ensureDirectoryExists = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    return false;
  }
};

/**
 * Deletes a file if it exists
 * @param {string} filePath - Path to the file
 * @returns {boolean} - True if file was deleted or didn't exist, false if there was an error
 */
exports.deleteFileIfExists = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
}; 