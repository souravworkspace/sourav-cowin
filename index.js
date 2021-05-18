const _ = require('lodash');
const config = require('./config');
const express = require('express');
const got = require('got');
const scheduler = require('node-schedule');
const sendMail = require('./sendgrid');
const notifier = require('node-notifier');

let existingSessions = [];

const matchFn = ({
  min_age_limit,
  available_capacity,
  available_capacity_dose1,
  vaccine,
}) => min_age_limit < 32 && available_capacity > 0;
// && vaccine === COVISHIELD;
// && available_capacity_dose1 > 0;

let cronRunning = false;

const PUBLIC_API_PREFIX = `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public`;

function getDates() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const week1 = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  date.setDate(date.getDate() + 6);
  const week2 = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  return [week1, week2];
}

async function findVaccine(district, dateStr) {
  const url = `${PUBLIC_API_PREFIX}/calendarByDistrict?district_id=${district}&date=${dateStr}`;
  const { body: data } = await got.get(url, { responseType: 'json' });
  const matches = data.centers
    .filter(({ sessions }) => sessions.some(matchFn))
    .map(({ sessions, ...rest }) => ({ sessions: sessions.filter(matchFn), ...rest }));
  return matches;
}

async function findAllVaccines(districts, dates) {
  let matches = [];
  for (date of dates) {
    for (district of districts) {
      console.log('loop: ', date, district);
      const found = await findVaccine(district, date);
      matches = [...matches, ...found];
    }
  }
  return matches;
}

async function sendMailNoty(centers) {
  const slots = centers.map(
    ({
      vaccine,
      name,
      district_name,
      date,
      available_capacity,
      available_capacity_dose1,
    }) =>
      `${vaccine} dose1: ${available_capacity_dose1}, ${name}, ${district_name}, ${date}, `
  );
  const text = slots.join('\n');
  const sub = 'Vaccines Available!';
  notifier.notify({
    title: sub,
    message: text,
    sound: true,
    wait: true,
  });
  for (email of config.emails) {
    // sendMail(sub, email, text);
  }
}

async function checkVaccineStatus() {
  const dates = getDates();
  const districts = ['730', '721', '725'];
  const matches = await findAllVaccines(districts, dates);
  const newCenters = _(matches)
    .map(({ center_id, name, district_name, sessions }) =>
      sessions.map((s) => ({ center_id, name, district_name, ...s }))
    )
    .flatten()
    .filter(({ session_id }) => !existingSessions.includes(session_id))
    .value();
  const newSessions = newCenters.map(({ session_id }) => session_id);
  existingSessions = [...existingSessions, ...newSessions];
  if (matches.length > 0) sendMailNoty(newCenters);
}

async function runCron() {
  if (!cronRunning) {
    cronRunning = true;
    const randWaitTime = Math.floor(Math.random() * 10000);
    setTimeout(() => {
      checkVaccineStatus().catch((err) => console.error('cron failed: ', err));
      cronRunning = false;
    }, randWaitTime);
  }
}

async function main() {
  scheduler.scheduleJob('* * * * *', runCron);
  express()
    .use(express.json())
    .use('/', express.static('view'))
    .listen(config.port, () => {
      console.log(`server listening on http://localhost:${config.port}`);
    });
}

main().catch((err) => console.error('error:', err));
