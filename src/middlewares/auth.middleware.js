// this middleware will only verify if user is there or not

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async(req, _, next)=>{
    // req has access of cookies---> which we provided by using cookieParser
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
    
        if(!token){
            throw new ApiError(401, "Unauthorized request")
        }
    
        // now we have to check that the token is correct or not
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if(!user){
            throw new ApiError(401, "Invalid access token")
        }
    
        req.user = user
        next()   
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }     
})