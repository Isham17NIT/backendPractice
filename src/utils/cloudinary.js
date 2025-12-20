// assuming we already have file uploaded on local server
// if file successfully uploaded on cloudinary, then we can delete that from local server

import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadOnCloudinary = async (localFilePath)=>{
    try{
        if(!localFilePath)
            return null

        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        //file has been uploaded successfully
        console.log("File uploaded on cloudinary ",response.url) //response.url gives public url of the uploaded file
        return response

    } catch(error){
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload opn got failed
        return null
    }
}

export { uploadOnCloudinary }

