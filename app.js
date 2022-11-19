if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const { MongoClient } = require('mongodb');
let alert = require('alert'); 

const uri = "mongodb+srv://dbUser:dbUserPassword@cluster0.lh84toi.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

const initializePassport = require('./passport-config')
initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
)

app.use(express.static(__dirname + '/public')); 
let users = []; 

app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get('/', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs')
  })
  
  app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('userlogin.ejs')
  })
  
  // app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  //   successRedirect: '/home',
  //   failureRedirect: '/login',
  //   failureFlash: true
  // }))

  let result;
  app.post('/login', checkNotAuthenticated, async (req, res) => {
    result = await mongoLogin(req.body.email).catch(console.error);
    users = result;
    if (result==null) 
    {
      console.log('User does not exist.');
      res.redirect('/login');
    }
    else
    {
        bcrypt.compare(req.body.password, result.password, async function (err, bcryptRes){
        if (bcryptRes) {
          console.log('Login successful.');
          res.render('home.ejs');
        }
        else {
          console.log('Incorrect password.');
          res.redirect('/login');
        }
      });
    }
  })

  app.get('/home', (req, res) => {
    res.render('home.ejs')
  })

  app.get('/activities', (req, res) => {
    res.render('activities.ejs')
  })

  app.get('/details', (req, res) => {
    res.render('details.ejs')
  })
  
  app.get('/useraccount', (req, res) => {
    res.render('useraccount.ejs')
  })

  app.get('/schedule', (req, res) => {
    res.render('schedule.ejs')
  })
  
  app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('userregister.ejs')
  })

  // app.post('/register', checkNotAuthenticated, async (req, res) => {
  //   try {
  //     if (req.body.confirm_password == req.body.password) {
  //       const hashedPassword = await bcrypt.hash(req.body.password, 10)
  //       users.push({
  //         id: Date.now().toString(),
  //         name: req.body.name,
  //         email: req.body.email,
  //         password: hashedPassword,
  //         stress: []
  //       })
  //     } else {
  //       console.log('User could not be registered.');
  //     }
  //     res.redirect('/login')
  //   } catch {
  //     res.redirect('/register')
  //   }
  // })
  
  app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
      if (req.body.password == req.body.confirm_password) {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        if (await mongoAdd(getDateTime(), req.body.username, req.body.age, req.body.email, hashedPassword).catch(console.error)) {
          alert("The email already exists.");
          res.redirect('/register');
        }
        else {
          res.redirect('/login');
          console.log('Success');
        }
      } else {
        console.log('Passwords do not match.');
        res.redirect('/register');
      }
    } catch (error) {
        res.redirect('/register');
    }
  })

  app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/userlogin')
  })
  
  function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    } 
    res.redirect('/login')
  }
  
  function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect('/home')
    }
    next()
  }

  async function mongoAdd(date, name, age, email, password){
    try {
      await client.connect();
      await createUser(client, {
        _id: email,
        date: date,
        name: name,
        age: age,
        password: password,
        stress: [{level: '', date: '', heartRate: 0}],
        activities: {normal: "", medium: "", high: ""}
      });
      return false;
    } catch (e) {
      console.log('Email already registered.');
      return true;
    } finally {
      await client.close();
    }
  }

  // Wait to get user information
  async function mongoLogin(email){
    try {
      await client.connect();
      return await getUser(client, email);
    } catch (e) {
      console.log('User does not exist.');
    } finally {
      await client.close();
    }
  }

  // Method to get the current date and time in the correct format
  function getDateTime(){
    const date = new Date();
    let current_date = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+ date.getDate();
    let current_time = date.getHours()+":"+date.getMinutes()+":"+ date.getSeconds();
    return current_date + " " + current_time;	
  }

  // Add new user to the database
  async function createUser(client, newListing){
    await client.db("BISO_DB").collection("EmployeeStress").insertOne(newListing);
  }

  // Get user data via email
  async function getUser(client, listingId){
    return await client.db("BISO_DB").collection("EmployeeStress").findOne({_id: listingId});
  }

  //Run server on port 3000
  app.listen(3000);

