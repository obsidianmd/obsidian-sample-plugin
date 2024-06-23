var OldpApi = require('oldp-api');

export const testlaw = OldpApi.LawSearch("1");

var defaultClient = OldpApi.ApiClient.instance;

// Configure API key authorization: api_key
var api_key = defaultClient.authentications['api_key'];
api_key.apiKey = "6e6a95bf6f99b1430ce89239aad0fd41e6159583"
// Uncomment the following line to set a prefix for the API key, e.g. "Token" (defaults to null)
//api_key.apiKeyPrefix['Authorization'] = "Token"

var api = new OldpApi.AnnotationLabelsApi()

var data = new OldpApi.AnnotationLabel(); // {AnnotationLabel} 


var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
api.annotationLabelsCreate(data, callback);
