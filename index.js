const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up a very simple persistent store (JSON file)
const MSG_FILE = 'messages.json';
function getMessages() {
  if (!fs.existsSync(MSG_FILE)) return [];
  return JSON.parse(fs.readFileSync(MSG_FILE));
}
function saveMessage(msg) {
  let msgs = getMessages();
  msgs.unshift(msg);
  fs.writeFileSync(MSG_FILE, JSON.stringify(msgs.slice(0, 200)));
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Twilio creds from env
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_NUMBER;

// Web UI inbox
app.get('/', (req, res) => {
  res.render('inbox', { messages: getMessages(), twilioNumber: TWILIO_NUMBER });
});

// Twilio webhook for incoming SMS
app.post('/sms', (req, res) => {
  const from = req.body.From;
  const body = req.body.Body;
  saveMessage({ from, body, date: new Date().toISOString() });
  res.type('text/xml').send('<Response></Response>');
});

// Send SMS reply
app.post('/send', async (req, res) => {
  const to = req.body.to;
  const body = req.body.body;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_NUMBER) {
    return res.send('Twilio credentials missing.');
  }
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  await client.messages.create({ body, from: TWILIO_NUMBER, to });
  saveMessage({ from: TWILIO_NUMBER, to, body, date: new Date().toISOString() });
  res.redirect('/');
});

app.listen(PORT, () => console.log(`SMS Inbox listening on ${PORT}`));
