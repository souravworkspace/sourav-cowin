const dotenv = require('dotenv');

dotenv.config();

const ENV = process.env;

function must(envName) {
  if (ENV[envName]) return ENV[envName];
  else throw new Error(`environment.variable.missing ${envName}`);
}

module.exports = {
  port: parseInt(ENV.PORT || '80', 10),
  sendgridApiKey: must('SENDGRID_API_KEY'),
  emails: (ENV.EMAILS || '').split(','),
};
