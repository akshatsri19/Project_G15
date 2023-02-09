const express = require("express")
const app = express()

const HTTP_PORT = process.env.HTTP_PORT || 8080

const path = require("path")

const exphbs = require("express-handlebars");
app.engine(".hbs", exphbs.engine({
 extname: ".hbs",
 helpers: {
     json: (context) => { return JSON.stringify(context) }
 }
}));
app.set("view engine", ".hbs");

app.use(express.urlencoded({ extended: true }))


app.get("/", (req,res) => {
    res.render("home", {layout:"skeleton"})
})

app.get("/home", (req,res) => {
    res.render("home", {layout:"skeleton"})
})

app.get("/login", (req,res) => {
    res.render("login", {layout:"skeleton"})
})

app.get("/create", (req,res) => {
    res.render("login", {layout:"skeleton"})
})

app.get("/class",(req,res) => {
    res.render("class", {layout:"skeleton"})
})

app.get("/cart",(req,res) => {
    res.render("cart",{layout:"skeleton"})
})


const onHttpStart = () => {
    console.log("Server started at port 8080")
}
app.listen(HTTP_PORT,onHttpStart)