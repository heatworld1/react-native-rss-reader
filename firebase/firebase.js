import firebase from 'firebase';

// Initialize Firebase
const config = {
  apiKey: "AIzaSyB138IdjEXmkq-j1bl_7bshyiLibNVDPbw",
  authDomain: "reader-x.firebaseapp.com",
  databaseURL: "https://reader-x.firebaseio.com",
  projectId: "reader-x",
  storageBucket: "reader-x.appspot.com",
  messagingSenderId: "346682813178"
};

if (!firebase.apps.length) {
  firebase.initializeApp(config);
}

const auth = firebase.auth();

export {
  auth,
  firebase
};
