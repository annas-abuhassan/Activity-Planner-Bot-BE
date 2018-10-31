const axios = require('axios');
const { ActivityTypes } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');

const yelpConfig = {
  headers: {
    Authorization: 'Bearer TuvmLWJB9pIavJpxZHdCh4deKTEdlMQuRgy8OHNPcn6KiJ_1m7u7XUmx_nPwzUT9ln3mgbf0qoIDUHdIXMpCiTksZnANr8Hj5YaBmxQUcsqpN8YuJr3-TjAblvLWW3Yx'
  }
}

class LuisBot {
  constructor(application, luisPredictionOptions) {
    this.luisRecognizer = new LuisRecognizer(application, luisPredictionOptions, true);
  }

  async onTurn(turnContext) {
    if (turnContext.activity.type === ActivityTypes.Message) {
      const results = await this.luisRecognizer.recognize(turnContext);
      console.log(results)

      const cuisine = results.luisResult.entities.filter(entity => entity.type === 'cuisine')[0].entity
      const location = results.luisResult.entities.filter(entity => entity.type === 'location')[0].entity

      await turnContext.sendActivity(`Sounds like you're looking for a ${cuisine} restaurant in ${location}...`);

      await this.getBusinesses(cuisine, location)
      .then(businesses => turnContext.sendActivity(`How about ${businesses[0].name} in ${businesses[0].location.city}`))
      .catch(error => turnContext.sendActivity(`${error}`))


    // this bit does the welcome text
    } else if (turnContext.activity.type === ActivityTypes.ConversationUpdate &&
      turnContext.activity.recipient.id !== turnContext.activity.membersAdded[0].id) {
      await turnContext.sendActivity('Hey there, my name is Luis and I can help you to find somewhere to eat out! 🍔 🍕 🌭 🌮 🍝')
      await turnContext.sendActivity('What do you want me to search for?')
    }
  }

  getBusinesses(term, location) {
    return axios.get(`https://api.yelp.com/v3/businesses/search?term=${term}&location=${location}`, yelpConfig)
      .then(({ data }) => {
        return data.businesses
        // console.log(data.businesses)
      })
      .catch(console.log)
  }
}

module.exports.LuisBot = LuisBot;