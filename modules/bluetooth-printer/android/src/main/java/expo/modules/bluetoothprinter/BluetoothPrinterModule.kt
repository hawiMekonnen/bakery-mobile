package expo.modules.bluetoothprinter

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.OutputStream
import java.util.UUID

class BluetoothPrinterModule : Module() {
  private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
  private var currentSocket: BluetoothSocket? = null
  private var currentOutputStream: OutputStream? = null
  private var currentAddress: String? = null

  override fun definition() = ModuleDefinition {
    Name("BluetoothPrinter")

    AsyncFunction("isBluetoothEnabled") {
      val adapter = BluetoothAdapter.getDefaultAdapter()
      return@AsyncFunction adapter != null && adapter.isEnabled
    }

    AsyncFunction("isConnected") {
      val socket = currentSocket
      return@AsyncFunction socket != null && socket.isConnected
    }

    AsyncFunction("getPairedDevices") {
      val adapter = BluetoothAdapter.getDefaultAdapter() ?: return@AsyncFunction emptyList<Map<String, Any>>()
      val bonded = try {
        adapter.bondedDevices
      } catch (e: SecurityException) {
        null
      } ?: return@AsyncFunction emptyList<Map<String, Any>>()

      val result = ArrayList<Map<String, Any>>()
      for (dev in bonded) {
        val devName = try { dev.name ?: "Unknown Device" } catch (e: SecurityException) { "Unknown Device" }
        val nameLower = devName.lowercase()

        val bClass = dev.bluetoothClass
        val major = bClass?.majorDeviceClass ?: 0

        // Filter audio devices (1024), phones (512), wearables (1792)
        val isAudio = major == 1024 || major == 512 || major == 1792
        val isAudioName = nameLower.contains("airpod") ||
                          nameLower.contains("earbud") ||
                          nameLower.contains("headset") ||
                          nameLower.contains("headphone") ||
                          nameLower.contains("speaker") ||
                          nameLower.contains("soundbar") ||
                          nameLower.contains("tws") ||
                          nameLower.contains("buds")

        val isPrinterName = nameLower.contains("p58") ||
                            nameLower.contains("p80") ||
                            nameLower.contains("pos") ||
                            nameLower.contains("printer") ||
                            nameLower.contains("thermal") ||
                            nameLower.contains("receipt") ||
                            nameLower.contains("rpp") ||
                            nameLower.contains("mpt") ||
                            nameLower.contains("zj") ||
                            nameLower.contains("xp") ||
                            nameLower.contains("goojprt") ||
                            nameLower.contains("58mm") ||
                            nameLower.contains("80mm") ||
                            nameLower.contains("print")

        // 1536 is BluetoothClass.Device.Major.IMAGING (printers)
        val isPrinter = (major == 1536 || isPrinterName) && !isAudio && !isAudioName

        result.add(mapOf(
          "name" to devName,
          "address" to dev.address,
          "isPrinter" to isPrinter,
          "majorClass" to major
        ))
      }
      return@AsyncFunction result
    }

    AsyncFunction("connect") { address: String ->
      return@AsyncFunction connectInternal(address)
    }

    AsyncFunction("printRawData") { base64Data: String ->
      return@AsyncFunction printRawInternal(base64Data)
    }

    AsyncFunction("printToDevice") { address: String, base64Data: String ->
      val ok = connectInternal(address)
      if (!ok) {
        throw Exception("Could not connect to printer at $address. Ensure printer is turned ON and in Bluetooth range.")
      }
      val printed = printRawInternal(base64Data)
      if (!printed) {
        throw Exception("Failed to transmit print bytes to printer at $address.")
      }
      return@AsyncFunction true
    }

    AsyncFunction("disconnect") {
      disconnectInternal()
      return@AsyncFunction true
    }
  }

  private fun connectInternal(address: String): Boolean {
    val adapter = BluetoothAdapter.getDefaultAdapter() ?: return false
    try {
      if (adapter.isDiscovering) {
        adapter.cancelDiscovery()
      }
    } catch (e: SecurityException) {
      // ignore
    }

    val device = try {
      adapter.getRemoteDevice(address)
    } catch (e: Exception) {
      return false
    } ?: return false

    // If already connected to this address and socket is open, verify with test ping
    if (currentAddress == address && currentSocket != null && currentSocket?.isConnected == true && currentOutputStream != null) {
      try {
        currentOutputStream?.write(byteArrayOf(0x1B, 0x40))
        currentOutputStream?.flush()
        return true
      } catch (e: Exception) {
        disconnectInternal()
      }
    } else {
      disconnectInternal()
    }

    var socket: BluetoothSocket? = null

    // Method 1: Standard SPP UUID socket
    try {
      socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
      socket.connect()
    } catch (e1: Exception) {
      socket = null
    }

    // Method 2: Reflection fallback for POS printers that use RFCOMM channel 1 directly
    if (socket == null || !socket.isConnected) {
      try {
        val method = device.javaClass.getMethod("createRfcommSocket", java.lang.Integer.TYPE)
        socket = method.invoke(device, 1) as BluetoothSocket
        socket.connect()
      } catch (e2: Exception) {
        socket = null
      }
    }

    if (socket != null && socket.isConnected) {
      try {
        val stream = socket.outputStream
        // Send ESC/POS initialize command (ESC @) to test transmission
        stream.write(byteArrayOf(0x1B, 0x40))
        stream.flush()

        currentSocket = socket
        currentOutputStream = stream
        currentAddress = address
        return true
      } catch (e: Exception) {
        try { socket.close() } catch (ce: Exception) {}
        currentSocket = null
        currentOutputStream = null
        currentAddress = null
        return false
      }
    }

    return false
  }

  private fun printRawInternal(base64Data: String): Boolean {
    val stream = currentOutputStream ?: return false
    val bytes = try {
      Base64.decode(base64Data, Base64.DEFAULT)
    } catch (e: Exception) {
      return false
    }

    return try {
      stream.write(bytes)
      stream.flush()
      Thread.sleep(150)
      true
    } catch (e: Exception) {
      disconnectInternal()
      false
    }
  }

  private fun disconnectInternal() {
    try {
      currentOutputStream?.close()
    } catch (e: Exception) { }
    try {
      currentSocket?.close()
    } catch (e: Exception) { }
    currentOutputStream = null
    currentSocket = null
    currentAddress = null
  }
}
