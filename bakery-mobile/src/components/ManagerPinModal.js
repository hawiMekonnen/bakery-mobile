import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
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

  const handleVerify = () => {
    if (pinInput === currentPin) {
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
      setPinInput('');
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
        // Auto-verify on 4th digit
        if (next === currentPin) {
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
            <Ionicons name="shield-checkmark" size={28} color="#D97706" />
          </View>
          <Text style={styles.title}>{actionTitle}</Text>
          <Text style={styles.description}>{actionDescription}</Text>

          {/* PIN Dots Display */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map(idx => (
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
              ['C', '0', '⌫'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map(k => (
                  <TouchableOpacity
                    key={k}
                    style={[styles.keypadBtn, k === 'C' || k === '⌫' ? styles.keypadBtnFn : null]}
                    onPress={() => {
                      if (k === 'C') setPinInput('');
                      else if (k === '⌫') handleDeleteDigit();
                      else handleNumberPress(k);
                    }}
                    activeOpacity={0.65}
                  >
                    <Text style={[styles.keypadBtnText, k === 'C' || k === '⌫' ? styles.keypadBtnFnText : null]}>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
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
    borderColor: '#CBD5E1',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dotError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.danger,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '700',
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
    gap: 14,
  },
  keypadBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  keypadBtnFn: {
    backgroundColor: '#F1F5F9',
  },
  keypadBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  keypadBtnFnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
});
