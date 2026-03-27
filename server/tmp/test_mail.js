const nodemailer = require("nodemailer");
 
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "swarnamrutham3@gmail.com",
    pass: "ykod qvle rvyq auih"
  }
});
 
console.log("Testing SMTP connection...");
transporter.sendMail({
  from: "swarnamrutham3@gmail.com",
  to: "swarnamrutham3@gmail.com",
  subject: "SMTP Test",
  text: "This is a test to verify if the Gmail App Password is still valid."
}).then(info => {
  console.log("SUCCESS!", info.response);
  process.exit(0);
}).catch(err => {
  console.error("FAILURE!", err);
  process.exit(1);
});
