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

    AsyncFunction("getPairedDevices") {
      val adapter = BluetoothAdapter.getDefaultAdapter() ?: return@AsyncFunction emptyList<Map<String, String>>()
      val bonded = try {
        adapter.bondedDevices
      } catch (e: SecurityException) {
        null
      } ?: return@AsyncFunction emptyList<Map<String, String>>()

      val result = ArrayList<Map<String, String>>()
      for (dev in bonded) {
        val devName = try { dev.name ?: "Bluetooth Device" } catch (e: SecurityException) { "Bluetooth Device" }
        result.add(mapOf(
          "name" to devName,
          "address" to dev.address
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
        throw Exception("Could not connect to printer at $address. Ensure printer is turned on and paired.")
      }
      val printed = printRawInternal(base64Data)
      if (!printed) {
        throw Exception("Failed to send print bytes to printer at $address.")
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

    disconnectInternal()

    var socket: BluetoothSocket? = null
    try {
      socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
      socket.connect()
    } catch (e: Exception) {
      try {
        val method = device.javaClass.getMethod("createRfcommSocket", java.lang.Integer.TYPE)
        socket = method.invoke(device, 1) as BluetoothSocket
        socket.connect()
      } catch (e2: Exception) {
        socket = null
      }
    }

    if (socket != null && socket.isConnected) {
      currentSocket = socket
      currentOutputStream = socket.outputStream
      currentAddress = address
      return true
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
