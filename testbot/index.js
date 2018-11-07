const restify = require('restify');
const path = require('path');
const { BotConfiguration } = require('botframework-config');
const { BotFrameworkAdapter, MemoryStorage, UserState } = require('botbuilder');
const { LuisBot } = require('./bot');
const { luisApplication } = require('./config');

const ENV_FILE = path.join(__dirname, '.env');
const env = require('dotenv').config({ path: ENV_FILE });

const BOT_FILE = path.join(__dirname, process.env.botFilePath || '');

let botConfig;
try {
  botConfig = BotConfiguration.loadSync(BOT_FILE, process.env.botFileSecret);
} catch (err) {
  console.log(err);
  console.error(
    `\nError reading bot file. Please ensure you have valid botFilePath and botFileSecret set for your environment.`
  );
  console.error(
    `\n - You can find the botFilePath and botFileSecret in the Azure App Service application settings.`
  );
  console.error(
    `\n - If you are running this bot locally, consider adding a .env file with botFilePath and botFileSecret.`
  );
  console.error(
    `\n - See https://aka.ms/about-bot-file to learn more about .bot file its use and bot configuration.\n\n`
  );
  process.exit();
}

const DEV_ENVIRONMENT = 'development';
const BOT_CONFIGURATION = process.env.NODE_ENV || DEV_ENVIRONMENT;

const endpointConfig = botConfig.findServiceByNameOrId(BOT_CONFIGURATION);

const adapter = new BotFrameworkAdapter({
  appId: endpointConfig.appId || process.env.microsoftAppID,
  appPassword: endpointConfig.appPassword || process.env.microsoftAppPassword,
  openIdMetadata: process.env.BotOpenIdMetadata
});

// Create HTTP server.
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
  console.log(`\n${server.name} listening to ${server.url}`);
});

const luisPredictionOptions = {
  includeAllIntents: true,
  log: true,
  staging: false
};

// Define state store for your bot.
const memoryStorage = new MemoryStorage();
const userState = new UserState(memoryStorage);

const bot = new LuisBot(userState, luisApplication, luisPredictionOptions);

// Listen for incoming requests.

server.post('/api/messages', (req, res) => {
  adapter.processActivity(req, res, async turnContext => {
    // console.log(req);
    await bot.onTurn(turnContext);
  });
});
