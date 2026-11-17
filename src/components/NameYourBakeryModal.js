import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, FONTS } from '../theme/colors';
import { PrimaryButton } from './UI';

export const COLOR_SWATCHES = [
  { id: 'darkGreen', color: '#0F382C', label: 'Dark Forest' },
  { id: 'emerald', color: '#10B981', label: 'Emerald' },
  { id: 'amber', color: '#D97706', label: 'Artisan Amber' },
  { id: 'cobalt', color: '#3B82F6', label: 'Cobalt Blue' },
  { id: 'violet', color: '#8B5CF6', label: 'Royal Violet' },
];

export default function NameYourBakeryModal({
  visible,
  initialName = '',
  initialColor = '',
  onSave,
  onClose,
}) {
  const [name, setName] = useState(initialName || '');
  const [selectedColor, setSelectedColor] = useState(initialColor || '#0F382C');

  useEffect(() => {
    if (visible) {
      setName(initialName || '');
      setSelectedColor(initialColor || '#0F382C');
    }
  }, [visible, initialName, initialColor]);

  const handleContinue = () => {
    const finalName = name.trim() || 'My Bakery';
    if (onSave) onSave(finalName, selectedColor);
    if (onClose) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetCard}>
          {/* Progress / Accent Bar in Selected Brand Color */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { backgroundColor: selectedColor }]} />
          </View>

          {/* Top Row with Close Button */}
          <View style={styles.sheetHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Name your bakery</Text>
              <Text style={styles.subtitle}>
                Customize your terminal header, receipts, and customer documents.
              </Text>
            </View>
            {onClose && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Bakery Name Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>BAKERY NAME</Text>
              <View style={styles.inputBox}>
                <Ionicons name="storefront-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Arada Artisan Bakery"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Brand Color Swatches */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>BRAND COLOR THEME</Text>
              <View style={styles.swatchRow}>
                {COLOR_SWATCHES.map((sw) => {
                  const active = selectedColor === sw.color;
                  return (
                    <TouchableOpacity
                      key={sw.id}
                      style={[
                        styles.swatchBtn,
                        { backgroundColor: sw.color },
                        active && styles.swatchBtnActive,
                      ]}
                      onPress={() => setSelectedColor(sw.color)}
                      activeOpacity={0.8}
                    >
                      {active ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Live Receipt Preview with Dynamic Name & Brand Color */}
            <View style={styles.receiptSection}>
              <Text style={styles.receiptSectionLabel}>LIVE RECEIPT PREVIEW</Text>
              <View style={styles.receiptCard}>
                <View style={styles.receiptHeader}>
                  <Text style={[styles.receiptBakeryName, { color: selectedColor }]} numberOfLines={1}>
                    {name.trim() || 'Your Bakery Name'}
                  </Text>
                  <Text style={styles.receiptSub}>Order ID: #ORD-0012</Text>
                  <Text style={styles.receiptSub}>Date: Nov 9, 2026, 7:17 AM</Text>
                  <Text style={styles.receiptSub}>Payment Type: Cash</Text>
                </View>

                <View style={styles.dashedLine} />

                <View style={styles.receiptItemRow}>
                  <Text style={styles.receiptItemText}>1x Honey Walnut Baklava</Text>
                  <Text style={styles.receiptItemPrice}>ETB 60.00</Text>
                </View>
                <View style={styles.receiptItemRow}>
                  <Text style={styles.receiptItemText}>2x Crispy Honey Fetira</Text>
                  <Text style={styles.receiptItemPrice}>ETB 157.50</Text>
                </View>

                <View style={styles.dashedLine} />

                <View style={styles.receiptItemRow}>
                  <Text style={styles.receiptItemText}>Subtotal</Text>
                  <Text style={styles.receiptItemPrice}>ETB 217.50</Text>
                </View>

                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>TOTAL</Text>
                  <Text style={[styles.receiptTotalVal, { color: selectedColor }]}>ETB 217.50</Text>
                </View>
                <Text style={styles.receiptFooter}>For internal purpose only</Text>
              </View>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: selectedColor }]}
              onPress={handleContinue}
              activeOpacity={0.88}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 31, 23, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '90%',
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    width: '100%',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    width: '60%',
    borderRadius: 2,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  title: {
    fontSize: 22,
    fontFamily: FONTS.extraBold,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 17,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  fieldGroup: {
    marginTop: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.8,
    color: '#64748B',
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#0F172A',
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 4,
  },
  swatchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  swatchBtnActive: {
    borderWidth: 3,
    borderColor: '#0F172A',
    transform: [{ scale: 1.08 }],
  },
  receiptSection: {
    marginTop: 20,
  },
  receiptSectionLabel: {
    fontSize: 11,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.8,
    color: '#64748B',
    marginBottom: 8,
  },
  receiptCard: {
    backgroundColor: '#FAFAF9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderStyle: 'dashed',
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  receiptBakeryName: {
    fontSize: 16,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.5,
  },
  receiptSub: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: '#78716C',
    marginTop: 1,
  },
  dashedLine: {
    height: 1,
    backgroundColor: '#D6D3D1',
    marginVertical: 10,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  receiptItemText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#1C1917',
  },
  receiptItemPrice: {
    fontSize: 12,
    fontFamily: FONTS.extraBold,
    color: '#1C1917',
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  receiptTotalLabel: {
    fontSize: 13,
    fontFamily: FONTS.extraBold,
    color: '#1C1917',
  },
  receiptTotalVal: {
    fontSize: 16,
    fontFamily: FONTS.extraBold,
  },
  receiptFooter: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: '#78716C',
    textAlign: 'center',
    marginTop: 10,
  },
  continueBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...SHADOWS.card,
  },
  continueBtnText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
});
