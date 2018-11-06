const axios = require('axios');
const { CardFactory } = require('botbuilder');
const { facebookToken, googleApiKey } = require('./config');

const sendTypingIndicator = async (userId, channel) => {
  if (channel === 'facebook')
    axios.post(
      `https://graph.facebook.com/v2.6/me/messages?access_token=${facebookToken}`,
      {
        recipient: {
          id: userId
        },
        sender_action: 'typing_on'
      }
    );
};

const getFacebookData = async userId => {
  return axios
    .get(
      `https://graph.facebook.com/${userId}?fields=first_name,last_name,profile_pic&access_token=${facebookToken}`
    )
    .then(({ data }) => data);
};

const reqFacebookLocation = userId => {
  return axios.post(
    `https://graph.facebook.com/v2.6/me/messages?access_token=${facebookToken}`,
    {
      recipient: {
        id: `${userId}`
      },
      message: {
        text:
          'Click below to share with me your location or tell me where to search :)!',
        quick_replies: [
          {
            content_type: 'location'
          }
        ]
      }
    }
  );
};

const sendFacebookCard = async (id, businesses) => {
  const elementsArray = [];
  const starRatings = {
    1: '⭐',
    2: '⭐⭐',
    3: '⭐⭐⭐',
    4: '⭐⭐⭐⭐',
    5: '⭐⭐⭐⭐⭐'
  };
  businesses.forEach(business => {
    const {
      name,
      image_url,
      url,
      display_phone,
      rating,
      price,
      location,
      coordinates
    } = business;

    // const mapLocation =
    //   location.address1.replace(/\s/g, '') + ',' + location.city;
    const stars = Math.round(rating);
    const map = `https://maps.googleapis.com/maps/api/staticmap?center=${
      coordinates.latitude
    },${
      coordinates.longitude
    }&zoom=19&size=400x400&markers=color:blue%7Clabel:S%${
      coordinates.latitude
    },${coordinates.longitude}&key=${googleApiKey}`;

    const businessElement = {
      title: name,
      image_url: image_url.length === 0 ? map : image_url,
      subtitle:
        location.display_address[0] +
        ', ' +
        location.zip_code +
        '\n' +
        'Rating: ' +
        starRatings[stars],
      buttons: [
        {
          type: 'web_url',
          url: url,
          title: 'View Website',
          webview_height_ratio: 'compact'
        },
        { type: 'phone_number', title: 'Call to Book', payload: display_phone },
        {
          type: 'web_url',
          url: `https://www.google.com/maps/dir/?api=1&destination=${
            coordinates.latitude
          },${coordinates.longitude}&travelmode=walking`,
          title: 'Get Directions'
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

const cardGenerator = business => {
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

  return CardFactory.adaptiveCard({
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.0',
    body: [
      {
        speak:
          "Tom's Pie is a Pizza restaurant which is rated 9.3 by customers.",
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 2,
            items: [
              {
                type: 'TextBlock',
                text: categories[0].title
              },
              {
                type: 'TextBlock',
                text: name,
                weight: 'bolder',
                size: 'extraLarge',
                spacing: 'none'
              },
              {
                type: 'TextBlock',
                text:
                  location.display_address[0] + ', ' + location.zip_code + '.'
              },
              {
                type: 'TextBlock',
                text: display_phone,
                size: 'small',
                wrap: true
              },
              {
                type: 'TextBlock',
                text: 'Rating: ' + rating.toString(),
                isSubtle: true,
                spacing: 'none'
              },
              {
                type: 'TextBlock',
                text: 'Price Range: ' + price,
                isSubtle: true,
                spacing: 'none'
              }
            ]
          },
          {
            type: 'Column',
            width: 1,
            items: [
              {
                type: 'Image',
                url: image_url,
                size: 'auto'
              }
            ]
          }
        ]
      }
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Click For More Infomation',
        url: url
      }
    ]
  });
};

module.exports = {
  getFacebookData,
  reqFacebookLocation,
  sendFacebookCard,
  sendTypingIndicator,
  cardGenerator
};
