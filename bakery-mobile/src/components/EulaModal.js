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
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';

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
              <Text style={styles.title}>License Agreement & Terms</Text>
              <Text style={styles.subtitle}>Please review the operational terms</Text>
            </View>
            {!isFirstTimeSetup && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={COLORS.ink} />
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
              Skyservice Bakery POS grants you a non-exclusive, non-transferable, revocable license to use this internal Point-of-Sale and Inventory Management Application solely for your internal business operations on authorized devices.
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

          {/* Footer Checkbox & Accept Button */}
          <View style={styles.footer}>
            {isFirstTimeSetup && (
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAgreed(!agreed)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                  {agreed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  I confirm that I have read and agree to all software license terms and notices.
                </Text>
              </TouchableOpacity>
            )}

            {isFirstTimeSetup ? (
              <TouchableOpacity
                style={[styles.acceptBtn, !agreed && { opacity: 0.5 }]}
                onPress={handleConfirmAccept}
                disabled={!agreed}
                activeOpacity={0.88}
              >
                <Text style={styles.acceptBtnText}>Accept & Continue</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={onClose}
                activeOpacity={0.88}
              >
                <Text style={styles.acceptBtnText}>Understood</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 31, 23, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 22,
    ...SHADOWS.hero,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  title: {
    fontSize: FONTS.h3,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
  },
  subtitle: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.appBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingVertical: 14,
  },
  noticeHeading: {
    fontSize: 13,
    fontFamily: FONTS.extraBold,
    color: COLORS.warningText,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
    marginTop: 12,
    marginBottom: 4,
  },
  plainText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 6,
  },
  footer: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: COLORS.appBg,
  },
  checkboxActive: {
    backgroundColor: COLORS.brandGreen,
    borderColor: COLORS.brandGreen,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.ink,
    lineHeight: 16,
  },
  acceptBtn: {
    height: 50,
    borderRadius: RADIUS.button,
    backgroundColor: COLORS.brandDarkGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: FONTS.body,
    fontFamily: FONTS.extraBold,
    color: '#FFFFFF',
  },
});
