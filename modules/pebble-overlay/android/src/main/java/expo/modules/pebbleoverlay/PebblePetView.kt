package expo.modules.pebbleoverlay

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import kotlin.math.sin

class PebblePetView(
  context: Context,
  private val params: WindowManager.LayoutParams,
  private val windowManager: WindowManager,
  private val onTap: () -> Unit
) : View(context) {
  var dragging = false
  var phase = 0
  var sitting = false
  var facing = 1

  private var downRawX = 0f
  private var downRawY = 0f
  private var startX = 0
  private var startY = 0
  private var moved = false

  private val body = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#FFB489") }
  private val belly = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#FFE3D2") }
  private val ink = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#3A2718") }
  private val blush = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#FF8D86") }
  private val leaf = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#3E9B4A") }
  private val accent = Paint(Paint.ANTI_ALIAS_FLAG)
  private val ground = Paint(Paint.ANTI_ALIAS_FLAG)

  override fun onTouchEvent(event: MotionEvent): Boolean {
    when (event.action) {
      MotionEvent.ACTION_DOWN -> {
        dragging = true
        moved = false
        downRawX = event.rawX
        downRawY = event.rawY
        startX = params.x
        startY = params.y
      }
      MotionEvent.ACTION_MOVE -> {
        val dx = (event.rawX - downRawX).toInt()
        val dy = (event.rawY - downRawY).toInt()
        if (kotlin.math.abs(dx) > 12 || kotlin.math.abs(dy) > 12) moved = true
        params.x = startX + dx
        params.y = startY + dy
        try {
          windowManager.updateViewLayout(this, params)
        } catch (_: Exception) {
          // Window gone.
        }
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        dragging = false
        if (!moved && event.action == MotionEvent.ACTION_UP) onTap()
      }
    }
    return true
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    val w = width.toFloat()
    val h = height.toFloat()
    ground.color = backgroundColor()
    canvas.drawRoundRect(6f, 18f, w - 6f, h - 8f, 28f, 28f, ground)

    val bob = if (sitting) 4f else sin(phase / 6f) * 6f
    val cx = w / 2f + if (facing < 0) -2f else 2f
    val cy = h * 0.58f + bob

    if (PebbleOutfit.plant != null) drawPlant(canvas, 18f, cy)
    if (PebbleOutfit.furniture == "furn-lamp") drawLamp(canvas, w - 28f, cy)
    if (PebbleOutfit.furniture == "furn-rug") {
      accent.color = Color.parseColor("#E07A5F")
      canvas.drawOval(cx - 36f, cy + 34f, cx + 36f, cy + 48f, accent)
    }

    canvas.drawOval(cx - 34f, cy - 28f, cx + 34f, cy + 30f, body)
    canvas.drawOval(cx - 18f, cy + 2f, cx + 18f, cy + 22f, belly)
    canvas.drawCircle(cx - 10f, cy - 6f, 3.2f, ink)
    canvas.drawCircle(cx + 10f, cy - 6f, 3.2f, ink)
    canvas.drawCircle(cx - 14f, cy + 2f, 3f, blush)
    canvas.drawCircle(cx + 14f, cy + 2f, 3f, blush)
    ink.style = Paint.Style.STROKE
    ink.strokeWidth = 2.4f
    val smile = Path().apply {
      moveTo(cx - 6f, cy + 6f)
      quadTo(cx, cy + 12f, cx + 6f, cy + 6f)
    }
    canvas.drawPath(smile, ink)
    ink.style = Paint.Style.FILL
    drawHat(canvas, cx, cy - 30f)
  }

  private fun backgroundColor(): Int = when (PebbleOutfit.background) {
    "bg-sunrise" -> Color.parseColor("#FFE0B0")
    "bg-meadow" -> Color.parseColor("#D7F3C8")
    "bg-night" -> Color.parseColor("#2C335F")
    "bg-beach" -> Color.parseColor("#D7F1FF")
    else -> Color.parseColor("#FFF1DE")
  }

  private fun drawHat(canvas: Canvas, x: Float, y: Float) {
    when (PebbleOutfit.hat) {
      "hat-party" -> {
        accent.color = Color.parseColor("#FF6B4A")
        val path = Path().apply {
          moveTo(x, y - 26f)
          lineTo(x + 16f, y)
          lineTo(x - 16f, y)
          close()
        }
        canvas.drawPath(path, accent)
      }
      "hat-crown" -> {
        accent.color = Color.parseColor("#F0B429")
        val path = Path().apply {
          moveTo(x - 16f, y)
          lineTo(x - 10f, y - 16f)
          lineTo(x, y - 4f)
          lineTo(x + 10f, y - 16f)
          lineTo(x + 16f, y)
          close()
        }
        canvas.drawPath(path, accent)
      }
      "hat-beanie" -> {
        accent.color = Color.parseColor("#3D8ECA")
        canvas.drawOval(x - 18f, y - 18f, x + 18f, y + 6f, accent)
        accent.color = Color.parseColor("#F4E7C5")
        canvas.drawCircle(x, y - 18f, 5f, accent)
      }
      "hat-sprout" -> {
        leaf.strokeWidth = 3f
        leaf.style = Paint.Style.STROKE
        canvas.drawLine(x, y, x, y - 16f, leaf)
        leaf.style = Paint.Style.FILL
        canvas.drawOval(x - 12f, y - 20f, x, y - 12f, leaf)
      }
    }
  }

  private fun drawPlant(canvas: Canvas, x: Float, y: Float) {
    accent.color = Color.parseColor("#C47B4A")
    canvas.drawRect(x, y + 8f, x + 16f, y + 22f, accent)
    leaf.style = Paint.Style.FILL
    if (PebbleOutfit.plant == "plant-cactus") {
      canvas.drawRoundRect(x + 3f, y - 16f, x + 13f, y + 10f, 6f, 6f, leaf)
    } else {
      canvas.drawCircle(x + 4f, y, 8f, leaf)
      canvas.drawCircle(x + 12f, y - 4f, 8f, leaf)
    }
  }

  private fun drawLamp(canvas: Canvas, x: Float, y: Float) {
    accent.color = Color.parseColor("#FFE7A0")
    canvas.drawCircle(x, y - 8f, 10f, accent)
    accent.color = Color.parseColor("#C47B4A")
    canvas.drawRect(x - 1.5f, y, x + 1.5f, y + 22f, accent)
  }
}
