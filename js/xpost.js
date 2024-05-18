const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

const BEARER_TOKEN = 'X_BEARER_TOKEN';

app.get('/tweets', async (req, res) => {
  try {
    const response = await axios.get('https://api.twitter.com/1.1/statuses/user_timeline.json', {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      },
      params: {
        screen_name: '@tylerpixel',
        count: 3
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});