const axios = require("axios").default;

const $host = axios.create({
  baseURL: process.env.CORE_API_URL,
  timeout: 2000,
  headers: {
    "Content-Type": "application/json",
  },
});

module.exports = $host;
