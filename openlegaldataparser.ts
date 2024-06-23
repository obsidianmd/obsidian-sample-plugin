import axios from 'axios';

// Configure API key authorization: api_key
const apiKey = "6e6a95bf6f99b1430ce89239aad0fd41e6159583"
// Uncomment the following line to set a prefix for the API key, e.g. "Token" (defaults to null)
//api_key.apiKeyPrefix['Authorization'] = "Token"

var callback = function(error: string, data: string, response: string) {
  
  if (error) {
    console.log(apiKey);
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};

export function getData(search: string) {
  const url = 'https://de.openlegaldata.io/api/laws/search/?format=json'

  return axios.get(`https://cors-anywhere.herokuapp.com/${url}&text=${encodeURIComponent(search)}`, {
    headers: {
      Authorization: apiKey
    }
  })

}