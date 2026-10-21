package expo.modules.pebbleoverlay

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PebbleOverlayModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PebbleOverlay")

    Function("canDrawOverlays") {
      Settings.canDrawOverlays(context)
    }

    Function("openPermissionSettings") {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${context.packageName}")
      )
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("isRunning") {
      PebbleOverlayService.running
    }

    AsyncFunction("start") { options: Map<String, Any?> ->
      PebbleOutfit.apply(options)
      if (!Settings.canDrawOverlays(context)) {
        throw Exception("Allow Pebble to display over other apps, then try again.")
      }
      val intent = Intent(context, PebbleOverlayService::class.java).apply {
        action = PebbleOverlayService.ACTION_START
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    AsyncFunction("update") { options: Map<String, Any?> ->
      PebbleOutfit.apply(options)
      PebbleOverlayService.refresh()
    }

    AsyncFunction("stop") {
      val intent = Intent(context, PebbleOverlayService::class.java).apply {
        action = PebbleOverlayService.ACTION_STOP
      }
      context.startService(intent)
    }
  }
}

object PebbleOutfit {
  @Volatile var hat: String? = null
  @Volatile var plant: String? = null
  @Volatile var furniture: String? = null
  @Volatile var background: String? = null

  fun apply(options: Map<String, Any?>) {
    hat = text(options["hat"])
    plant = text(options["plant"])
    furniture = text(options["furniture"])
    background = text(options["background"])
  }

  private fun text(value: Any?): String? {
    val raw = value as? String
    return if (raw.isNullOrBlank()) null else raw
  }
}
