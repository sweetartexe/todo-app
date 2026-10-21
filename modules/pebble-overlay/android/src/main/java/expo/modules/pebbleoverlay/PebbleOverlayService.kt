package expo.modules.pebbleoverlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.WindowManager

class PebbleOverlayService : Service() {
  private lateinit var windowManager: WindowManager
  private var petView: PebblePetView? = null
  private var params: WindowManager.LayoutParams? = null
  private val handler = Handler(Looper.getMainLooper())
  private var direction = 1
  private var step = 0
  private var sitting = false
  private var sitTicks = 0

  private val walk = object : Runnable {
    override fun run() {
      val view = petView ?: return
      val layout = params ?: return
      if (!view.dragging) {
        if (sitting) {
          sitTicks -= 1
          if (sitTicks <= 0) sitting = false
        } else {
          layout.x += direction * dp(2)
          val maxX = resources.displayMetrics.widthPixels - layout.width
          if (layout.x <= 0 || layout.x >= maxX) {
            direction *= -1
            layout.x = layout.x.coerceIn(0, maxX.coerceAtLeast(0))
            sitting = true
            sitTicks = 50
          } else if (step % 160 == 0) {
            sitting = true
            sitTicks = 45
          }
          try {
            windowManager.updateViewLayout(view, layout)
          } catch (_: Exception) {
            // The window was removed.
          }
        }
      }
      step += 1
      view.phase = step
      view.sitting = sitting
      view.facing = direction
      view.invalidate()
      handler.postDelayed(this, 40)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    instance = this
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      teardown()
      stopForegroundCompat()
      stopSelf()
      return START_NOT_STICKY
    }
    startInForeground()
    if (petView == null) showPet()
    running = true
    handler.removeCallbacks(walk)
    handler.post(walk)
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    teardown()
    if (instance == this) instance = null
    super.onDestroy()
  }

  private fun showPet() {
    val width = dp(132)
    val height = dp(156)
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_PHONE
    }
    val layout = WindowManager.LayoutParams(
      width,
      height,
      type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT
    )
    layout.gravity = Gravity.TOP or Gravity.START
    layout.x = dp(24)
    layout.y = dp(180)
    val view = PebblePetView(this, layout, windowManager) { openApp() }
    params = layout
    petView = view
    windowManager.addView(view, layout)
  }

  private fun openApp() {
    val launch = packageManager.getLaunchIntentForPackage(packageName) ?: return
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    startActivity(launch)
  }

  private fun teardown() {
    handler.removeCallbacks(walk)
    petView?.let { view ->
      try {
        windowManager.removeView(view)
      } catch (_: Exception) {
        // Already gone.
      }
    }
    petView = null
    params = null
    running = false
  }

  private fun startInForeground() {
    val channelId = "pebble-overlay"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(channelId, "Pebble", NotificationManager.IMPORTANCE_LOW)
      channel.description = "Shows while Pebble is walking on your screen"
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
    val stopIntent = PendingIntent.getService(
      this,
      1,
      Intent(this, PebbleOverlayService::class.java).setAction(ACTION_STOP),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, channelId)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }
    val notification = builder
      .setContentTitle("Pebble is nearby")
      .setContentText("Tap the pet to open your lists")
      .setSmallIcon(R.drawable.pebble_notification)
      .setOngoing(true)
      .setContentIntent(stopIntent)
      .build()
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(42, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(42, notification)
    }
  }

  private fun stopForegroundCompat() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  companion object {
    const val ACTION_START = "app.pebble.overlay.START"
    const val ACTION_STOP = "app.pebble.overlay.STOP"

    @Volatile var running: Boolean = false
    @Volatile var instance: PebbleOverlayService? = null

    fun refresh() {
      instance?.petView?.invalidate()
    }
  }
}
