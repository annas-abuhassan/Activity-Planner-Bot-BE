const restify = require('restify');
const { BotFrameworkAdapter, MemoryStorage, UserState } = require('botbuilder');
const { LuisBot } = require('./bot');
const luisApplication = require('./luisConfig');
 
// Create bot adapter, which defines how the bot sends and receives messages.
var adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});
 
// Create HTTP server.
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
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
    adapter.processActivity(req, res, async(turnContext) => {
        await bot.onTurn(turnContext);
    });
});