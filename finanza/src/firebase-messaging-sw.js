// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyALwH5asTa2GD9u8XbOfabIVhAi2VPVTY8",
    authDomain: "finanzasduoc-bdd46.firebaseapp.com",
    projectId: "finanzasduoc-bdd46",
    storageBucket: "finanzasduoc-bdd46.firebasestorage.app",
    messagingSenderId: "587138149112",
    appId: "1:587138149112:web:c5c0577c030747c822a90d",
    measurementId: "G-LRQ50MG46C"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en background:', payload);

  const notificationTitle = payload.notification?.title || "Notificación";
  const notificationOptions = {
    body: payload.notification?.body || "Tienes una nueva notificación",
    icon: '/assets/icon/favicon.png' // cambiar icono al nuestro
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
