const axios = require('axios');
const { facebookToken } = require('./config');

const getUserData = async userId => {
  return axios
    .get(
      `https://graph.facebook.com/${userId}?fields=first_name,last_name,profile_pic&access_token=${facebookToken}`
    )
    .then(({ data }) => data);
};

const sendLocation = userId => {
  return axios.post(
    `https://graph.facebook.com/v2.6/me/messages?access_token=${facebookToken}`,
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

const sendCard = (id, businesses) => {
  const elementsArray = [];
  businesses.forEach(business => {
    const {
      name,
      image_url,
      categories,
      url,
      display_phone,
      rating,
      price,
      location
    } = business;

    const businessElement = {
      title: name,
      image_url: image_url,
      subtitle: categories[0],
      subtitle: location.display_address[0] + ', ' + location.zip_code + '.',
      subtitle: price,
      subtitle: rating,
      default_action: {
        type: 'web_url',
        url: url,
        webview_height_ratio: 'tall'
      },
      buttons: [
        {
          type: 'web_url',
          url: url,
          title: 'View Website'
        },
        {
          type: 'phone_number',
          title: 'Call to Book',
          payload: display_phone
        }
      ]
    };

    elementsArray.push(businessElement);
  });

  return axios.post(
    `https://graph.facebook.com/v2.6/me/messages?access_token=${facebookToken}`,
    {
      recipient: {
        id: id
      },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: elementsArray
          }
        }
      }
    }
  );
};

module.exports = { getUserData, sendLocation, sendCard };
