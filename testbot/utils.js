const axios = require('axios');
const accessToken =
  'EAAKVOuZBgYjEBANZBZAHCzbq7LBO9btFL4AYZAMbLjO4oqZBpV3ZAWUQgLIFwX1d8OSoDmPB6OFN862eZAfsGX90dXRItQyToPZBEJ4bLlVcEH6DUZAWZCvCi5VS1sQ0vIT5mbYII9UEAnJTCRa61gJi8OearZAKmZA64iTnXoIsPLuEuAZDZD';

const getUserData = userId => {
  return axios
    .get(
      `https://graph.facebook.com/${userId}?fields=first_name,last_name,profile_pic&access_token=${accessToken}`
    )
    .then(({ data }) => data);
};

const sendLocation = userId => {
  return axios.post(
    `https://graph.facebook.com/v2.6/me/messages?access_token=${accessToken}`,
    {
      recipient: {
        id: `${userId}`
      },
      message: {
        text: 'Send me your location!',
        quick_replies: [
          {
            content_type: 'location'
          }
        ]
      }
    }
  );
};

module.exports = { getUserData, sendLocation };
