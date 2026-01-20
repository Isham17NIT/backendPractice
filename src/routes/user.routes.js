import { Router } from "express"
import { registerUser, loginUser, logoutUser, refreshAccessToken } from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post( 
    upload.fields([
        { name: "avatar", maxCount: 1 }, { name: "coverImage", maxCount: 1 }
    ]),
    registerUser);

router.route("/login").post(loginUser)

// certain routes to be given to user only when they are logged in ---> secured routes
// login verification can be done by auth middleware

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)

router.route("/refresh-token").post(refreshAccessToken)
      
export default router 