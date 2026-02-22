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

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, balance INTEGER DEFAULT 0)");
  db.run("CREATE TABLE IF NOT EXISTS deposits (id INTEGER PRIMARY KEY, userId INTEGER, amount INTEGER, method TEXT, trxId TEXT, status TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS withdraws (id INTEGER PRIMARY KEY, userId INTEGER, amount INTEGER, method TEXT, account TEXT, status TEXT)");
});

function auth(req,res,next){
  if(!req.session.user) return res.redirect("/");
  next();
}

app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"public/login.html"));
});

app.get("/register",(req,res)=>{
  res.sendFile(path.join(__dirname,"public/register.html"));
});

app.post("/register",(req,res)=>{
  const {username,password}=req.body;
  db.run("INSERT INTO users(username,password) VALUES(?,?)",[username,password]);
  res.redirect("/");
});

app.post("/login",(req,res)=>{
  const {username,password}=req.body;
  db.get("SELECT * FROM users WHERE username=? AND password=?",[username,password],(err,user)=>{
    if(!user) return res.send("Invalid login");
    req.session.user=user;
    res.redirect("/dashboard");
  });
});

app.get("/dashboard",auth,(req,res)=>{
  res.sendFile(path.join(__dirname,"public/dashboard.html"));
});

app.get("/balance",auth,(req,res)=>{
  db.get("SELECT balance FROM users WHERE id=?",[req.session.user.id],(err,row)=>{
    res.json({balance:row.balance});
  });
});

app.post("/deposit",auth,(req,res)=>{
  const {amount,method,trxId}=req.body;
  db.run("INSERT INTO deposits(userId,amount,method,trxId,status) VALUES(?,?,?,?,?)",
  [req.session.user.id,amount,method,trxId,"pending"]);
  res.json({message:"Deposit request submitted"});
});

app.post("/withdraw",auth,(req,res)=>{
  const {amount,method,account}=req.body;
  db.run("INSERT INTO withdraws(userId,amount,method,account,status) VALUES(?,?,?,?,?)",
  [req.session.user.id,amount,method,account,"pending"]);
  res.json({message:"Withdraw request submitted"});
});

app.listen(3000,()=>console.log("App running"));
/* ADMIN LOGIN */

app.get("/admin",(req,res)=>{
res.sendFile(path.join(__dirname,"public/admin-login.html"));
});

app.post("/admin-login",(req,res)=>{

const {username,password}=req.body;

if(username==="admin" && password==="admin123"){
req.session.admin=true;
res.redirect("/admin-dashboard");
}else{
res.send("Wrong admin login");
}

});

function adminAuth(req,res,next){
if(!req.session.admin) return res.redirect("/admin");
next();
}

app.get("/admin-dashboard",adminAuth,(req,res)=>{
res.sendFile(path.join(__dirname,"public/admin.html"));
});

/* GET ALL DEPOSITS */

app.get("/admin/deposits",adminAuth,(req,res)=>{
db.all("SELECT * FROM deposits WHERE status='pending'",(err,rows)=>{
res.json(rows);
});
});

/* APPROVE DEPOSIT */

app.post("/admin/approve-deposit",adminAuth,(req,res)=>{

const {id,userId,amount}=req.body;

db.run("UPDATE deposits SET status='approved' WHERE id=?",[id]);

db.run("UPDATE users SET balance = balance + ? WHERE id=?",[amount,userId]);

res.json({success:true});

});

/* GET WITHDRAWS */

app.get("/admin/withdraws",adminAuth,(req,res)=>{
db.all("SELECT * FROM withdraws WHERE status='pending'",(err,rows)=>{
res.json(rows);
});
});

/* APPROVE WITHDRAW */

app.post("/admin/approve-withdraw",adminAuth,(req,res)=>{

const {id}=req.body;

db.run("UPDATE withdraws SET status='approved' WHERE id=?",[id]);

res.json({success:true});

});
