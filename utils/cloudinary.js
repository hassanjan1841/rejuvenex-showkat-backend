const cloudinary = require("cloudinary").v2
const { deleteFileIfExists } = require("./fileUtils")

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

exports.uploadImage = async (filePath, folder = "rejuvenexx") => {
  try {
    // Check if file exists
    if (!filePath) {
      throw new Error("No file path provided")
    }

    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
    })
    
    // Clean up the temporary file
    deleteFileIfExists(filePath)
    
    return result.secure_url
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    // Clean up the temporary file even if upload fails
    if (filePath) {
      deleteFileIfExists(filePath)
    }
    throw new Error("Image upload failed: " + error.message)
  }
}

exports.deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId)
    return true
  } catch (error) {
    console.error("Cloudinary delete error:", error)
    return false
  }
}
