// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { initializeApp } from "firebase/app";
 import { getMessaging, getToken } from 'firebase/messaging';

export const environment = {
  production: false,
  apiUrl: 'https://capstone-api-8225.onrender.com/api/v1',
  firebaseConfig:{
    apiKey: "AIzaSyALwH5asTa2GD9u8XbOfabIVhAi2VPVTY8",
    authDomain: "finanzasduoc-bdd46.firebaseapp.com",
    projectId: "finanzasduoc-bdd46",
    storageBucket: "finanzasduoc-bdd46.firebasestorage.app",
    messagingSenderId: "587138149112",
    appId: "1:587138149112:web:c5c0577c030747c822a90d",
    measurementId: "G-LRQ50MG46C"
  },
  vapidKey: "BMd0JJGitRD56PfjkW_ihDPTjNZuUyZMDMTrcHrouNsQgVmHmh4bBLwfGFsZYu1_meVDrMpTXTc_Qg4Lq2Ho6vs"
}

// Initialize Firebase
const app = initializeApp(environment.firebaseConfig);

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
