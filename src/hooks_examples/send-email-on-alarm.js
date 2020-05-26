var nodemailer = require("nodemailer");

var smtpTransport = nodemailer.createTransport("SMTP", {
  service: "Gmail",
  auth: {
    user: "john.doe@gmail.com",
    pass: "secret"
  }
});

module.exports = function(ICM) {
  ICM.events.on("alarmStatusChanged", function(alarmStatus) {
    if (alarmStatus == 1 || alarmStatus == 2) {
      var mailOptions = {
        from: "Alarm <brady.holt@gmail.com>", // sender address
        to: "brady.holt@gmail.com", // list of receivers
        subject:
          alarmStatus == 1 ? "*** Security Alarm ***" : "*** Fire Alarm ***", // Subject line
        text: ICM.getAlarmStatusDetail(false), // plaintext body
        html: ICM.getAlarmStatusDetail(true) // html body
      };

      smtpTransport.sendMail(mailOptions, function(error, response) {
        console.log(error ? error : "Email sent: " + response.message);
      });
    }
  });
};
