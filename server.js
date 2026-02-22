const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use(session({
  secret: "secretkey",
  resave: false,
  saveUninitialized: true
}));

const db = new sqlite3.Database("./database.db");

/* DATABASE INIT */
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, balance INTEGER DEFAULT 0)");
  db.run("CREATE TABLE IF NOT EXISTS deposits (id INTEGER PRIMARY KEY, userId INTEGER, amount INTEGER, method TEXT, trxId TEXT, status TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS withdraws (id INTEGER PRIMARY KEY, userId INTEGER, amount INTEGER, method TEXT, account TEXT, status TEXT)");
});

/* HEALTH CHECK ROUTE */
app.get("/health", (req,res)=>{
  res.send("OK");
});

/* AUTH */
function auth(req,res,next){
  if(!req.session.user) return res.redirect("/");
  next();
}

/* ROOT */
app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"public/login.html"));
});

/* REGISTER */
app.get("/register",(req,res)=>{
  res.sendFile(path.join(__dirname,"public/register.html"));
});

app.post("/register",(req,res)=>{
  const {username,password}=req.body;

  db.run("INSERT INTO users(username,password) VALUES(?,?)",[username,password],function(err){
    if(err){
      console.log("Register Error:",err);
      return res.send("Error registering user");
    }
    res.redirect("/");
  });
});

/* LOGIN */
app.post("/login",(req,res)=>{
  const {username,password}=req.body;

  db.get("SELECT * FROM users WHERE username=? AND password=?",[username,password],(err,user)=>{
    if(err){
      console.log("Login Error:",err);
      return res.send("Login error");
    }

    if(!user) return res.send("Invalid login");

    req.session.user=user;
    res.redirect("/dashboard");
  });
});

/* DASHBOARD */
app.get("/dashboard",auth,(req,res)=>{
  res.sendFile(path.join(__dirname,"public/dashboard.html"));
});

/* BALANCE */
app.get("/balance",auth,(req,res)=>{
  db.get("SELECT balance FROM users WHERE id=?",[req.session.user.id],(err,row)=>{
    if(err || !row){
      console.log("Balance Error:",err);
      return res.json({balance:0});
    }
    res.json({balance:row.balance});
  });
});

/* GLOBAL ERROR HANDLING */
process.on("uncaughtException",(err)=>{
  console.log("UNCAUGHT ERROR:",err);
});

process.on("unhandledRejection",(err)=>{
  console.log("PROMISE ERROR:",err);
});

/* START SERVER */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
