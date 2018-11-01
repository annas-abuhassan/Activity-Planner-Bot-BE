const { CardFactory } = require('botbuilder');

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

module.exports = cardGenerator;