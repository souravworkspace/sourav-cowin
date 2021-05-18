const config = require('./config');
const got = require('got');

const sender = {
  email: 'ragul@convertcart.com',
  name: 'Vaccine Notification',
};
const sendgridApiV3 = 'https://api.sendgrid.com/v3';
const msgIdHeader = 'x-message-id';

module.exports = async function send(subject, to, bodyText) {
  const { email: fromEmail, name: fromName } = sender;
  const type = 'text/plain';
  const apiBodyJson = {
    personalizations: [
      {
        to: [{ email: to }],
        subject,
      },
    ],
    from: { email: fromEmail, name: fromName },
    content: [{ type, value: bodyText }],
  };
  const apiUrl = `${sendgridApiV3}/mail/send`;
  const { headers } = await got.post(apiUrl, {
    headers: {
      Authorization: `Bearer ${config.sendgridApiKey}`,
    },
    json: apiBodyJson,
  });
  const messageId = headers[msgIdHeader];
  return messageId;
};
