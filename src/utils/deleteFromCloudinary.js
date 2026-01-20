import { v2 as cloudinary } from "cloudinary"

import { ApiError } from "./ApiError"
import { ApiResponse } from "./ApiResponse"
import { extractPublicId } from "cloudinary-build-url"

export const deleteFromCloudinaryByUrl = async(url, resourceType="image")=>{
    try {

        if(!url || typeof url !== "string" || url.trim()==="")
            throw new ApiError(400, "Invalid/empty Cloudinary URL sent")

        const publicId = extractPublicId(url) 

        if(!publicId)
            throw new ApiError(400, "Could't extract public id from cloudinary")
    
        const result = await cloudinary.uploader.destroy(publicId,{
            resource_type: resourceType,
            invalidate: true // this clears CDN cache
        })
    
        if(result?.result !== "ok"){
            if (result?.result === "not found") 
                throw new ApiError(404, "Old avatar not found on Cloudinary (already deleted or wrong publicId)");
    
            // external service failure
            throw new ApiError(502, "Cloudinary delete failed")
        }
    
        return new ApiResponse(200, {}, "Old resource deleted successfully")

    } catch (error) {
        throw new ApiError(error?.statusCode || 500, error?.message || "Sth went wrong while deleting from Cloudinary")
    }
}