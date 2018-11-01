const axios = require('axios');
const { ActivityTypes } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const { MessageFactory } = require('botbuilder-core');
const cardGenerator = require('./cardGenerator');

const yelpConfig = {
  headers: {
    Authorization: 'Bearer TuvmLWJB9pIavJpxZHdCh4deKTEdlMQuRgy8OHNPcn6KiJ_1m7u7XUmx_nPwzUT9ln3mgbf0qoIDUHdIXMpCiTksZnANr8Hj5YaBmxQUcsqpN8YuJr3-TjAblvLWW3Yx'
  }
}

class LuisBot {
  constructor(userState, application, luisPredictionOptions) {
    this.userState = userState;
    this.userCuisine = userState.createProperty('cuisine');
    this.userLocation = userState.createProperty('location');
    this.luisRecognizer = new LuisRecognizer(application, luisPredictionOptions, true);
  }

  async onTurn(turnContext) {
    if (turnContext.activity.type === ActivityTypes.Message) {
      const results = await this.luisRecognizer.recognize(turnContext);
      console.log(results)

      let cuisine = await this.userCuisine.get(turnContext)
      let location = await this.userLocation.get(turnContext)

      try {
        cuisine = results.luisResult.entities.filter(entity => entity.type === 'cuisine')[0].entity
        await this.userCuisine.set(turnContext, cuisine)
      } catch(error) {
        console.log(error)
      }

      try {
        // location = results.luisResult.entities.filter(entity => entity.type === 'builtin.geographyV2.city')[0].entity
        location = results.luisResult.entities.filter(entity => entity.type.startsWith('builtin.geographyV2'))[0].entity
        await this.userLocation.set(turnContext, location)
      } catch(error) {
        console.log(error)
      }

      if (!location && !cuisine) {
        await turnContext.sendActivity(`I'm not sure what you're asking for...`);  
      }

      if (!location && cuisine) {
        await turnContext.sendActivity(`Where abouts do you want to look for a ${cuisine} restaurant?`);  
      }

      if (!cuisine && location) {
        await turnContext.sendActivity(`What type of restaurant are you looking for in ${location}?`);  
      }

      if (location && cuisine) {
        await turnContext.sendActivity(`Sounds like you're looking for a ${cuisine} restaurant in ${location} - how about one of these?`);

        const messageArray = [];

        await this.getBusinesses(cuisine, location)
        .then(async businesses => {
          const topFive = businesses.slice(0, 5);
          topFive.forEach(business => {
            messageArray.push(cardGenerator(business));
          });
          await turnContext.sendActivity(MessageFactory.carousel(messageArray))
        })
        .catch(error => turnContext.sendActivity(`${error}`));

        await this.userState.clear(turnContext);
      }
      
      // save the userState
      await this.userState.saveChanges(turnContext);
    
    // this bit does the welcome text
    } else if (turnContext.activity.type === ActivityTypes.ConversationUpdate &&
      turnContext.activity.recipient.id !== turnContext.activity.membersAdded[0].id) {
      await turnContext.sendActivity('Hey there, my name is Luis and I can help you to find somewhere to eat out! 🍔 🍕 🌭 🌮 🍝')
      await turnContext.sendActivity('What do you want me to search for?')
    }
  }

  async getBusinesses(term, location) {
    return axios.get(`https://api.yelp.com/v3/businesses/search?term=${term}&location=${location}`, yelpConfig)
      .then(({ data }) => {
        return data.businesses
      })
      .catch(console.log)
  }
}

module.exports.LuisBot = LuisBot;