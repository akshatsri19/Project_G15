//---------------------------------------------------- IMPORTS ---------------------------------------------------------
const express = require("express")
const app = express()

const HTTP_PORT = process.env.HTTP_PORT || 8080

app.use(express.urlencoded({ extended: true }))

app.use(express.static("assets"));

const exphbs = require("express-handlebars");
app.engine(".hbs", exphbs.engine({
 extname: ".hbs",
 helpers: {
     json: (context) => { return JSON.stringify(context) }
 }
}));
app.set("view engine", ".hbs");

const session = require('express-session')
app.use(session({
   secret: "the quick brown fox jumped over the lazy dog 1234567890",
   resave: false,
   saveUninitialized: true
}))

//------------------------------------------------------------ DATABASE --------------------------------------------------------------------

const mongoose = require('mongoose');
const uri = `mongodb+srv://Akshat1:1234@cluster0.ljtkx3x.mongodb.net/G-15DB`
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("open", () => {
     console.log("Database connection open.");
});

const classSchema = new mongoose.Schema({
    image:String,
    classType: String,
    classLevel: String,
    classInstructor: String,
    classDuration:Number
});

const userSchema = new mongoose.Schema({
    firstName: String,
    lastname: String,
    userName: String,
    password: String,
    member:Boolean
});

const cartSchema = new mongoose.Schema({
    userName:String,
    classType: String,
    classLevel: String,
    classInstructor: String,
    classDuration:Number,
});

const paymentSchema = new mongoose.Schema({
    firstName:String,
    userName:String,
    subTotal:Number,
    tax:Number,
    total:Number,
    date:Date
})

const Class = mongoose.model('Class', classSchema);
const Users = mongoose.model('Users', userSchema);
const Cart = mongoose.model('Cart', cartSchema);
const Payments = mongoose.model('Payments', paymentSchema);

//--------------------------------------------------- GLOBAL VARIABLES ---------------------------------------------------------------

let validCred = false
let cartEmail = ""
let createAccFlag = false
let createDisplayFlag = false
let userTypeUi = "admin"
let paymentsObj = {
    subTotal:0,
    tax:0,
    total:0
}
let verifiedMember = false
var date = new Date();

//--------------------------------------------------------- CONTROLLERS ----------------------------------------------------------------

//----------------------------------------------- AUTHENTICATION AND AUTHRIZARION -------------------------------------------------------

app.get("/", (req,res) => {
     res.render("home", {layout:"skeleton", authCheck:validCred})
})

app.get("/login", async(req,res) => {
     res.render("login", {layout:"skeleton",createAcc:createAccFlag})
})

app.post("/login",async(req,res) => { 
    const userNameUi = req.body.emailId
    const passwordUi = req.body.password
    userTypeUi = req.body.userType
    try {
        const users = await Users.findOne({userName:userNameUi, password:passwordUi}).lean();
        if(users){
            validCred = true
        }
        else{
             res.send("ERROR: Username or password is incorrect")
        }
        if(validCred === true){
            if(userTypeUi === "normal"){
                req.session.currentUser = "normal"
                cartEmail = userNameUi
                const classOffered = await Class.find({}).lean();
                 res.render("class", {layout:"skeleton", classes:classOffered, authCheck:validCred})
            }
            else if(userTypeUi === "admin")
            {
                const payments = await Payments.find({}).lean()
                req.session.currentUser = "admin"
                if(req.session.currentUser === "admin"){
                    const average = await Payments.aggregate([
                        { $group: { _id: null, average_total: { $sum: "$total" } } }
                    ]);
                     res.render("admin",{layout:"skeleton", authCheck:validCred , payments:payments, avg:average})
                }
            }
        }    
    } 
    catch (error){
        console.error(error);
    }
})

app.get("/bye",(req,res) => {
    req.session.destroy()
    validCred = false
     res.render("home",{layout:"skeleton", authCheck:validCred})
})

//---------------------------------------------------------- CREATE ACCOUNT ------------------------------------------------------------

app.get("/createAccount",(req,res) => {
    createAccFlag = true
     res.render("login",{layout:"skeleton", createAcc:createAccFlag})
})

app.post("/create", async (req,res) => {
    const onClickUi = req.body.onClick
    const memberUi = req.body.member
    if(onClickUi==="yes" && memberUi === "on")
    {
        verifiedMember = true
        createDisplayFlag = true
        res.render("login", {layout:"skeleton", createDisplay: createDisplayFlag , createAcc: createAccFlag})
    }
    else if(onClickUi==="yes"){
        createDisplayFlag = true
        res.render("login", {layout:"skeleton", createDisplay: createDisplayFlag , createAcc: createAccFlag})
    }
    else{
        res.render("login", {layout:"skeleton"})
    }
})

app.post("/createAccount",async (req,res) => {
    const firstNameUi = req.body.firstName
    const lastNameUi = req.body.lastName
    const userNameUi = req.body.email
    const passwordUi = req.body.password
    userTypeUi = req.body.userType
    try 
    {
        const addUser = new Users({
            firstName:firstNameUi,
            lastname:lastNameUi,
            userName:userNameUi,
            password:passwordUi,
            member:verifiedMember
        })
        await addUser.save();
        validCred = true;
            if(userTypeUi === "normal"){
                req.session.currentUser = "normal"
                cartEmail = userNameUi
                const classOffered = await Class.find({}).lean();
                 res.render("class", {layout:"skeleton", classes:classOffered, authCheck:validCred})
            }
            else if(userTypeUi === "admin")
            {
                const payments = await Payments.find({}).lean()
                req.session.currentUser = "admin"
                if(req.session.currentUser === "admin"){
                    const average = await Payments.aggregate([
                        { $group: { _id: null, average_total: { $sum: "$total" } } }
                    ]);
                     res.render("admin",{layout:"skeleton", authCheck:validCred , payments:payments, avg:average})
                }
            }
    } 
    catch (error) 
    {
        console.error(error); 
    }
})

