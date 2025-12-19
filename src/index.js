import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"

dotenv.config({
    path:'./env'
})

connectDB() // an async func returns a promise
.then(()=>{
    app.on("error", (error)=>{
        console.log("Error: ", error)
        throw error
    })
    app.listen(process.env.PORT, ()=>{
        console.log(`Server running on port: ${process.env.PORT}`)
    })
})
.catch((error)=>{
    console.log("MongoDB connection failed!!", error)
})


// import express from "express"
// const app=express()

// ( async ()=>{
//     try{    
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error",(error)=>{
//             console.log("error : ",error)
//             throw error
//         })
//         app.listen(process.env.PORT, ()=>{
//             console.log(`App is listening on port ${process.env.PORT}`)
//         })

//     } catch(error){
//         console.log(error)
//         throw error
//     }
// })()
