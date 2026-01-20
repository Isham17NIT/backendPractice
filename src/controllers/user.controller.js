import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import validator from "validator" 
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { response } from "express";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId)=>{
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken() // method in userSchema
        const refreshToken = user.generateRefreshToken() // method in userSchema

        user.refreshToken = refreshToken // add refresh token to database
        await user.save({ validateBeforeSave: false }) // don't apply any validation--> directly go and save
        // this is because when we call the save method then other required fields get kicked up since we haven't passed data for other fields

        return { accessToken, refreshToken }

    } catch(err){
        throw new ApiError(500, "something went wrong while generating refresh and access tokens")
    }
}

const registerUser = asyncHandler( async(req, res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists: using username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // check for user creation --- null response or the user is actually created ??
    // remove password and refresh token field from response
    // return res

    // console.log("body:", req.body);
    // console.log("files:", req.files);

    let { email, password, fullname, username } = req.body || {}
    console.log("email: ", email);
    
    if ([fullname, email, username, password].some(v => !v || v.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    if(!validator.isEmail(email))
    {
        throw new ApiError(400, "Invalid email entered")
    }

    username = username.toLowerCase()

    const existingUser = await User.findOne({
        $or: [{ email }, { username }]
    })

    if(existingUser)
        throw new ApiError(409, "User with email or username already exists")

    // we get the access of req.files when we use multer as middleware
    // req.files?.avatar[0]?.path  ----> local file path

    const avatarLocalPath = req.files?.avatar[0]?.path

    if(!avatarLocalPath)
        throw new ApiError(400, "Avatar file is required")
    
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar)
        throw new ApiError(400, "Avatar file is required")

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        username,
        email,
        password
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" // deselect this
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler( async(req, res)=>{
    // req body
    // username or email exists (one of these)
    // find the user
    // password check  ---> wrong password
    // access token and refresh token generation
    // send these tokens in secure cookies
    // send a response that login is successful

    let {email, username, password} = req.body || {}
    if(!username && !email)
        throw new ApiError(400, "Username and email both cannot be empty")

    if (!password || password.trim() === "") {
        throw new ApiError(400, "Password is required");
    }

    if (username && username.trim() === "") {
        throw new ApiError(400, "Username cannot be empty");
    }
    if (email && email.trim() === "") {
        throw new ApiError(400, "Email cannot be empty");
    }

    // if ([email, username, password].some(v => !v || v.trim() === "")) {
    //     throw new ApiError(400, "All fields are required");
    // }

    const user = await User.findOne({
        $or: [{username}, {email}] // value found is based on either username or email
    })

    if(!user){
        throw new ApiError(404, "User doesn't exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    //sending cookies---> we have to define certain options
    // by default cookies can be modified by anyone on the frontend
    const options = {
        httpOnly: true, // make the cookie not accessible from JS in the browser-->so document.cookie can't read it
        secure: true // cookie will only be sent over https connections
    }
    // now these cookies are only modifiable by server

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {
        user: loggedInUser,
        accessToken,
        refreshToken
    },"User logged in successfully"))
})

const logoutUser = asyncHandler(async(req, res)=>{
    // now how to get access of the user which has to be logged out
    await User.findByIdAndUpdate(req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new : true // means return the updated document
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken)
        throw new ApiError(401, "unauthorized request")

    // now we have to verify the incoming token
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id)
    
        if(!user)
            throw new ApiError(401, "invalid refresh token")
    
        if(user.refreshToken !== incomingRefreshToken)
            throw new ApiError(401, "Refresh token is expired or used")
    
        // if now the refreshTokens have matched, we will generate new Access and refreshTokens
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res.status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, newRefreshToken} ,
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }
})


export { registerUser, loginUser, logoutUser, refreshAccessToken }