const restify = require('restify');
const botbuilder = require('botbuilder');
const { LuisBot } = require('./bot');
const luisApplication = require('./luisConfig');
 
// Create bot adapter, which defines how the bot sends and receives messages.
var adapter = new botbuilder.BotFrameworkAdapter({
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

const bot = new LuisBot(luisApplication, luisPredictionOptions);

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async(turnContext) => {
        await bot.onTurn(turnContext);
    });
});