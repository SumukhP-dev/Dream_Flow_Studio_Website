import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

const ONBOARDING_KEY = '@dreamflow:onboarding_completed';

export default function OnboardingScreen() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      setShowOnboarding(completed !== 'true');
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // Default to showing onboarding if check fails
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      router.replace('/(tabs)/generator');
    } catch (error) {
      console.error('Failed to save onboarding status:', error);
      router.replace('/(tabs)/generator');
    }
  };

  const handleOnboardingSkip = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      router.replace('/(tabs)/generator');
    } catch (error) {
      console.error('Failed to save onboarding status:', error);
      router.replace('/(tabs)/generator');
    }
  };

  // Show loading state while checking
  if (showOnboarding === null) {
    return <View style={styles.container} />;
  }

  // If onboarding already completed, redirect immediately
  if (!showOnboarding) {
    router.replace('/(tabs)/generator');
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <OnboardingFlow
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

