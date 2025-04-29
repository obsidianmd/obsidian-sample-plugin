const OldpApi = require('oldp-api');

var defaultClient = OldpApi.ApiClient.instance;

var api_key = defaultClient.authentications['api_key'];
api_key.apiKey = "YOUR API KEY";

var LawBooksApi = new OldpApi.LawBooksApi();




