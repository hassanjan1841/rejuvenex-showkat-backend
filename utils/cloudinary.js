const cloudinary = require("cloudinary").v2

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

exports.uploadImage = async (filePath, folder = "rejuvenexx") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
    })
    return result.secure_url
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    throw new Error("Image upload failed")
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
