importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAdVdjbrf8KO5TqEx6JsMxqkD_SaR3Sqdk",
  authDomain: "studio-5418824271-71a21.firebaseapp.com",
  projectId: "studio-5418824271-71a21",
  messagingSenderId: "337798796195",
  appId: "1:337798796195:web:91b12a0ea1fce3e3b64016"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message: ', payload);
  
  const title = payload.notification?.title || payload.data?.title || 'FounderOS Update';
  const options = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: payload.data?.url || payload.notification?.clickAction || '/'
    }
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
