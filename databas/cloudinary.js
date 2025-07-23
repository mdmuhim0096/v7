const cloudinary  = require("cloudinary").v2;

cloudinary.config({
    cloud_name: "dyu1hv2b8",
    api_key: "264782964426266",
    api_secret: "nOtJJwG06vcGepq7c4j-wLZNrcA",
    secure: true
})

module.exports = cloudinary;