import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import MisEntradasScreen from '../screens/MisEntradasScreen';
import LoginScreen from '../screens/LoginScreen';
import RegistroScreen from '../screens/RegistroScreen';
import PaymentScreen from '../screens/PaymentScreen';
import TicketDetailScreen from '../screens/TicketDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ScanQRScreen from '../screens/ScanQRScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import ArtistDashboardScreen from '../screens/ArtistDashboardScreen';
import ReviewsScreen from '../screens/ReviewsScreen';
import ArtistOnboardingScreen from '../screens/ArtistOnboardingScreen';
import TermsScreen from '../screens/TermsScreen';
import StaffLoginScreen from '../screens/StaffLoginScreen';
import AccessCodeScreen from '../screens/AccessCodeScreen';

export type RootStackParamList = {
  Home: undefined;
  EventDetail: { item: any };
  MisEntradas: undefined;
  Login: undefined;
  Registro: undefined;
  Payment: { evento: any; seat: string };
  TicketDetail: { entrada: any };
  Profile: undefined;
  ScanQR: undefined;
  Settings: undefined;
  CreateEvent: undefined;
  ArtistDashboard: undefined;
  Reviews: { eventoId: string; eventoNombre?: string };
  ArtistOnboarding: undefined;
  Terms: undefined;
  StaffLogin: undefined;
  AccessCode: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0D0D12' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        <Stack.Screen name="MisEntradas" component={MisEntradasScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Registro" component={RegistroScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ScanQR" component={ScanQRScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
        <Stack.Screen name="ArtistDashboard" component={ArtistDashboardScreen} />
        <Stack.Screen name="Reviews" component={ReviewsScreen} />
        <Stack.Screen name="ArtistOnboarding" component={ArtistOnboardingScreen} />
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="StaffLogin" component={StaffLoginScreen} />
        <Stack.Screen name="AccessCode" component={AccessCodeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