//------------------------------------------------------- CLASSES TO BE DISPLAYED AND ADDED-------------------------------------------------

app.get("/class", async(req,res) => {
    try {
        const classOffered = await Class.find({}).lean();
         res.render("class", {layout:"skeleton", classes:classOffered, authCheck:validCred})
    } 
    catch (error) {
        console.error(error);
    }
})

app.post("/class",async(req,res)=>{
    const classTypeToAddUi = req.body.classTypeToAdd
    const classLevelToAddUi = req.body.classLevelToAdd
    const classInstructorToAddUi = req.body.classInstructorToAdd
    const classDurationToAddUi = req.body.classDurationToAdd
    try{
        if(validCred === true){
            const classOffered = await Class.find({}).lean();
            const users = await Users.findOne({userName:cartEmail}).lean()
            const itemsToAdd = new Cart({
                userName:cartEmail,
                classType:classTypeToAddUi,
                classLevel:classLevelToAddUi,
                classInstructor:classInstructorToAddUi,
                classDuration:classDurationToAddUi
            })
            await itemsToAdd.save()
            const cart = await Cart.find({}).lean()
            if(users.member === true){
                paymentsObj.tax = 0.13 * 75
                paymentsObj.total = paymentsObj.tax + 75
            }
            else{
                for(let cartValue of cart){
                    paymentsObj.subTotal += cartValue.classDuration * 0.75;
                }
                paymentsObj.tax = paymentsObj.subTotal * 0.13;
                paymentsObj.total = paymentsObj.subTotal + paymentsObj.tax
            }
             res.render("class", {layout:"skeleton", classes:classOffered, authCheck:validCred})
        }
        else{
             res.send("ERROR: You need to login to book a class")
        }
    }
    catch (error) {
        console.error(error);
    }   
})
//-------------------------------------------------------- CART ITEMS ----------------------------------------------------------------

app.get("/cart",async (req,res) => {
    try {
        const cart = await Cart.find({}).lean()
        const users = await Users.findOne({userName:cartEmail}).lean()
         res.render("cart", {layout:"skeleton", authCheck:validCred, user:users,cart:cart, payments:paymentsObj})
    }
    catch (error) {
         console.error(error);
    }
})

app.get("/sort",async(req,res)=>{
    try {
        const payments = await Payments.find({}).lean().sort({userName:1});
        const average = await Payments.aggregate([
            { $group: { _id: null, average_total: { $sum: "$total" } } }
        ]);
        res.render("admin",{layout:"skeleton", authCheck:validCred , payments:payments, avg:average})
    } 
    catch (error) {
        console.error(error);
    }
})


app.post("/pay", async(req,res) => {    
    const buttonFuncUi = req.body.buttonFunc
    try {
        const users = await Users.findOne({userName:cartEmail}).lean()
        if(validCred === false)
             res.send("ERROR: Login in for booking a class")  
        else{
            if(buttonFuncUi==="proceed"){
                const payments = new Payments({
                    firstName:users.firstName,
                    userName:cartEmail,
                    subTotal:paymentsObj.subTotal,
                    tax:paymentsObj.tax,
                    total:paymentsObj.total,
                    date:date
                })
                await payments.save()
                const cart = await Cart.find({}).lean();
                if(cart.length===0){
                     res.send("ERROR: Please add items in cart to procees")
                }
                const randomNumber = Math.floor(Math.random() * 1000000) + 99999;
                res.render("success",{layout:"skeleton" ,authCheck:validCred, orderNumber:randomNumber})
                paymentsObj.subTotal = 0
                paymentsObj.tax = 0
                paymentsObj.total = 0 
                await Cart.find({}).lean().remove()
            }
            else{
                await Cart.findOne({_id:buttonFuncUi}).lean().remove();
                const cart = await Cart.find({}).lean();
                if(cart.length === 0){
                    paymentsObj.tax = 0
                    paymentsObj.total = 0
                     res.render("cart", {layout:"skeleton", cart:cart, user: users , authCheck:validCred, error:"There are no items in your cart"})
                }
                else{
                    if(users.member === true){
                        paymentsObj.tax = 0.13 * 75
                        paymentsObj.total = paymentsObj.tax + 75
                    }
                    else{
                        for(let cartValue of cart){
                            paymentsObj.subTotal -= cartValue.classDuration * 0.75;
                        }
                        paymentsObj.tax = paymentsObj.subTotal * 0.13;
                        paymentsObj.total = paymentsObj.subTotal + paymentsObj.tax
                    }
                     res.render("cart", {layout:"skeleton", cart:cart, user: users , authCheck:validCred , error: "", payments:paymentsObj})
                }
            }
        }
    } 
    catch (error) {
        console.error(error);
    }
})

//----------------------------------------------------------- ADMIN --------------------------------------------------------------------

app.get("/admin",async(req,res) => {
    if(validCred === true && userTypeUi === "admin"){
        const payments = await Payments.find({}).lean()
        req.session.currentUser = "admin"
        if(req.session.currentUser === "admin"){
            const average = await Payments.aggregate([
                { $group: { _id: null, average_total: { $sum: "$total" } } }
            ]);
            res.render("admin",{layout:"skeleton", authCheck:validCred , payments:payments, avg:average})
        }
    }
    else
     res.send("ERROR: Only admin user is allowed to view this page")
})

// ------------------------------------------------------------------------------------------------------------------------------------

const onHttpStart = () => {
    console.log("Server started at port 8080")
}
app.listen(HTTP_PORT,onHttpStart)