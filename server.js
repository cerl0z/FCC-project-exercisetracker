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
  const durationToAdd = parseInt(req.body.duration);
  let dateToAdd = req.body.date
    ? new Date(req.body.date + "T00:00:00-04:00").toDateString()
    : new Date().toDateString();

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

  let userObj = {
    _id: user._id,
    username: user.username,
    date: newExercise.date,
    duration: newExercise.duration,
    description: newExercise.description,
  };

  res.json(userObj);
});

app.get("/api/users/:_id/logs/", async (req, res) => {
  let userId = req.params._id;

  // Prepare for cases where query values are empty
  let limit = req.query.limit ? Number(req.query.limit) : 0;
  let from = req.query.from
    ? new Date(req.query.from + "T00:00:00")
    : new Date(0);
  let to = req.query.to
    ? new Date(req.query.to + "T00:00:00")
    : new Date(Date.now());
  console.log("from query: " + req.query.from);

  let user = await User.findById({ _id: userId });
  let filterLog = user.log;
  if (user) {
    let count = user.log.length;

    let exLog = user.log.map((log) => ({
      description: log.description,
      duration: log.duration,
      date: log.date.toString(),
    }));

    console.log("user found");
    if (from && to && limit) {
      if (from) {
        const fromDate = new Date(from);
        filterLog = filterLog.filter((log) => {
          console.log(`logdate: ${new Date(log.date)} || fromDate:${fromDate}`);
          console.log(`fromTest?: ${new Date(log.date) >= fromDate}`);
          return new Date(log.date) >= fromDate;
        });
      }

      if (to) {
        const toDate = new Date(to);

        console.log("--------------");
        filterLog = filterLog.filter((log) => {
          console.log(`logdate: ${new Date(log.date)} || toDate:${toDate}`);
          console.log(`toTest?: ${new Date(log.date) <= toDate}`);
          return new Date(log.date) <= toDate;
        });
      }

      if (limit) {
        filterLog = filterLog.slice(0, limit);
      }

      const returnLog = filterLog.map((log) => ({
        description: log.description,
        duration: log.duration,
        date: log.date.toString(),
      }));

      return res.json({
        log: returnLog,
      });
    }
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
  let from = new Date(req.params.from + "T00:00:00") || new Date(0);
  let to = new Date(req.params.to + "T00:00:00") || new Date(Date.now());
  console.log(req.query.from);
  let limit = Number(req.params.limit) || 0;
  // console.log(`req.params.to: ` + req.params.to);
  // console.log(`To: ` + to);
  let user = await User.findById({ _id: userId });

  let filterLog = user.log;
  if (user) {
    if (from) {
      const fromDate = new Date(from);
      filterLog = filterLog.filter((log) => {
        console.log(`logdate: ${new Date(log.date)} || fromDate:${fromDate}`);
        console.log(`fromTest?: ${new Date(log.date) >= fromDate}`);
        return new Date(log.date) >= fromDate;
      });
    }

    if (to) {
      const toDate = new Date(to);

      console.log("--------------");
      filterLog = filterLog.filter((log) => {
        console.log(`logdate: ${new Date(log.date)} || toDate:${toDate}`);
        console.log(`toTest?: ${new Date(log.date) <= toDate}`);
        return new Date(log.date) <= toDate;
      });
    }

    if (limit) {
      filterLog = filterLog.slice(0, limit);
    }

    const returnLog = filterLog.map((log) => ({
      description: log.description,
      duration: log.duration,
      date: log.date.toString(),
    }));

    return res.json({
      log: returnLog,
    });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
