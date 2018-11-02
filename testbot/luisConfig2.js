/*
this config file is for the LUIS model with a single
findBusiness intent and a wider range of entities
*/

const luisApplication = {
  applicationId: '91052ebe-d6d3-4323-969d-9968f312160a',
  endpointKey: '2e790269706e4920bbb7ffd82a29dc1d',
  endpoint: 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/91052ebe-d6d3-4323-969d-9968f312160a?subscription-key=2e790269706e4920bbb7ffd82a29dc1d&timezoneOffset=-360&q='
};

module.exports = luisApplication;