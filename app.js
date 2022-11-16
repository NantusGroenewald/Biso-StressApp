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

const uri = "mongodb+srv://dbUser:dbUserPassword@cluster0.lh84toi.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri); 

const initializePassport = require('./passport-config')
initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
)

app.use(express.static(__dirname + '/public')); 
const users = []; 

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
  
  app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: true
  }))

  app.get('/home', checkAuthenticated, (req, res) => {
    res.render('home.ejs')
  })
  
  app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('userregister.ejs')
  })

  // app.post('/register', checkNotAuthenticated, async (req, res) => {
  //   try {
  //     if (req.body.confirm-password == req.body.password) {
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
  
  app.post('/register', async (req, res) => {
    try {
      if (req.body.password == req.body.confirm_password) {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        mongoAdd(getDateTime(), req.body.username, req.body.age, req.body.email, hashedPassword).catch(console.error);
      } else {
        console.log('User could not be registered.');
      }
      res.redirect('/login');
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
        stress: []
      });
    } catch (error) {
      //console.error(error);
      console.log('Email already registered.');
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
    const result = await client.db("BISO_DB").collection("EmployeeStress").insertOne(newListing);
  }
  
  //Run server on port 3000
  app.listen(3000);

