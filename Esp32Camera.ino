#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <base64.h>


// Replace with your network credentials
const char* ssid     = "****"; // CHANGE HERE
const char* password = "****"; // CHANGE HERE

// Server endpoint (change IP/domain and port if needed)
const char* serverURL = "http://192.168.*.*/upload";  // CHANGE YOUR SERVER IP + PORT + "/upload"
// Use porforwarding if you want to use this publicly 

#define uS_TO_S_FACTOR 1000000ULL   // Conversion factor for micro seconds to seconds
#define TIME_TO_SLEEP  30             // Time ESP32 will go to sleep (in seconds)
#define FailedConnectionsBeforeSleep 10 // How many times esp32 try logging to server before going into deep sleep


String username = "espuser";  // CHANGE YOUR LOGIN USER
String Userpass = "esppass";   // CHANGE YOUR LOGIN PASSWORD

String auth = String(username) + ":" + String(Userpass);
String encoded = base64::encode(auth);

// Camera pin configuration for AI Thinker ESP32-CAM
camera_config_t config = {
  .pin_pwdn = 32,
  .pin_reset = -1,
  .pin_xclk = 0,
  .pin_sscb_sda = 26,
  .pin_sscb_scl = 27,
  .pin_d7 = 35,
  .pin_d6 = 34,
  .pin_d5 = 39,
  .pin_d4 = 36,
  .pin_d3 = 21,
  .pin_d2 = 19,
  .pin_d1 = 18,
  .pin_d0 = 5,
  .pin_vsync = 25,
  .pin_href = 23,
  .pin_pclk = 22,
  .xclk_freq_hz = 20000000,
  .ledc_timer = LEDC_TIMER_0,
  .ledc_channel = LEDC_CHANNEL_0,
  .pixel_format = PIXFORMAT_JPEG,
  .frame_size = FRAMESIZE_VGA,  // Options: QVGA, VGA, SVGA, XGA
  .jpeg_quality = 12,           // Lower is better quality (10–20 recommended)
  .fb_count = 1
};

int failedConnectionsToServer = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("Booting...");

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected: " + WiFi.localIP().toString());

  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed! Error 0x%x\n", err);
    while (true);
  }
  Serial.println("Camera initialized.");
  failedConnectionsToServer = 0;
}

void loop()
{
  if (WiFi.status() == WL_CONNECTED)
  {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb)
    {
      Serial.println("Camera capture failed");
      return;
    }

    HTTPClient http;
    http.begin(serverURL);
    http.addHeader("Authorization", "Basic " + encoded);
    http.addHeader("Content-Type", "image/jpeg");
    int httpResponseCode = http.POST(fb->buf, fb->len);
    http.end();
    if (httpResponseCode != 200)
    {
      //Stop stream
      if (httpResponseCode == 201)
      {
            Serial.println("Streaming is disabled by server");
            Serial.println("Entering deep sleep for" + String(TIME_TO_SLEEP) + "seconds");
           
            esp_camera_fb_return(fb);
            esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP * uS_TO_S_FACTOR);
            esp_deep_sleep_start();
      }

      //Retry connecting to server after time
      failedConnectionsToServer++;
      if (failedConnectionsToServer == FailedConnectionsBeforeSleep)
      {
        Serial.println("Failed to connect to server");
        Serial.println("Entering deep sleep for" + String(TIME_TO_SLEEP) + "seconds");
        esp_camera_fb_return(fb);
        esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP * uS_TO_S_FACTOR);
        esp_deep_sleep_start();
      }
    }
    else
    {
      failedConnectionsToServer = 0;
    }
      if (httpResponseCode > 0)
      {
        Serial.printf("Image sent successfully, server response: % d\n", httpResponseCode);
      }
      else
      {
        Serial.printf("Failed to send image. Error: % s\n", http.errorToString(httpResponseCode).c_str());
        Serial.println(httpResponseCode);
      }
      http.end();
      esp_camera_fb_return(fb);
    }
    else
    {
      Serial.println("WiFi disconnected! Reconnecting...");
      WiFi.begin(ssid, password);
    }

    //delay(1000); // optional delay for upluading photos
  }
