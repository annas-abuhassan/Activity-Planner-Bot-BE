const axios = require('axios');
const { CardFactory } = require('botbuilder');
const { facebookToken, googleApiKey, slackToken } = require('./config');
const { ChoiceFactory } = require('botbuilder-choices');
const { MessageFactory } = require('botbuilder-core');

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

const getUserData = async (channel, id) => {
  if (channel === 'facebook') return getFacebookData(id);
  if (channel === 'slack') return getSlackData(id);
};

const getFacebookData = async userId => {
  return axios
    .get(
      `https://graph.facebook.com/${userId}?fields=first_name,last_name,profile_pic&access_token=${facebookToken}`
    )
    .then(({ data }) => data.first_name);
};

const getSlackData = async userId => {
  splitId = userId.split(':')[0];
  return axios
    .get(`https://slack.com/api/users.info?token=${slackToken}&user=${splitId}`)
    .then(({ data }) => data.user.profile.real_name);
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
          'Click below to share with me your location or tell me where to search 📍',
        quick_replies: [
          {
            content_type: 'location'
          }
        ]
      }
    }
  );
};

const sendMoreOptions = async (id, channel, turnContext) => {
  if (channel === 'facebook') {
    return axios.post(
      `https://graph.facebook.com/v2.6/me/messages?access_token=${facebookToken}`,
      {
        recipient: {
          id: id
        },
        message: {
          text: 'Would you like to see more options?',
          quick_replies: [
            {
              content_type: 'text',
              title: 'More',
              payload: 'More'
            },
            {
              content_type: 'text',
              title: 'Done',
              payload: 'Done'
            }
          ]
        }
      }
    );
  }

  if (channel === 'slack') {
    return axios.post(
      'https://hooks.slack.com/services/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',
      {
        type: 'interactive_message',
        text: 'Would you like to see more options?',
        token: 'n0JF8xyiD1SrFO0lvN7lCbBA',
        attachments: [
          {
            fallback: 'Button submission broken',
            callback_id: 'test',
            color: '#3AA3E3',
            attachment_type: 'default',
            actions: [
              {
                style: 'primary',
                name: 'More',
                text: 'More',
                type: 'button',
                value: 'More',
                payload: 'THIS IS A PAYLOAD?!'
              },
              {
                style: 'danger',
                name: 'Done',
                text: 'Done',
                type: 'button',
                value: 'Done'
              }
            ],
            response_url:
              'https://hooks.slack.com/services/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'
          }
        ]
      }
    );
  }

  if (channel === 'emulator') {
    const messageChoice = ChoiceFactory.forChannel(
      turnContext,
      ['More', 'Done'],
      'Would you like to see more options?'
    );

    await turnContext.sendActivity(messageChoice);
  }
};

const sendCards = async (channel, businesses, id, turnContext, location) => {
  if (channel === 'facebook') await sendFacebookCard(id, businesses, location);
  else if (channel === 'emulator' || channel === 'directline')
    await sendAdaptiveCard(businesses, turnContext);
  else if (channel === 'slack') await sendSlackCard(businesses);
  await sendMoreOptions(id, channel, turnContext);
};

const sendFacebookCard = async (id, businesses, currLocation) => {
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
      coordinates,
      distance
    } = business;

    const walkingDistance = Math.round(distance / 100);
    const stars = Math.round(rating);
    const map = `https://maps.googleapis.com/maps/api/staticmap?center=${
      coordinates.latitude
    },${
      coordinates.longitude
    }&zoom=19&size=400x400&markers=color:blue%7Clabel:S%${
      coordinates.latitude
    },${coordinates.longitude}&key=${googleApiKey}`;

    const subtitle =
      typeof currLocation === 'object'
        ? location.display_address[0] +
          ', ' +
          location.zip_code +
          '\n' +
          'Rating: ' +
          starRatings[stars] +
          '\n' +
          '🚶 ' +
          walkingDistance +
          ' mins  (' +
          (distance / 1000).toFixed(2) +
          'km)'
        : location.display_address[0] +
          ', ' +
          location.zip_code +
          '\n' +
          'Rating: ' +
          starRatings[stars] +
          '\n' +
          `${price ? 'Price: ' + price : ''}`;

    const businessElement = {
      title: name,
      image_url: image_url.length === 0 ? map : image_url,
      subtitle: subtitle,
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

const sendSlackCard = async businesses => {
  const messages = [];

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
      coordinates,
      distance
    } = business;

    const stars = Math.round(rating);
    const walkingDistance = Math.round(distance / 100);
    const phone = display_phone.replace('+44 ', '0');

    const slackMessage = {
      fallback: '',
      pretext: '',
      color: '#36a64f',
      title: name,
      text:
        '🏠 ' +
        location.display_address[0] +
        ', ' +
        location.zip_code +
        '\n' +
        '📱' +
        phone +
        '\n' +
        'Rating: ' +
        starRatings[stars] +
        '\n' +
        '🚶 ' +
        walkingDistance +
        ' mins  (' +
        (distance / 1000).toFixed(2) +
        'km)' +
        '\n' +
        `${price ? 'Price: ' + price : ''}`,

      actions: [
        {
          name: 'website',
          text: 'Visit website',
          type: 'button',
          style: 'primary',
          url: url
        },
        {
          name: 'directions',
          text: 'Get Directions',
          type: 'button',
          url: `https://www.google.com/maps/dir/?api=1&destination=${
            coordinates.latitude
          },${coordinates.longitude}&travelmode=walking`
        }
      ]
    };
    messages.push(slackMessage);
  });

  return axios.post(
    'https://hooks.slack.com/services/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',
    {
      channel: '#general',
      username: 'Daisy-Bot',
      text: '',
      icon_emoji:
        'https://www.muralswallpaper.co.uk/app/uploads/bright-daisy-flower-plain.jpg',
      attachments: messages
    }
  );
};

const sendAdaptiveCard = async (businesses, turnContext) => {
  const businessArray = [];

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

    businessArray.push(
      CardFactory.adaptiveCard({
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
                      location.display_address[0] +
                      ', ' +
                      location.zip_code +
                      '.'
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
      })
    );
  });
  await turnContext.sendActivity(MessageFactory.carousel(businessArray));
};

module.exports = {
  getFacebookData,
  reqFacebookLocation,
  sendTypingIndicator,
  sendMoreOptions,
  sendCards,
  getUserData
};
