const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const Schema = mongoose.Schema;
const { v4: uuidv4 } = require("uuid");

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

const userSchema = new Schema({
  _id: String,
  username: String,
  count: Number,
  log: [
    {
      description: String,
      duration: Number,
      date: String,
    },
  ],
});

const exerciseSchema = new Schema({
  description: String,
  duration: Number,
  date: String,
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);
// const Log = mongoose.model("Log", logSchema);
app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.use(bodyParser.urlencoded({ extended: false }));

app.post("/api/users", async (req, res) => {
  const userName = req.body.username;
  const userId = uuidv4();
  let findUser = await User.findOne({ username: userName });

  //if user exists return user
  if (findUser) {
    return res.json({
      _id: findUser._id,
      username: findUser.username,
    });
  }
  // if user does not exist save new user and return user
  else {
    findUser = new User({
      _id: userId,
      username: userName,
    });
    await findUser.save();

    return res.json({
      username: findUser.username,
      _id: findUser._id,
    });
  }
});

app.get("/api/users", async (req, res) => {
  let allUsers = await User.find({}).select("username _id"); //find all

  return res.json(allUsers);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  const descriptionToAdd = req.body.description;
  const durationToAdd = req.body.duration;
  const dateToAdd = req.body.date;
  // console.log(`req.body.date=${req.body.date}`);
  if (dateToAdd === "") {
    dateToAdd = new Date().toDateString();
  }
  // let dateToAdd = new Date(req.body.date.replace(/-/g, "/")).toDateString();
  // // console.log(dateToAdd);
  // if (!req.body.date) {
  //   dateToAdd = new Date().toDateString();
  // }

  //const dateToAdd = new Date(req.body.date).toDateString();
  const exObject = {
    description: descriptionToAdd,
    duration: durationToAdd,
    date: dateToAdd,
  };

  let user = await User.findByIdAndUpdate({ _id: userId });
  let newExercise = await Exercise(exObject);

  if (user) {
    user.log.push(exObject);
  }
  await user.save();
  await newExercise.save();

  return res.json({
    username: user.username,
    description: newExercise.description,
    duration: newExercise.duration,
    date: newExercise.date,
    _id: user._id,
  });
});

app.get("/api/users/:_id/logs/", async (req, res) => {
  let userId = req.params._id;
  let user = await User.findById({ _id: userId });
  if (user) {
    let count = user.log.length;
    //console.log(`from:${from}, to:${to}, limit:${limit}`);

    let exLog = user.log.map((log) => ({
      description: log.description,
      duration: log.duration,
      date: log.date,
    }));

    console.log("user found");
    return res.json({
      username: user.username,
      count: count,
      _id: userId,
      log: exLog,
    });
  } else {
    return res.json({
      error: "user not found",
    });
  }
});

app.get("/api/users/:_id/logs/:from?/:to?/:limit?", async (req, res) => {
  let userId = req.params._id;
  let from = new Date(req.params.from);
  let to = new Date(req.params.to);
  let limit = req.params.limit;
  let user = await User.findById({ _id: userId });

  let filterLog = user.log;
  if (user) {
    if (from && to) {
      //console.log(`from:${from}, to:${to}, limit:${limit}`);
      // console.log("before filter");
      filterLog = filterLog.filter((log) => {
        //console.log("filter: " + log.date);
        let date = new Date(log.date);
        if (date >= from && date <= to) {
          return date.toDateString();
        }
        // if (date <= to) {
        //   return date;
        // }
      });
      //console.log("after filter");
      if (limit) {
        filterLog = filterLog.slice(0, limit);
      }
      return res.json({
        log: filterLog.map((log) => ({
          description: log.description,
          duration: log.duration,
          date: log.date,
        })),
      });
    }
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
