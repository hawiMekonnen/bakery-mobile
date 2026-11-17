import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import { useBakery } from '../store/BakeryStore';

export default function ManagerPinModal({
  visible,
  onClose,
  onSuccess,
  actionTitle = 'Manager Authorization',
  actionDescription = 'Please enter your 4-digit Manager PIN to continue.',
}) {
  const { state, dispatch } = useBakery();
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  const currentPin = state.security?.managerPin || '1234';

  const handleVerify = (pin) => {
    if (pin === currentPin) {
      setError('');
      setPinInput('');
      dispatch({
        type: 'ADD_SECURITY_LOG',
        payload: {
          event: 'PIN_AUTH_SUCCESS',
          description: `Authorized action: "${actionTitle}"`,
          timestamp: new Date().toISOString(),
          user: state.auth?.username || 'admin',
        },
      });
      onSuccess();
      onClose();
    } else {
      setError('Incorrect PIN. Authorization denied.');
      setTimeout(() => setPinInput(''), 400);
      dispatch({
        type: 'ADD_SECURITY_LOG',
        payload: {
          event: 'PIN_AUTH_FAILED',
          description: `Failed PIN attempt for action: "${actionTitle}"`,
          timestamp: new Date().toISOString(),
          user: state.auth?.username || 'admin',
        },
      });
    }
  };

  const handleCancel = () => {
    setError('');
    setPinInput('');
    onClose();
  };

  const handleNumberPress = (num) => {
    if (pinInput.length < 4) {
      const next = pinInput + num;
      setPinInput(next);
      setError('');
      if (next.length === 4) {
        handleVerify(next);
      }
    }
  };

  const handleDeleteDigit = () => {
    if (pinInput.length > 0) {
      setPinInput(pinInput.slice(0, -1));
      setError('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={26} color={COLORS.brandGreenText} />
          </View>
          <Text style={styles.title}>{actionTitle}</Text>
          <Text style={styles.description}>{actionDescription}</Text>

          {/* PIN Dots Display */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx < pinInput.length && styles.dotFilled,
                  error ? styles.dotError : null,
                ]}
              />
            ))}
          </View>

          {/* Error Message */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Numeric Keypad */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['C', '0', 'DEL'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((k) => (
                  <TouchableOpacity
                    key={k}
                    style={[styles.keypadBtn, (k === 'C' || k === 'DEL') && styles.keypadBtnFn]}
                    onPress={() => {
                      if (k === 'C') setPinInput('');
                      else if (k === 'DEL') handleDeleteDigit();
                      else handleNumberPress(k);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.keypadBtnText,
                        (k === 'C' || k === 'DEL') && styles.keypadBtnFnText,
                      ]}
                    >
                      {k}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 31, 23, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...SHADOWS.hero,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: FONTS.h2,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
    textAlign: 'center',
  },
  description: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.brandDarkGreen,
    borderColor: COLORS.brandDarkGreen,
  },
  dotError: {
    borderColor: COLORS.dangerText,
    backgroundColor: COLORS.dangerText,
  },
  errorText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.dangerText,
    marginBottom: 8,
    textAlign: 'center',
  },
  keypad: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  keypadBtn: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.appBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadBtnFn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  keypadBtnText: {
    fontSize: 22,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
  },
  keypadBtnFnText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.muted,
  },
  cancelBtn: {
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.muted,
  },
});
