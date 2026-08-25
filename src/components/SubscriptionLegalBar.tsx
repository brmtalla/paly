import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PRIVACY_URL, TERMS_URL } from '../lib/constants';
import { SPACING } from '../theme/spacing';

/**
 * Auto-renewable subscriptions have to disclose the renewal terms and offer
 * working links to the EULA and the privacy policy *inside the app*
 * (App Store Review Guideline 3.1.2(c)).
 *
 * The RevenueCat paywall has its own footer links, but those are configured in
 * a dashboard and shipped from RevenueCat's servers — they were pointing at
 * `https://example.com` for the whole of the first submission, which is exactly
 * what got 1.0 rejected. Nothing in the binary guarded that.
 *
 * This bar is that guard. It renders underneath the hosted paywall, so the
 * required disclosure and both links are present even if the paywall fails to
 * load, an offering is missing, or someone edits the dashboard again.
 */
export function SubscriptionLegalBar() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
      <Text style={styles.terms}>
        Paly Pro is an auto-renewing subscription. It renews at the price shown above unless
        cancelled at least 24 hours before the period ends. Manage it in Settings.
      </Text>

      <View style={styles.links}>
        <Pressable
          onPress={() => Linking.openURL(TERMS_URL)}
          hitSlop={SPACING.sm}
          accessibilityRole="link"
          accessibilityLabel="Terms of Use, opens in your browser"
        >
          <Text style={styles.link}>Terms of Use (EULA)</Text>
        </Pressable>

        <Text style={styles.separator}>·</Text>

        <Pressable
          onPress={() => Linking.openURL(PRIVACY_URL)}
          hitSlop={SPACING.sm}
          accessibilityRole="link"
          accessibilityLabel="Privacy Policy, opens in your browser"
        >
          <Text style={styles.link}>Privacy Policy</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Deliberately not themed: this sits under a paywall whose colours come from
// RevenueCat, so it uses fixed neutrals that stay legible against any of them.
const styles = StyleSheet.create({
  bar: {
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E3E3E8',
  },
  terms: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
    color: '#6B6B75',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  link: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2050B0',
    textDecorationLine: 'underline',
  },
  separator: {
    fontSize: 12,
    color: '#A3A3AD',
  },
});
