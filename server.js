const express = require("express"); const bodyParser = require("body-parser"); const session = require("express-session"); const path = require("path");
const app = express();
app.use(bodyParser.urlencoded({ extended: true })); app.use(express.static("public"));
app.use(session({ secret: "secretkey", resave: false, saveUninitialized: true }));
let users = [];
function auth(req, res, next) { if (!req.session.user) return res.redirect("/"); next(); }
app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "public/login.html")); });
app.get("/register", (req, res) => { res.sendFile(path.join(__dirname, "public/register.html")); });
app.post("/register", (req, res) => { const { username, password } = req.body; users.push({ username, password, balance: 0 }); res.redirect("/"); });
app.post("/login", (req, res) => { const { username, password } = req.body; const user = users.find(u => u.username === username && u.password === password); if (!user) return res.send("Invalid credentials"); req.session.user = user; res.redirect("/dashboard"); });
app.get("/dashboard", auth, (req, res) => { res.sendFile(path.join(__dirname, "public/dashboard.html")); });
app.post("/deposit", auth, (req, res) => { req.session.user.balance += Number(req.body.amount); res.redirect("/dashboard"); });
app.post("/withdraw", auth, (req, res) => { req.session.user.balance -= Number(req.body.amount); res.redirect("/dashboard"); });
app.get("/balance", auth, (req, res) => { res.json({ balance: req.session.user.balance }); });
app.listen(3000, () => console.log("App running"));
