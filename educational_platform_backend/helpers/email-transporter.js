const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");

const transporter = nodemailer.createTransport(
  smtpTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_DUSER,
      pass: process.env.SMTP_DPASSWORD,
    },
  })
);

const hbs = require("nodemailer-express-handlebars");
const options = {
  viewEngine: {
    extname: ".hbs",
    layoutsDir: "views/emails/",
    defaultLayout: "layout",
    partialsDir: "views/emails/partials/",
  },
  viewPath: "views/emails/",
  extName: ".hbs",
};

transporter.use("compile", hbs(options));

module.exports = transporter;
