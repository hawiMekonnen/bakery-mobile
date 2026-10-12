import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
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
  const [acceptedDate, setAcceptedDate] = useState(null);

  useEffect(() => {
    if (visible) {
      checkExistingAcceptance();
    }
  }, [visible]);

  const checkExistingAcceptance = async () => {
    try {
      const raw = await AsyncStorage.getItem(EULA_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setAcceptedDate(parsed.acceptedAt ? new Date(parsed.acceptedAt).toLocaleDateString() : 'Active');
        if (!isFirstTimeSetup) {
          setAgreed(true);
        }
      }
    } catch (e) {}
  };

  const handleConfirmAccept = async () => {
    if (!agreed) {
      Alert.alert('Agreement Required', 'Please check the box confirming you have read and agree to the EULA & Terms of Service.');
      return;
    }

    try {
      const record = {
        accepted: true,
        acceptedAt: new Date().toISOString(),
        version: '1.0',
        licensor: 'SkyKin Technologies PLC',
      };
      await AsyncStorage.setItem(EULA_STORAGE_KEY, JSON.stringify(record));
      setAcceptedDate(new Date().toLocaleDateString());
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
      animationType="slide"
      onRequestClose={() => {
        if (!isFirstTimeSetup && onClose) onClose();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.badgeIcon}>
                <Ionicons name="shield-checkmark" size={22} color="#1D4ED8" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.companyRow}>
                  <Text style={styles.companyTag}>SKYKIN TECHNOLOGIES PLC</Text>
                  {acceptedDate && (
                    <View style={styles.statusChip}>
                      <Text style={styles.statusChipText}>Active License</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.title}>EULA & Terms of Service</Text>
                <Text style={styles.subtitle}>
                  Internal POS & Operational Disclaimer
                </Text>
              </View>
            </View>
            {!isFirstTimeSetup && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Scrollable Content */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={true}>
            {/* Regulatory Alert Banner */}
            <View style={styles.alertCard}>
              <View style={styles.alertHeaderRow}>
                <Ionicons name="alert-circle" size={18} color="#B45309" style={{ marginRight: 6 }} />
                <Text style={styles.alertTitle}>Important Legal & Regulatory Notice</Text>
              </View>
              <Text style={styles.alertDesc}>
                This software is provided strictly as an internal inventory, management, and sales-tracking tool. It is NOT an official tax machine or registered fiscal cash register (ERCA / Ministry of Revenue). Receipts generated are for internal order tracking and do not constitute fiscal tax invoices.
              </Text>
            </View>

            {/* Quick Policy Highlights */}
            <View style={styles.highlightsRow}>
              <View style={styles.highlightCard}>
                <Ionicons name="document-text-outline" size={20} color="#2563EB" />
                <Text style={styles.highlightTitle}>License Only</Text>
                <Text style={styles.highlightSub}>Single-shop license. Software ownership remains with SkyKin Tech.</Text>
              </View>

              <View style={styles.highlightCard}>
                <Ionicons name="server-outline" size={20} color="#16A34A" />
                <Text style={styles.highlightTitle}>Data Ownership</Text>
                <Text style={styles.highlightSub}>Client owns 100% of data. Responsible for regular backups.</Text>
              </View>
            </View>

            {/* Full Agreement Text */}
            <View style={styles.legalBox}>
              <Text style={styles.legalHeading}>END-USER LICENSE AGREEMENT (EULA) & TERMS OF SERVICE</Text>
              <Text style={styles.legalNotice}>
                IMPORTANT: PLEASE READ THIS AGREEMENT CAREFULLY BEFORE INSTALLING, ACCESSING, OR USING THIS POINT-OF-SALE (POS) SOFTWARE. BY INSTALLING, ACCESSING, OR USING THE SOFTWARE, YOU ("LICENSEE" OR "USER") AGREE TO BE BOUND BY THE TERMS AND CONDITIONS OF THIS AGREEMENT. IF YOU DO NOT AGREE, DO NOT INSTALL OR USE THE SOFTWARE.
              </Text>

              <Text style={styles.sectionHeader}>1. GRANT OF LICENSE</Text>
              <Text style={styles.legalP}>
                Subject to the terms of this Agreement, SkyKin Technologies PLC ("Licensor") grants you a non-exclusive, non-transferable, revocable, limited license to install and use the internal Point-of-Sale and Inventory Management Application ("Software") solely for your internal business operations at the designated location(s) or device(s) specified in your service contract.
              </Text>

              <Text style={styles.sectionHeader}>2. INTELLECTUAL PROPERTY & RESTRICTIONS</Text>
              <Text style={styles.legalP}>
                • Ownership: The Software, including all source code, algorithms, visual design, database structures, and documentation, is owned exclusively by the Licensor. This Agreement grants a license to use the Software; it does not sell or transfer ownership of the Software.
              </Text>
              <Text style={styles.legalP}>
                • Prohibited Actions: You shall not, directly or indirectly:
                {"
"}  - Copy, modify, translate, or create derivative works based on the Software.
                {"
"}  - Reverse-engineer, decompile, disassemble, or attempt to derive the source code of the Software.
                {"
"}  - Rent, lease, sublicense, resell, or distribute the Software to any third party.
                {"
"}  - Remove, alter, or obscure any copyright, trademark, or proprietary notices on the Software.
              </Text>

              <Text style={styles.sectionHeader}>3. TAX & FISCAL REGULATORY COMPLIANCE DISCLAIMER</Text>
              <Text style={styles.legalP}>
                • Internal Tool Purpose: This Software is designed, licensed, and provided solely as an internal business operations, sales tracking, and inventory control tool.
              </Text>
              <Text style={styles.legalP}>
                • No Tax Machine / Fiscal Registration: Unless explicitly stated in a separate written agreement with Licensor, this Software is not integrated with, registered with, or certified by any government tax or revenue authority (including the Ministry of Revenue / ERCA).
              </Text>
              <Text style={styles.legalP}>
                • Receipts & Invoices: Receipts, dockets, order slips, or reports generated by this Software are intended strictly for internal management and customer tracking purposes. They do not constitute legal fiscal tax invoices or tax register receipts.
              </Text>
              <Text style={styles.legalP}>
                • Licensee Responsibility: The Licensee acknowledges and agrees that it is solely responsible for:
                {"
"}  - Complying with all applicable local tax laws, VAT regulations, and statutory reporting obligations.
                {"
"}  - Procuring, maintaining, and using government-certified fiscal printers or register devices if required by local law for their business operations.
                {"
"}  - Ensuring that the use of non-fiscal software aligns with their regulatory status.
              </Text>

              <Text style={styles.sectionHeader}>4. DATA ACCURACY, LOSS, AND BACKUPS</Text>
              <Text style={styles.legalP}>
                • Data Accuracy: The Software relies entirely on data entered by the Licensee, its employees, or agents. Licensor is not responsible for errors in sales data, inventory discrepancies, miscalculated margins, financial reporting errors, or cash drawer shortfalls resulting from incorrect data entry or operational errors.
              </Text>
              <Text style={styles.legalP}>
                • Data Ownership: All business data entered into the Software remains the sole property of the Licensee.
              </Text>
              <Text style={styles.legalP}>
                • Data Backups & Recovery: If the Software operates on a local device or network, the Licensee is solely responsible for creating and maintaining regular backup copies of its database and transaction history. Licensor is not liable for data loss caused by hardware failure, malware, power loss, accidental deletion, or failure to perform backups.
              </Text>

              <Text style={styles.sectionHeader}>5. SYSTEM SECURITY & ACCESS</Text>
              <Text style={styles.legalP}>
                • Account Credentials: The Licensee is responsible for safeguarding administrative login credentials, user PINs, and access keys created within the Software.
              </Text>
              <Text style={styles.legalP}>
                • Unauthorized Access: Licensor is not liable for unauthorized access, internal theft, or data tampering caused by weak passwords, shared accounts, or compromised local networks.
              </Text>

              <Text style={styles.sectionHeader}>6. DISCLAIMER OF WARRANTIES ("AS-IS")</Text>
              <Text style={styles.legalP}>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SOFTWARE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITH ALL FAULTS AND WITHOUT WARRANTY OF ANY KIND. LICENSOR EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. LICENSOR DOES NOT WARRANT THAT THE SOFTWARE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE FROM TECHNICAL DEFECTS.
              </Text>

              <Text style={styles.sectionHeader}>7. LIMITATION OF LIABILITY</Text>
              <Text style={styles.legalP}>
                • Exclusion of Damages: IN NO EVENT SHALL LICENSOR BE LIABLE TO LICENSEE OR ANY THIRD PARTY FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES (INCLUDING LOSS OF PROFITS, LOSS OF REVENUE, LOSS OF DATA, OR BUSINESS INTERRUPTION) ARISING OUT OF OR IN CONNECTION WITH THE USE OR INABILITY TO USE THE SOFTWARE.
              </Text>
              <Text style={styles.legalP}>
                • Liability Cap: IN ALL CIRCUMSTANCES, LICENSOR'S AGGREGATE LIABILITY ARISING FROM OR RELATED TO THIS AGREEMENT SHALL NOT EXCEED THE TOTAL AMOUNT ACTUALLY PAID BY THE LICENSEE TO LICENSOR FOR THE SOFTWARE LICENSE FEE IN THE THREE (3) MONTHS PRECEDING THE CLAIM.
              </Text>

              <Text style={styles.sectionHeader}>8. SUPPORT AND MAINTENANCE</Text>
              <Text style={styles.legalP}>
                • Included Support: Technical support, updates, and maintenance shall be provided only in accordance with the specific Support Level Agreement (SLA) or Service Contract agreed upon between Licensor and Licensee.
              </Text>
              <Text style={styles.legalP}>
                • Excluded Support: Support does not cover hardware failures, network infrastructure issues outside the Software, OS updates that break compatibility, or issues resulting from unauthorized modifications to the environment.
              </Text>

              <Text style={styles.sectionHeader}>9. TERMINATION</Text>
              <Text style={styles.legalP}>
                • Termination for Breach: Licensor may immediately terminate this License if Licensee breaches any material term of this Agreement (including non-payment of subscription fees or unauthorized distribution).
              </Text>
              <Text style={styles.legalP}>
                • Effect of Termination: Upon termination, Licensee shall immediately cease all use of the Software and delete or destroy all copies of the Software in its possession.
              </Text>

              <Text style={styles.sectionHeader}>10. GOVERNING LAW AND JURISDICTION</Text>
              <Text style={styles.legalP}>
                This Agreement shall be governed by and construed in accordance with the laws of the Federal Democratic Republic of Ethiopia. Any disputes arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the competent courts located in Addis Ababa.
              </Text>

              <View style={styles.summaryFooterBox}>
                <Text style={styles.summaryFooterTitle}>ACKNOWLEDGMENT & ACCEPTANCE</Text>
                <Text style={styles.summaryFooterText}>
                  By checking the "I Agree" box, clicking "Accept", or using this Software, you confirm that:
                  {"
"}1. You have read, understood, and agreed to all terms of this Agreement.
                  {"
"}2. You have the authority to bind the business or entity adopting this Software.
                  {"
"}3. You acknowledge that this Software is an internal management tool and does not replace statutory tax registration or fiscal invoicing requirements.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Acceptance Checkbox & Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreed(!agreed)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                {agreed && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I accept the SkyKin Technologies PLC EULA, Terms of Service, and Non-Fiscal Disclaimers.
              </Text>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              {!isFirstTimeSetup && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                >
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.acceptBtn, (!agreed && isFirstTimeSetup) && styles.acceptBtnDisabled]}
                onPress={handleConfirmAccept}
                disabled={!agreed && isFirstTimeSetup}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.acceptBtnText}>
                  {isFirstTimeSetup ? 'Accept & Continue to POS' : 'Confirm Agreement'}
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
    padding: 16,
  },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    padding: 20,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  companyTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  statusChip: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
  },
  statusChipText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#15803D',
  },
  title: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSubtle,
  },
  body: {
    marginBottom: 14,
  },
  alertCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 12,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  alertDesc: {
    fontSize: 10,
    color: '#78350F',
    lineHeight: 15,
  },
  highlightsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  highlightCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 10,
  },
  highlightTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
    marginBottom: 2,
  },
  highlightSub: {
    fontSize: 9,
    color: COLORS.textMuted,
    lineHeight: 13,
  },
  legalBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 6,
  },
  legalHeading: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  legalNotice: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 13,
    marginBottom: 12,
    fontStyle: 'italic',
    textAlign: 'justify',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 10,
    marginBottom: 4,
  },
  legalP: {
    fontSize: 9.5,
    color: '#334155',
    lineHeight: 14,
    marginBottom: 6,
    textAlign: 'justify',
  },
  summaryFooterBox: {
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: RADIUS.sm,
    padding: 10,
    marginTop: 12,
  },
  summaryFooterTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D28D9',
    marginBottom: 4,
  },
  summaryFooterText: {
    fontSize: 9,
    color: '#5B21B6',
    lineHeight: 13,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.xs,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: COLORS.surface,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 14,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
    flex: 1,
  },
  acceptBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
});
