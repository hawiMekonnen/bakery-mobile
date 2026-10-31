import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '../theme/colors';

export const EULA_STORAGE_KEY = '@skykin_eula_accepted_v1';

export default function EulaModal({
  visible,
  onClose,
  isFirstTimeSetup = false,
  onAccept = null,
}) {
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (visible) {
      checkExistingAcceptance();
    }
  }, [visible]);

  const checkExistingAcceptance = async () => {
    try {
      const raw = await AsyncStorage.getItem(EULA_STORAGE_KEY);
      if (raw && !isFirstTimeSetup) {
        setAgreed(true);
      }
    } catch (e) {}
  };

  const handleConfirmAccept = async () => {
    if (!agreed) {
      Alert.alert('Agreement Required', 'Please check the box to confirm that you accept the License Agreement.');
      return;
    }

    try {
      const record = {
        accepted: true,
        acceptedAt: new Date().toISOString(),
        version: '1.0',
      };
      await AsyncStorage.setItem(EULA_STORAGE_KEY, JSON.stringify(record));
      if (onAccept) onAccept(record);
      if (onClose) onClose();
    } catch (e) {
      if (onClose) onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isFirstTimeSetup && onClose) onClose();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>License Agreement & Terms of Service</Text>
              <Text style={styles.subtitle}>Please review the agreement to continue</Text>
            </View>
            {!isFirstTimeSetup && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Plain Text Body */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={true}>
            <Text style={styles.noticeHeading}>Important Notice</Text>
            <Text style={styles.plainText}>
              This software is provided strictly as an internal inventory, management, and sales-tracking tool. It is NOT an official tax machine or registered fiscal cash register (ERCA / Ministry of Revenue). Receipts generated are for internal order tracking and do not constitute fiscal tax invoices.
            </Text>

            <Text style={styles.sectionHeading}>1. Grant of License</Text>
            <Text style={styles.plainText}>
              SkyKin Technologies PLC grants you a non-exclusive, non-transferable, revocable license to use this internal Point-of-Sale and Inventory Management Application solely for your internal business operations on authorized devices.
            </Text>

            <Text style={styles.sectionHeading}>2. Intellectual Property & Restrictions</Text>
            <Text style={styles.plainText}>
              The software, including its source code, design, database structure, and documentation, is the exclusive intellectual property of the licensor. You agree not to copy, modify, translate, reverse-engineer, decompile, resell, or distribute the software to any third party.
            </Text>

            <Text style={styles.sectionHeading}>3. Tax & Regulatory Responsibility</Text>
            <Text style={styles.plainText}>
              The licensee is solely responsible for complying with all applicable local tax laws, VAT regulations, and statutory reporting obligations, including the use of certified fiscal printers where required by law.
            </Text>

            <Text style={styles.sectionHeading}>4. Data Ownership & Storage</Text>
            <Text style={styles.plainText}>
              All business transaction records, order history, and product details entered into the application remain 100% the property of the client. Data is stored on your device and synced locally. The client is responsible for regular operational data management.
            </Text>

            <Text style={styles.sectionHeading}>5. Limitation of Liability</Text>
            <Text style={styles.plainText}>
              The software is provided on an "as-is" and "as-available" basis. In no event shall the licensor be liable for indirect, incidental, or consequential damages, loss of business data, cash drawer discrepancies, or hardware failures.
            </Text>

            <Text style={styles.sectionHeading}>6. Termination</Text>
            <Text style={styles.plainText}>
              The licensor reserves the right to terminate access if license terms are violated. Upon termination, use of the software must immediately cease.
            </Text>
          </ScrollView>

          {/* Footer with Checkbox & Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreed(!agreed)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                {agreed && <Ionicons name="checkmark" size={15} color="#FFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I accept the License Agreement and Terms of Service.
              </Text>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              {!isFirstTimeSetup && (
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.acceptBtn, (!agreed && isFirstTimeSetup) && styles.acceptBtnDisabled]}
                onPress={handleConfirmAccept}
                disabled={!agreed && isFirstTimeSetup}
                activeOpacity={0.85}
              >
                <Text style={styles.acceptBtnText}>
                  {isFirstTimeSetup ? 'Accept & Continue to POS' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    padding: 22,
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    marginVertical: 10,
    maxHeight: 340,
    paddingRight: 6,
  },
  noticeHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 14,
    marginBottom: 4,
  },
  plainText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  footer: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.borderDark || '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: COLORS.background,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  acceptBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
});
