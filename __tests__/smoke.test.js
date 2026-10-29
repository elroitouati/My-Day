jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('react-native-android-widget', () => ({
  requestWidgetUpdate: jest.fn(),
  FlexWidget: 'FlexWidget',
  TextWidget: 'TextWidget',
  SvgWidget: 'SvgWidget',
  ListWidget: 'ListWidget',
  ImageWidget: 'ImageWidget',
  OverlapWidget: 'OverlapWidget',
  WidgetPreview: 'WidgetPreview',
}));
test('modules load', () => {
  require('../src/onboarding/Onboarding');
  require('../src/sheets/WhatsNewSheet');
  require('../src/components/UpdateBanner');
  require('../src/services/background');
  require('../src/screens/SettingsScreen');
});
