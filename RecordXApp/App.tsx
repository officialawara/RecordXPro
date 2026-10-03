import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ShareMenu from 'react-native-share-menu';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Video from 'react-native-video';
import { WebView } from 'react-native-webview';
import * as RNIap from 'react-native-iap';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';
// Pseudo-imports for Auth
// import auth from '@react-native-firebase/auth';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';

const Stack = createNativeStackNavigator();

// Define consumable SKUs (Credit packs)
const itemSKUs = Platform.select({
  ios: ['com.recordxapp.credits_25', 'com.recordxapp.credits_100'],
  android: ['com.recordxapp.credits_25', 'com.recordxapp.credits_100'],
}) as string[];

const bannerAdUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyyyy';

// LOGIN SCREEN (Google & Phone)
const LoginScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState<any>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    // Real implementation:
    // const { idToken } = await GoogleSignin.signIn();
    // const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    // await auth().signInWithCredential(googleCredential);
    
    setTimeout(async () => {
      await AsyncStorage.setItem('userEmail', 'user@gmail.com');
      navigation.replace('Home');
    }, 1000);
  };

  const handlePhoneLogin = async () => {
    if (!phoneNumber || phoneNumber.length < 10) return Alert.alert('Error', 'Enter a valid phone number');
    setLoading(true);
    // Real implementation:
    // const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
    // setConfirm(confirmation);
    
    setTimeout(() => {
      setConfirm(true);
      setLoading(false);
    }, 1000);
  };

  const handleConfirmCode = async () => {
    if (!code) return;
    setLoading(true);
    // Real implementation:
    // await confirm.confirm(code);
    
    setTimeout(async () => {
      await AsyncStorage.setItem('userEmail', phoneNumber);
      navigation.replace('Home');
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to RecordX</Text>
        <Text style={styles.subtitle}>Sign in securely to start streaming</Text>

        {!confirm ? (
          <>
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={loading}>
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Phone Number (e.g. +1234567890)"
              placeholderTextColor="#888"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
            <TouchableOpacity style={styles.phoneButton} onPress={handlePhoneLogin} disabled={loading}>
              <Text style={styles.buttonText}>Send SMS Code</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit code"
              placeholderTextColor="#888"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
            />
            <TouchableOpacity style={styles.phoneButton} onPress={handleConfirmCode} disabled={loading}>
              <Text style={styles.buttonText}>Verify & Login</Text>
            </TouchableOpacity>
          </>
        )}
        
        {loading && <ActivityIndicator color="#007AFF" style={{ marginTop: 20 }} />}
      </View>
    </SafeAreaView>
  );
};

// HOME SCREEN
const HomeScreen = ({ navigation }: any) => {
  const [url, setUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [extractionMethod, setExtractionMethod] = useState<'direct' | 'webpage' | 'cloud'>('direct');
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Usage & Credit State
  const [streamCount, setStreamCount] = useState(0);
  const [recordCredits, setRecordCredits] = useState(1); // Free users get 1 free record credit
  const FREE_STREAM_LIMIT = 2;

  useEffect(() => {
    const loadUsageAndAuth = async () => {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        navigation.replace('Login');
        return;
      }

      const streams = await AsyncStorage.getItem(`streams_${email}`);
      const credits = await AsyncStorage.getItem(`credits_${email}`);
      if (streams) setStreamCount(parseInt(streams));
      if (credits) {
        setRecordCredits(parseInt(credits));
      } else {
        // Initialize with 1 free credit
        await AsyncStorage.setItem(`credits_${email}`, '1');
      }
    };
    loadUsageAndAuth();
  }, [navigation]);

  // Handle Consumable Purchases
  useEffect(() => {
    const initIAP = async () => {
      try {
        await RNIap.initConnection();
      } catch (err: any) {
        console.warn('IAP Init Error:', err.message);
      }
    };
    initIAP();

    const purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
      if (purchase.transactionReceipt) {
        try {
          // If consumable, we finish it
          await RNIap.finishTransaction({ purchase, isConsumable: true });
          
          // Add credits based on product ID
          const addedCredits = purchase.productId === 'com.recordxapp.credits_25' ? 25 : 100;
          const newTotal = recordCredits + addedCredits;
          
          setRecordCredits(newTotal);
          const email = await AsyncStorage.getItem('userEmail');
          await AsyncStorage.setItem(`credits_${email}`, newTotal.toString());
          
          Alert.alert('Thank you!', `Successfully added ${addedCredits} recording credits to your account.`);
        } catch (ackErr) {}
      }
      setIsPurchasing(false);
    });

    const purchaseErrorSubscription = RNIap.purchaseErrorListener(() => {
      setIsPurchasing(false);
    });

    return () => {
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
      RNIap.endConnection();
    };
  }, [recordCredits]);

  const handleShare = useCallback((item: any) => {
    if (item?.data) setUrl(item.data);
  }, []);

  useEffect(() => {
    ShareMenu.getInitialShare(handleShare);
    const listener = ShareMenu.addNewShareListener(handleShare);
    return () => listener.remove();
  }, [handleShare]);

  const handleBuyCredits = async (sku: string) => {
    try {
      setIsPurchasing(true);
      await RNIap.getProducts({ skus: itemSKUs });
      await RNIap.requestPurchase({ sku });
    } catch (err: any) {
      setIsPurchasing(false);
      Alert.alert('Purchase Error', err.message);
    }
  };

  const showStore = () => {
    Alert.alert(
      'Buy Recording Credits',
      'You are out of credits! Purchase a pack to continue background recording.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '$20 for 25 Records', onPress: () => handleBuyCredits('com.recordxapp.credits_25') },
        { text: '$50 for 100 Records', onPress: () => handleBuyCredits('com.recordxapp.credits_100') }
      ]
    );
  };

  const incrementStream = async () => {
    const email = await AsyncStorage.getItem('userEmail');
    const newCount = streamCount + 1;
    setStreamCount(newCount);
    await AsyncStorage.setItem(`streams_${email}`, newCount.toString());
  };

  const decrementCredit = async () => {
    const email = await AsyncStorage.getItem('userEmail');
    const newCount = recordCredits - 1;
    setRecordCredits(newCount);
    await AsyncStorage.setItem(`credits_${email}`, newCount.toString());
  };

  const handleStream = () => {
    if (!url) return Alert.alert('Error', 'Please enter a valid URL');

    // If they have no credits left AND they used up free streams, block them.
    if (recordCredits <= 0 && streamCount >= FREE_STREAM_LIMIT) {
      return Alert.alert(
        'Free Limit Reached',
        `You have used your ${FREE_STREAM_LIMIT} free streams. Purchase recording credits to unlock unlimited streaming!`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Store', onPress: showStore }
        ]
      );
    }

    // If they have credits, streaming is unlimited and doesn't consume a credit.
    // If they are on free tier, streaming consumes the free stream count.
    if (recordCredits <= 0) {
      incrementStream();
    }

    if (extractionMethod === 'direct') {
      navigation.navigate('Player', { streamUrl: url });
    } else {
      navigation.navigate('WebPlayer', { streamUrl: url });
    }
  };

  const executeDownload = async (downloadUrl: string) => {
    setIsRecording(true);
    setDownloadProgress(0);
    
    // Deduct 1 credit
    await decrementCredit();

    const dirs = ReactNativeBlobUtil.fs.dirs;
    const fileName = `RecordX_${Date.now()}.mp4`;
    const filePath = `${dirs.DocumentDir}/${fileName}`;

    try {
      const task = ReactNativeBlobUtil.config({
        path: filePath,
        fileCache: true,
        appendExt: 'mp4',
        indicator: true,
        IOSBackgroundTask: true,
      }).fetch('GET', downloadUrl);

      task.progress((received, total) => setDownloadProgress((received / total) * 100));

      const res = await task;
      Alert.alert('Success', `Stream recorded and saved to: ${res.path()}`);
    } catch (error: any) {
      Alert.alert('Download Error', error.message || 'Failed to record stream');
    } finally {
      setIsRecording(false);
      setDownloadProgress(0);
    }
  };

  const handleRecord = async () => {
    if (!url) return Alert.alert('Error', 'Please enter a valid URL');
    
    if (recordCredits <= 0) {
      return showStore();
    }

    if (extractionMethod === 'cloud') {
      setIsRecording(true);
      try {
        const response = await fetch('http://localhost:3000/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await response.json();
        if (data.rawStreamUrl) {
          executeDownload(data.rawStreamUrl);
        } else {
          Alert.alert('Error', data.error || 'Could not resolve video URL');
          setIsRecording(false);
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to connect to Cloud Extractor API');
        setIsRecording(false);
      }
    } else {
      if (extractionMethod === 'webpage') {
        Alert.alert('Notice', 'For webpage recording, please use the Cloud Extractor method.');
      } else {
        executeDownload(url);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>RecordX Pro</Text>
        
        <View style={styles.creditsContainer}>
          <Text style={styles.creditsText}>
            {recordCredits > 0 ? `Recording Credits: ${recordCredits}` : 'Out of Credits!'}
          </Text>
          {recordCredits <= 0 && streamCount < FREE_STREAM_LIMIT && (
            <Text style={styles.subCreditsText}>Free Streams Remaining: {FREE_STREAM_LIMIT - streamCount}</Text>
          )}
        </View>

        {recordCredits <= 0 && (
          <TouchableOpacity style={styles.upgradeBanner} onPress={showStore} disabled={isPurchasing}>
            {isPurchasing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.upgradeText}>🛒 Buy Recording Credits Pack</Text>}
          </TouchableOpacity>
        )}

        <TextInput
          style={styles.input}
          placeholder="Paste video stream URL here..."
          placeholderTextColor="#888"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.methodTitle}>URL Type:</Text>
        <View style={styles.methodContainer}>
          <TouchableOpacity style={[styles.methodButton, extractionMethod === 'direct' && styles.methodActive]} onPress={() => setExtractionMethod('direct')}>
            <Text style={[styles.methodText, extractionMethod === 'direct' && styles.methodTextActive]}>Direct Media</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.methodButton, extractionMethod === 'webpage' && styles.methodActive]} onPress={() => setExtractionMethod('webpage')}>
            <Text style={[styles.methodText, extractionMethod === 'webpage' && styles.methodTextActive]}>Web Player</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.methodButton, extractionMethod === 'cloud' && styles.methodActive]} onPress={() => setExtractionMethod('cloud')}>
            <Text style={[styles.methodText, extractionMethod === 'cloud' && styles.methodTextActive]}>Cloud Resolve</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.streamButton]} onPress={handleStream}>
            <Text style={styles.buttonText}>Stream</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.recordButton]} onPress={handleRecord} disabled={isRecording}>
            {isRecording ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Record (1 Credit)</Text>}
          </TouchableOpacity>
        </View>

        {isRecording && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Downloading/Extracting: {downloadProgress.toFixed(1)}%</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${downloadProgress}%` }]} />
            </View>
          </View>
        )}
      </View>

      {/* BANNER AD */}
      {recordCredits <= 0 && (
        <View style={styles.bannerAdContainer}>
          <BannerAd unitId={bannerAdUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} />
        </View>
      )}
    </SafeAreaView>
  );
};

// PLAYER SCREEN (Direct Video)
const PlayerScreen = ({ route }: any) => {
  const { streamUrl } = route.params;
  return (
    <View style={styles.playerContainer}>
      <Video source={{ uri: streamUrl }} style={styles.video} controls={true} resizeMode="contain" />
    </View>
  );
};

// WEB PLAYER SCREEN (Webpage)
const WebPlayerScreen = ({ route }: any) => {
  const { streamUrl } = route.params;
  return (
    <View style={styles.playerContainer}>
      <WebView source={{ uri: streamUrl }} style={styles.video} allowsInlineMediaPlayback={true} mediaPlaybackRequiresUserAction={false} />
    </View>
  );
};

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'RecordX', headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="Player" component={PlayerScreen} options={{ title: 'Direct Player' }} />
        <Stack.Screen name="WebPlayer" component={WebPlayerScreen} options={{ title: 'Web Browser' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  creditsContainer: { backgroundColor: '#e3f2fd', padding: 10, borderRadius: 8, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#bbdefb' },
  creditsText: { fontSize: 16, color: '#1565c0', fontWeight: 'bold' },
  subCreditsText: { fontSize: 12, color: '#5c6bc0', marginTop: 4 },
  upgradeBanner: { backgroundColor: '#FF9500', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 25 },
  upgradeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 15, fontSize: 16, marginBottom: 15 },
  
  googleButton: { backgroundColor: '#DB4437', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  googleButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  phoneButton: { backgroundColor: '#34C759', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#ddd' },
  dividerText: { marginHorizontal: 10, color: '#888', fontWeight: 'bold' },
  
  methodTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#444' },
  methodContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  methodButton: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#007AFF', marginHorizontal: 2, borderRadius: 5, alignItems: 'center' },
  methodActive: { backgroundColor: '#007AFF' },
  methodText: { fontSize: 12, color: '#007AFF', fontWeight: 'bold' },
  methodTextActive: { color: '#fff' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  streamButton: { backgroundColor: '#007AFF' },
  recordButton: { backgroundColor: '#34C759' },
  disabledButton: { backgroundColor: '#A0A0A0' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  progressContainer: { marginTop: 20 },
  progressText: { textAlign: 'center', marginBottom: 8, color: '#333' },
  progressBarBg: { height: 10, backgroundColor: '#ddd', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '10%', backgroundColor: '#34C759' },
  playerContainer: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  bannerAdContainer: { width: '100%', alignItems: 'center', paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
});

export default App;
