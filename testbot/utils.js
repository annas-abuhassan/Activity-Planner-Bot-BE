const axios = require('axios');
const { CardFactory } = require('botbuilder');
const { facebookToken, googleApiKey } = require('./config');
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
                value: 'More'
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

// sendMoreOptions(null, 'slack', null);

const sendCards = async (channel, businesses, id, turnContext) => {
  if (channel === 'facebook') await sendFacebookCard(id, businesses);
  else if (channel === 'emulator')
    await sendAdaptiveCard(businesses, turnContext);
  else if (channel === 'slack') await sendAdaptiveCard(businesses, turnContext);
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
  // sendFacebookCard,
  sendTypingIndicator,
  // sendAdaptiveCard,
  sendMoreOptions,
  sendCards
};
