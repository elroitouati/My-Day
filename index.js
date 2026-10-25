// נקודת הכניסה: האפליקציה, מטפל הווידג'ט, משימת הרקע ותגובות להתראות.
import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import App from './App';
import { widgetTaskHandler } from './src/widget/handler';
import './src/services/background';
import { installNotificationResponseHandler } from './src/services/notificationResponses';

registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
installNotificationResponseHandler();
