const express = require("express");
const { connect } = require("./conection");
const User = require("./user");

const app = express();

connect();

app.use(express.json());

/* Crear usuario */
app.post("/users", async (req, res) => {
  try {

    const user = new User(req.body);

    await user.save();

    res.status(201).json(user);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* Obtener usuarios */
app.get("/users", async (req, res) => {
  try {

    const users = await User.find();

    res.json(users);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 User service corriendo en puerto 3000");
});
