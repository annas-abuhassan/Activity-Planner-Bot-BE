const axios = require('axios');
const pluralize = require('pluralize');
const { ActivityTypes } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const shuffle = require('lodash.shuffle');
const { yelpConfig } = require('./config');
const {
  getFacebookData,
  reqFacebookLocation,
  sendTypingIndicator,
  sendCards
} = require('./utils');

class LuisBot {
  constructor(userState, application, luisPredictionOptions) {
    this.userState = userState;
    this.userChannel = userState.createProperty('userChannel');
    this.userName = userState.createProperty('userName');
    this.userId = userState.createProperty('userId');
    this.searchTerms = userState.createProperty('searchTerms');
    this.searchOffset = userState.createProperty('searchOffset');
    this.searchLocation = userState.createProperty('searchLocation');
    this.searchCategory = userState.createProperty('searchCategory');
    this.luisRecognizer = new LuisRecognizer(
      application,
      luisPredictionOptions,
      true
    );
  }

  async onTurn(turnContext) {
    if (!(await this.userChannel.get(turnContext))) {
      await this.userChannel.set(turnContext, turnContext.activity.channelId);
      await this.userId.set(turnContext, turnContext.activity.from.id);

      if (turnContext.activity.channelId === 'facebook') {
        await getFacebookData(await this.userId.get(turnContext)).then(
          async ({ first_name }) => {
            await this.userName.set(turnContext, first_name);
          }
        );
      }
    }

    if (turnContext.activity.type === ActivityTypes.Message) {
      if (turnContext.activity.text === 'More') {
        await this.searchOffset.set(
          turnContext,
          (await this.searchOffset.get(turnContext)) + 5 || 5
        );
        await this.userState.saveChanges(turnContext);
        await this.displayResults(turnContext);
      } else if (turnContext.activity.text === 'Done') {
        turnContext.sendActivity(
          'Great! Let me know if you want to search for something else :)'
        );
        await this.userState.clear(turnContext);
      } else {
        let intent, entities;

        if (turnContext.activity.text) {
          const results = await this.luisRecognizer.recognize(turnContext);
          ({ entities } = results);
          console.log(results);
          ({ intent } = this.getIntent(results));
        } else {
          intent = 'sendingLocation';
        }

        if (intent === 'findBusiness') {
          await this.parseEntities(turnContext, entities);
          const allSearchParamsPresent = await this.checkSearchParams(
            turnContext
          );
          if (allSearchParamsPresent) await this.displayResults(turnContext);
        } else if (intent === 'provideLocation') {
          await this.searchLocation.set(
            turnContext,
            await this.getLocation(turnContext, entities)
          );
          await this.userState.saveChanges(turnContext);
          const allSearchParamsPresent = await this.checkSearchParams(
            turnContext
          );
          if (allSearchParamsPresent) await this.displayResults(turnContext);
        } else if (intent === 'sendingLocation') {
          const { latitude, longitude } = turnContext.activity.entities[0].geo;
          await this.searchLocation.set(turnContext, { latitude, longitude });
          const allSearchParamsPresent = await this.checkSearchParams(
            turnContext
          );
          if (allSearchParamsPresent) await this.displayResults(turnContext);
        } else if (intent === 'None' || intent === undefined) {
          await turnContext.sendActivity(`I'm not sure what you mean... 🤔`);
          await turnContext.sendActivity(
            `Try asking for food or drink in your area 🍕 🍺 🍣 🍹`
          );
        } else if (intent === 'greetingIntent') {
          const name = await this.userName.get(turnContext);
          const randomGreeting = shuffle([
            'Hello',
            'Hey',
            'Hi',
            'Howdy',
            'Yo'
          ])[0];
          await turnContext.sendActivity(`${randomGreeting} ${name || ''}`);
        } else if (intent === 'requestHelp') {
          await turnContext.sendActivity(
            'I can help you to find restaurants, bars, pubs and cafes anywhere in the world! 🌍'
          );
          await turnContext.sendActivity(`Try asking me things like:\n
          "Where can I go for cocktails in London? 🍹" or\n 
          "Show me Italian restaurants in Manchester 🍝"`);
        }

        console.log(await this.searchLocation.get(turnContext));
        console.log(await this.searchCategory.get(turnContext));
        console.log(await this.searchTerms.get(turnContext));
      }

      // this bit does the welcome text
    } else if (
      turnContext.activity.type === ActivityTypes.ConversationUpdate &&
      turnContext.activity.recipient.id !==
        turnContext.activity.membersAdded[0].id
    ) {
      await turnContext.sendActivity(
        'Hey, I`m Daisy - what can I help you find?'
      );
    }
  }

  getIntent(results) {
    const intent = Object.keys(results.intents)[0];
    const { score } = results.intents[intent];
    return score >= 0.8 ? { intent } : { intent: undefined };
  }

