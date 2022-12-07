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
const fetch = require("node-fetch");
const wt = require('worker-thread'); 
const calender = require('./google_calender'); 


//Garmin
const { GarminConnect } = require('garmin-connect');
const GCClient = new GarminConnect();



const uri = "mongodb+srv://dbUser:dbUserPassword@cluster0.lh84toi.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri);

//Current date without time
let currentDate = new Date().toISOString().split('T')[0];
//Current date and time 
let currentDatetime = new Date()
//Current date time plus time 
let tomorrow = addDay(new Date(), 1)
let eventSummary; 

const initializePassport = require('./passport-config');
const { google } = require('googleapis');
const { analytics } = require('googleapis/build/src/apis/analytics');
initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
)

app.use(express.static(__dirname + '/public')); 
let users = []; 
let result; 
let events = {summary: 'no events' } 
//Heartrate values 
var heartRate;
var restingRate; 
var heartRateValues; 
var lastHeartRate;
var ActivityType; 
var Activity; 
var Uservalues = {}; 

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
          res.redirect('/home');
        }
        else {
          console.log('Incorrect password.');
          res.redirect('/login');
        }
      });
    }
  })
  
  app.post('/activities/save', checkNotAuthenticated, async (req, res) => {
    let id = result._id;
    result.activities.normal = req.body.normal;
    result.activities.medium = req.body.medium;
    result.activities.high = req.body.high;
    mongoUpdate(id);
    res.redirect('/useraccount');
  });

  app.post('/details/save', checkNotAuthenticated, async (req, res) => {
    let id = result._id;
    result.name = req.body.name;
    result.age = req.body.age;
    result.department = req.body.department;
    mongoUpdate(id);
    res.redirect('/useraccount');
  });

  app.post('/schedule/save', checkNotAuthenticated, async (req, res) => {
    let summary = req.body.summary;
    let description = req.body.description;
    let dateTime = calender.dateTimeForCalander();

    // Event for Google Calendar
    let event = {
        'summary': summary,
        'description': description,
        'start': {
            'dateTime': dateTime['start'],
            'timeZone': 'Asia/Kolkata'
        },
        'end': {
            'dateTime': dateTime['end'],
            'timeZone': 'Asia/Kolkata'
        }
    };

    calender.insertEvent(event)
        .then((res) => {
            console.log(res);
        })
        .catch((err) => {
            console.log(err);
        });

    res.redirect('/useraccount');
  });

  app.get('/home', async (req, res) => {
    const ch = wt.createChannel(worker, 1);
    ch.on('done', async (err, result) => {
      if (err) {
        console.error(err);
      }
    });
    ch.add(1);
    res.render('home.ejs',{Uservalues});
    console.log(restingRate);
    console.log(lastHeartRate);
    console.log(Uservalues);
  });

  app.get('/activities', (req, res) => {
    res.render('activities.ejs',{result})
  })

  app.get('/details', (req, res) => {
    res.render('details.ejs', {result})
  })

  app.get('/useraccount', (req, res) => {
    calender.getEvents(currentDatetime, tomorrow)
        .then((res) => {
          eventSummary = res[0].summary; 
          console.log("Event name: " + eventSummary);
          events = {summary: eventSummary }
          
        })
        .catch((err) => {
          console.log(err);
        });
    res.render('useraccount.ejs',{result})
  })

  app.get('/schedule', (req, res) => { 
        res.render('schedule.ejs',{events})
  })
  
  app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('userregister.ejs')
  })

  
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
//Add user to mongoDb (garmin details hardcoded)
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
        activities: {normal: "", medium: "", high: ""},
        department: "",
        garmin: {
          email: "r0943545@ucll.be",
          password : "Ivp1234567"
        }
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

  async function mongoUpdate(id) {
    try {
      await client.connect();
      return await updateUser(client, id);
    } catch (e) {
      console.log('Could not update user.');
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

  //Method to do Activity calculations
  function ActivityCalc(restingHeartRate, lastHeartRate){
    if (lastHeartRate >= restingHeartRate + 20 && lastHeartRate < restingHeartRate + 35 ) {
      ActivityType = "LOW"; 
      Activity = result.activities.normal; 
    }
    else if (lastHeartRate >= restingHeartRate + 35 && lastHeartRate < restingHeartRate + 45){
      ActivityType = "MEDIUM"; 
      Activity = result.activities.medium; 
    } 
    else if (lastHeartRate >= restingHeartRate + 45){
      ActivityType = "HIGH"; 
      Activity = result.activities.high; 
    }
    else {
      ActivityType = "LOW"; 
      Activity = "Just Breathe";
    }
  }

  // Add new user to the database
  async function createUser(client, newListing){
    await client.db("BISO_DB").collection("EmployeeStress").insertOne(newListing);
  }

  // Get user data via email
  async function getUser(client, listingId){
    return await client.db("BISO_DB").collection("EmployeeStress").findOne({_id: listingId});
  }

  // Update collection of logged in user
  async function updateUser(client, id){
    return await client.db("BISO_DB").collection("EmployeeStress").updateOne({_id: id}, {$set: result});
  }

  function worker(n) {
    return new Promise( async r => {
      console.log(result.garmin.email);
      await GCClient.login(result.garmin.email, result.garmin.password);
      console.log(currentDate);
      heartRate = await GCClient.getHeartRate(new Date(currentDate)); 
      restingRate = heartRate["restingHeartRate"]; 
      heartRateValues = heartRate["heartRateValues"]; 
      lastHeartRate = heartRateValues[heartRateValues.length-1][1];
      ActivityCalc(restingRate, lastHeartRate)
      Uservalues = {lastHeartRate: lastHeartRate,ActivityType: ActivityType ,Activity:Activity };
    });
  }

  function addDay(date, day) {
    date.setDate(date.getDate() + day);
  
    return date;
  }

  //Run server on port 3000
  app.listen(3000);

