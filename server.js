const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));

app.use(session({
secret:"casino-secret",
resave:false,
saveUninitialized:true
}));

const db = new sqlite3.Database("./database.db");

/* DATABASE */

db.serialize(()=>{

db.run("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT,password TEXT,balance INTEGER DEFAULT 100,ref TEXT)");
db.run("CREATE TABLE IF NOT EXISTS wins(id INTEGER PRIMARY KEY,userId INTEGER,amount INTEGER)");
db.run("CREATE TABLE IF NOT EXISTS deposits(id INTEGER PRIMARY KEY,userId INTEGER,amount INTEGER,status TEXT)");
db.run("CREATE TABLE IF NOT EXISTS withdraws(id INTEGER PRIMARY KEY,userId INTEGER,amount INTEGER,status TEXT)");

});

/* AUTH */

function userAuth(req,res,next){
if(!req.session.user) return res.redirect("/");
next();
}

/* PAGES */

app.get("/",(req,res)=>res.sendFile(path.join(__dirname,"public/login.html")));
app.get("/dashboard",userAuth,(req,res)=>res.sendFile(path.join(__dirname,"public/dashboard.html")));

/* REGISTER */

app.post("/register",(req,res)=>{

const {username,password,ref}=req.body;

db.run("INSERT INTO users(username,password,ref) VALUES(?,?,?)",[username,password,ref]);

res.redirect("/");

});

/* LOGIN */

app.post("/login",(req,res)=>{

const {username,password}=req.body;

db.get("SELECT * FROM users WHERE username=? AND password=?",[username,password],(err,user)=>{

if(!user) return res.send("Invalid");

req.session.user=user;

res.redirect("/dashboard");

});

});

/* BALANCE */

app.get("/balance",userAuth,(req,res)=>{

db.get("SELECT balance FROM users WHERE id=?",[req.session.user.id],(e,row)=>{

res.json({balance:row.balance});

});

});

/* SPIN SYSTEM */

app.post("/spin",userAuth,(req,res)=>{

const rewards=[0,10,20,50,100,5];

db.get("SELECT balance FROM users WHERE id=?",[req.session.user.id],(e,row)=>{

if(row.balance<10) return res.json({error:"Low balance"});

const win=rewards[Math.floor(Math.random()*rewards.length)];

const newBalance=row.balance-10+win;

db.run("UPDATE users SET balance=? WHERE id=?",[newBalance,req.session.user.id]);

db.run("INSERT INTO wins(userId,amount) VALUES(?,?)",[req.session.user.id,win]);

res.json({win,newBalance});

});

});

/* WIN HISTORY */

app.get("/user-wins",userAuth,(req,res)=>{

db.all("SELECT * FROM wins WHERE userId=? ORDER BY id DESC",[req.session.user.id],(e,rows)=>{

res.json(rows);

});

});

/* ADMIN ANALYTICS */

app.get("/admin-stats",(req,res)=>{

db.get("SELECT COUNT(*) as users FROM users",(e,u)=>{

db.get("SELECT SUM(amount) as totalWins FROM wins",(e2,w)=>{

res.json({users:u.users,totalWins:w.totalWins||0});

});

});

});

const PORT=process.env.PORT||3000;

app.listen(PORT,()=>console.log("Server running "+PORT));
