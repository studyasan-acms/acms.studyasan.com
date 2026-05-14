import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.acms.studyasan',
  appName: 'StudyAsan',
  webDir: 'dist',
  server: {
    // For production, the app will use the built-in dist files.
    // The API URL is set via VITE_API_URL env variable at build time.
    // During development, you can uncomment the line below to use live reload:
    // url: 'http://YOUR_LOCAL_IP:5173',
    androidScheme: 'https',
    allowNavigation: [
      'acms.studyasan.com',
      'janus.studyasan.com',
      'localhost'
    ]
  },
  android: {
    allowMixedContent: true, // Allow HTTP during development
    backgroundColor: '#0276D3'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0276D3',
      showSpinner: false
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0276D3'
    }
  }
};

export default config;
