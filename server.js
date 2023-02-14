//---------------------------------------------------- IMPORTS ---------------------------------------------------------
const express = require("express")
const app = express()

const HTTP_PORT = process.env.HTTP_PORT || 8080

app.use(express.urlencoded({ extended: true }))

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
    classType: String,
    classLevel: String,
    classInstructor: String,
    classDuration:String
});

const userSchema = new mongoose.Schema({
    firstName: String,
    lastname: String,
    userName: String,
    password: String
});

const cartSchema = new mongoose.Schema({
    classType: String,
    classLevel: String,
    classInstructor: String,
    classDuration:String
});

const Class = mongoose.model('Class', classSchema);
const Users = mongoose.model('Users', userSchema);
const Cart = mongoose.model('Cart', cartSchema)

//--------------------------------------------------- GLOBAL VARIABLES ---------------------------------------------------------------

let validCred = false
let cartEmail = ""
let createAccFlag = false
let createDisplayFlag = false
let userTypeUi = "admin"

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
            return res.send("ERROR: Username or password is incorrect")
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
                req.session.currentUser = "admin"
                if(req.session.currentUser === "admin"){
                res.render("admin",{layout:"skeleton", authCheck:validCred})
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
            password:passwordUi
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
                req.session.currentUser = "admin"
                if(req.session.currentUser === "admin"){
                res.render("admin",{layout:"skeleton", authCheck:validCred})
                }
            }
    } 
    catch (error) 
    {
        console.error(error); 
    }
})

//------------------------------------------------------- CLASSES TO BE DISPLAYED-------------------------------------------------

app.get("/class", async(req,res) => {
    try {
        const classOffered = await Class.find({}).lean();
        res.render("class", {layout:"skeleton", classes:classOffered, authCheck:validCred})
    } 
    catch (error) {
        console.error(error);
    }
    
})

//-------------------------------------------------------- CART ITEMS ----------------------------------------------------------------

app.get("/cart", (req,res) => {
    res.render("cart", {layout:"skeleton", authCheck:validCred})
})

app.post("/cart", async (req,res)=>{
    const classTypeToAddUi = req.body.classTypeToAdd
    const classLevelToAddUi = req.body.classLevelToAdd
    const classInstructorToAddUi = req.body.classInstructorToAdd
    const classDurationToAddUi = req.body.classDurationToAdd
    try{
        if(validCred === true){
            const users = await Users.findOne({userName:cartEmail}).lean()
            const itemsToAdd = new Cart({
                classType:classTypeToAddUi,
                classLevel:classLevelToAddUi,
                classInstructor:classInstructorToAddUi,
                classDuration:classDurationToAddUi
            })
            await itemsToAdd.save()
            const cart = await Cart.find({}).lean()
            res.render("cart", {layout:"skeleton", authCheck:validCred, cartEmailToDisplay: users.userName, cart:cart })
        }
        else{
            res.send("ERROR: You need to login to book a class")
        }
    }
    catch (error) 
    {
        console.error(error);
    }   
})

app.post("/pay", async(req,res) => {
    const idToRemove = req.body.removeCart
    try {
        const users = await Users.findOne({userName:cartEmail}).lean()
        await Cart.findOne({_id:idToRemove}).lean().remove();
        const cart = await Cart.find({}).lean();
        console.log(cart)
        if(cart.length === 0)
        res.render("cart", {layout:"skeleton", cart:cart, cartEmailToDisplay: users.userName , authCheck:validCred, error:"There are no items in your cart"})
        else
        res.render("cart", {layout:"skeleton", cart:cart, cartEmailToDisplay: users.userName , authCheck:validCred , error: ""})
    } 
    catch (error) 
    {
        console.error(error);
    }
})

//----------------------------------------------------------- ADMIN --------------------------------------------------------------------

app.get("/admin",(req,res) => {
    if(validCred === true && userTypeUi === "admin")
    res.render("admin",{layout:"skeleton", authCheck:validCred})
    else
    res.send("ERROR: Only admin user id allowed to view this page")
})

// ------------------------------------------------------------------------------------------------------------------------------------

const onHttpStart = () => {
    console.log("Server started at port 8080")
}
app.listen(HTTP_PORT,onHttpStart)