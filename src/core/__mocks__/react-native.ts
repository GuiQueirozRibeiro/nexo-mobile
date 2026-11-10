export const View = 'View';
export const Text = 'Text';
export const TouchableOpacity = 'TouchableOpacity';
export const StyleSheet = {
  create: (styles: Record<string, unknown>) => styles,
};
export const SafeAreaView = 'SafeAreaView';
export const ScrollView = 'ScrollView';
export const ActivityIndicator = 'ActivityIndicator';
export const TextInput = 'TextInput';
export const Alert = {
  alert: () => {},
};
export const AppState = {
  currentState: 'active',
  addEventListener: () => ({ remove: () => {} }),
};
export const RefreshControl = 'RefreshControl';
export const Platform = { OS: 'ios' };
export const Share = { share: async () => ({}) };

