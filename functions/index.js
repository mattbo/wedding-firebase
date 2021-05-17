const functions = require("firebase-functions");
const got = require('got')

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
//

const request = require('request');
const admin = require('firebase-admin');
admin.initializeApp();


// Take a text parameter passed ot the HTTP endpoint 
// and insert it into Firestore under the path /messages/:documentId/original
exports.addMessage = functions.https.onRequest(async (req, res) => {
    //Grab the text parameter
    const original = req.query.text;
    // Push the new message into RealtimeDB using the admin SDK
    const writeResult = await admin.firestore()
        .collection('messages').add({original: original});
    // Send back a message that we've successfully written the msg
    res.json({result: `Message with ID: ${writeResult.id} added.`});
});

// Listen for new messages added to /messages/:documentId/original and
// creates an uppercase version of the message to 
// /messages/:documentId/uppercase
exports.makeUppercase = functions.firestore.document(`/messages/{documentId}`)
    .onCreate((snap, context) => {
        // Grab the current value of what was written to Firestore.
        const original = snap.data().original;

        // Access the parameter `{documentId}` with `context.params`
        functions.logger.log('Uppercasing', context.params.documentId,
                             original);

        const uppercase = original.toUpperCase();

        // You must return a Promise when performing asynchronous tasks
        // inside a Functions, such as writing to Firestore.
        // Setting an 'uppercase' field in a Firestore document returns a
        // Promise.
        return snap.ref.set({uppercase}, {merge: true});
    });

// MSB: attempt to refresh the spotify api token
// app.get('/refresh_token', function(req, res) {
//exports.getToken = functions.https.onRequest(async (req, res) => {
//exports.getToken = functions.https.onRequest(async (req, res) => {
exports.getToken = functions.https.onCall(async (req, res) => {

  // requesting access token from refresh token
  return admin.database()
        .ref("/spotify")
        .once('value').then( snapshot => {
    let refresh_token = snapshot.val().refresh_token;
    let client_id = snapshot.val().client_id;
    let client_secret = snapshot.val().client_secret;

    const url = 'https://accounts.spotify.com/api/token';
    const authOptions = {
      method: 'post',
      headers: { 'Authorization': 'Basic ' +
        (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      form: {
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token
      }
    };

    return got.post(url, authOptions).json().then( json => {
        functions.logger.log('Got result', json.access_token);
        admin.database().ref("spotify/accessToken").set(json.access_token);
        return {access_token: json.access_token};
    });
  });
});

// Old way
exports.getToken2 = functions.https.onRequest(async (req, res) => {

  // requesting access token from refresh token
  const access_token = admin.database()
        .ref("/spotify")
        .once('value', function(snapshot) {
    let refresh_token = snapshot.val().refresh_token;
    let client_id = snapshot.val().client_id;
    let client_secret = snapshot.val().client_secret;

    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      headers: { 'Authorization': 'Basic ' +
        (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      form: {
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        access_token = body.access_token;
        functions.logger.log('Got access token', access_token);
        res.json(access_token)
      } else {
        functions.logger.log("Problem getting token", error);
        res.json({access_token: "problem"});
      }
    });
  });
});
