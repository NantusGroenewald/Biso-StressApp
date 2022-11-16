let express = require("express");
const usersRouter = express.Router(); // We only want the routing ferature from express
const User = require("../models/user"); //we need to import the model, sop we can create an instance

// if we are here, it means the requested endpoint is
// localhost:6082/users/add

//Creating one
usersRouter.post("/add", async function (req, res)  {
  
  let user_to_save = new User({
    name: req.body.name, 
    surname: req.body.surname
  });
  
  try {
    await  user_to_save.save(); 
    res.status(201).json(user_to_save);
  } catch (error) {
    res.status(400).json(error.message)
  }
});