  async parseEntities(turnContext, entities) {
    await this.searchLocation.set(
      turnContext,
      await this.getLocation(turnContext, entities)
    );
    await this.searchCategory.set(turnContext, this.getCategory(entities));
    await this.searchTerms.set(turnContext, this.getTerms(entities));
    await this.userState.saveChanges(turnContext);
  }

  async getLocation(turnContext, entities) {
    const currentLocation = await this.searchLocation.get(turnContext);
    if (!currentLocation) {
      // there are multiple geographyV2 categories, this captures any of them
      const geographyV2 = Object.keys(entities).filter(e =>
        e.startsWith('geographyV2')
      );
      return geographyV2.length > 0 ? entities[geographyV2][0] : undefined;
    } else return currentLocation;
  }

  getCategory(entities) {
    const categories = ['bars', 'cafes', 'pubs', 'restaurants'];
    const business = entities.business
      ? pluralize(entities.business[0])
      : undefined;
    return business && categories.includes(business)
      ? business
      : this.inferCategory(entities);
  }

  inferCategory(entities) {
    const entityLookup = {
      barDrink: 'bars',
      cafeDrink: 'cafes',
      cuisine: 'restaurants',
      meal: 'restaurants'
    };

    const entityKeys = Object.keys(entities);

    if (entityKeys.length > 1) {
      for (let i = 0; i < entityKeys.length; i++) {
        if (Object.keys(entityLookup).includes(entityKeys[i])) {
          return entityLookup[entityKeys[i]];
        }
      }
    }
    return undefined;
  }

  getTerms(entities) {
    const entitiesToCheck = ['cuisine', 'meal', 'barDrink'];
    const entityKeys = Object.keys(entities).filter(e =>
      entitiesToCheck.includes(e)
    );
    const terms = [];

    if (entityKeys.length > 0)
      entityKeys.forEach(entity => terms.push(entities[entity].join(' ')));
    return terms.length > 0 ? terms.join(' ') : undefined;
  }

  async checkSearchParams(turnContext) {
    if (!(await this.searchLocation.get(turnContext))) {
      if ((await this.userChannel.get(turnContext)) === 'facebook') {
        await sendTypingIndicator(
          await this.userId.get(turnContext),
          await this.userChannel.get(turnContext)
        );
        await reqFacebookLocation(await this.userId.get(turnContext));
        return false;
      } else {
        await turnContext.sendActivity(`Where do you want me to search?`);
        return false;
      }
    } else if (!(await this.searchCategory.get(turnContext))) {
      await turnContext.sendActivity('What type of thing are you looking for?');
      return false;
    }
    return true;
  }

  async getBusinesses(turnContext, terms, location, category) {
    console.log({ terms, location, category });
    const offset = (await this.searchOffset.get(turnContext)) || 0;
    terms = terms === undefined ? category : terms;
    const url =
      typeof location === 'string'
        ? `https://api.yelp.com/v3/businesses/search?term=${terms}&location=${location}&categories=${category}&limit=5&offset=${offset}`
        : `https://api.yelp.com/v3/businesses/search?term=${terms}&longitude=${
            location.longitude
          }&latitude=${location.latitude}&categories=${category}&limit=5`;

    return axios
      .get(url, yelpConfig)
      .then(({ data }) => data.businesses)
      .catch(console.log);
  }

  async displayResults(turnContext) {
    const offset = await this.searchOffset.get(turnContext);
    let location = await this.searchLocation.get(turnContext);
    const terms = await this.searchTerms.get(turnContext);
    const category = await this.searchCategory.get(turnContext);

    if (typeof location === 'string') {
      location = location.charAt(0).toUpperCase() + location.slice(1);
      await sendTypingIndicator(
        await this.userId.get(turnContext),
        await this.userChannel.get(turnContext)
      );
      if (!offset)
        await turnContext.sendActivity(
          `Sounds like you're looking for ${category} in ${location}`
        );
    } else {
      await sendTypingIndicator(
        await this.userId.get(turnContext),
        await this.userChannel.get(turnContext)
      );
      if (!offset)
        await turnContext.sendActivity(
          `Sounds like you're looking for ${category} nearby...`
        );
    }
    await sendTypingIndicator(
      await this.userId.get(turnContext),
      await this.userChannel.get(turnContext)
    );
    await turnContext.sendActivity('How about one of these?');

    await this.getBusinesses(turnContext, terms, location, category)
      .then(async businesses => {
        await sendCards(
          await this.userChannel.get(turnContext),
          businesses,
          await this.userId.get(turnContext),
          turnContext,
          location
        );
      })
      .catch(error => {
        console.log(error);
        turnContext.sendActivity(`${error}`);
      });
  }
}

module.exports.LuisBot = LuisBot;
