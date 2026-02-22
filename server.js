const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
  secret: "casino-secret",
  resave: false,
  saveUninitialized: true
}));

const db = new sqlite3.Database("./database.db");

db.serialize(() => {

  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, balance INTEGER DEFAULT 100)");

  db.run("CREATE TABLE IF NOT EXISTS wins (id INTEGER PRIMARY KEY, userId INTEGER, amount INTEGER)");

  db.run("CREATE TABLE IF NOT EXISTS deposits (id INTEGER PRIMARY KEY, userId INTEGER, amount INTEGER, status TEXT)");

  db.run("CREATE TABLE IF NOT EXISTS withdraws (id INTEGER PRIMARY KEY, userId INTEGER, amount INTEGER, status TEXT)");

});

function userAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/");
  next();
}
app.get("/admin",(req,res)=>{
res.sendFile(path.join(__dirname,"public/admin.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public/register.html"));
});

app.get("/dashboard", userAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public/dashboard.html"));
});

app.post("/register", (req, res) => {

  const { username, password } = req.body;

  db.run(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, password],
    function (err) {
      if (err) return res.send("User already exists");
      res.redirect("/");
    }
  );

});

app.post("/login", (req, res) => {

  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (err, user) => {

      if (!user) return res.send("Invalid login");

      req.session.user = user;
      res.redirect("/dashboard");
    }
  );

});

app.get("/balance", userAuth, (req, res) => {

  db.get(
    "SELECT balance FROM users WHERE id=?",
    [req.session.user.id],
    (err, row) => {
      res.json({ balance: row.balance });
    }
  );

});

app.post("/spin", userAuth, (req, res) => {

  const rewards = [0, 10, 20, 50, 100, 5];

  db.get(
    "SELECT balance FROM users WHERE id=?",
    [req.session.user.id],
    (err, row) => {

      if (row.balance < 10) {
        return res.json({ error: "Low balance" });
      }

      const win = rewards[Math.floor(Math.random() * rewards.length)];
      const newBalance = row.balance - 10 + win;

      db.run("UPDATE users SET balance=? WHERE id=?", [newBalance, req.session.user.id]);
      db.run("INSERT INTO wins(userId, amount) VALUES (?, ?)", [req.session.user.id, win]);

      res.json({ win, newBalance });

    }
  );

});

app.get("/user-wins", userAuth, (req, res) => {
  db.all("SELECT * FROM wins WHERE userId=? ORDER BY id DESC",
    [req.session.user.id],
    (err, rows) => {
      res.json(rows);
    }
  );
});

app.post("/deposit", userAuth, (req, res) => {

  const { amount } = req.body;

  if (!amount) {
    return res.json({ message: "Enter amount", type: "error" });
  }

  db.run(
    "INSERT INTO deposits(userId, amount, status) VALUES (?, ?, ?)",
    [req.session.user.id, amount, "pending"],
    function (err) {
      if (err) return res.json({ message: "Deposit failed", type: "error" });
      res.json({ message: "Deposit submitted. Pending approval.", type: "success" });
    }
  );

});

app.get("/user-deposits", userAuth, (req, res) => {
  db.all("SELECT * FROM deposits WHERE userId=? ORDER BY id DESC",
    [req.session.user.id],
    (err, rows) => {
      res.json(rows);
    }
  );
});

app.post("/withdraw", userAuth, (req, res) => {

  const { amount } = req.body;

  db.get("SELECT balance FROM users WHERE id=?",
    [req.session.user.id],
    (err, row) => {

      if (row.balance < amount) {
        return res.json({ message: "Insufficient balance", type: "error" });
      }

      db.run(
        "INSERT INTO withdraws(userId, amount, status) VALUES (?, ?, ?)",
        [req.session.user.id, amount, "pending"],
        function (err) {
          if (err) return res.json({ message: "Withdraw failed", type: "error" });
          res.json({ message: "Withdraw request submitted.", type: "success" });
        }
      );

    }
  );

});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
