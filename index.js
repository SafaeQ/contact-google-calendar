const googleCalendarService = require("./googleCalendarService");
// expres
const express = require("express");
const app = express();
const moment = require("moment");
require("moment-timezone");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
// views path
app.set("views", "./views");

app.get("/", async (req, res) => {
  // render form view ejs
  const params = req.query;
  res.render("home",{message:params.message || false});
});

// Guess the user's timezone.
const timeZonz = moment.tz.guess();

// create a calendar event.
app.post("/create-event", async (req, res) => {
  const { summary, description, start, attendees, reminderEmail, reminderPopup } = req.body;

  // end = moment(start).add(1, "days").format("YYYY-MM-DDTHH:mm:ssZ");
  let end = start;
  let location = "Online";

  const eventData = {
    summary: summary,
    location: location,
    description: description,
    start: {
      dateTime: moment(start).tz("timeZonz").format("YYYY-MM-DDTHH:mm:ssZ"),
      timeZone: timeZonz,
    },
    end: {
      dateTime: moment(end).tz("timeZonz").format("YYYY-MM-DDTHH:mm:ssZ"),
      timeZone: timeZonz,
    },
    recurrence: ["RRULE:FREQ=DAILY;COUNT=1"],
    attendees: `${attendees}`.split(",").map((email) => {
      return { "email": email };
    }),
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: +reminderEmail * 60 },
        { method: "popup", minutes: +reminderPopup },
      ],
    },
  };

  const event = await googleCalendarService.createEvent(eventData);
  if (event && event.id) {
    res.redirect(`/?message=success`);
  }
});

app.listen(5686, () => {
  console.log("Server started on http://localhost:5686");
});
