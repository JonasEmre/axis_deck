# AxisDeck

Tablet tarayıcısından gelen joystick, throttle ve buton durumlarını aynı ağdaki Windows PC'ye WebSocket ile gönderen ilk temel sürüm.

## Kurulum

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\pip install -r requirements.txt
```

## Çalıştırma

```powershell
.\.venv\Scripts\uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

PC üzerinde:

```text
http://localhost:8000
```

Aynı Wi-Fi ağındaki tablet üzerinde:

```text
http://<pc-ip>:8000
```

Windows IP adresini görmek için:

```powershell
ipconfig
```

## İlk Milestone

- `/` adresinden tablet kontrol paneli servis edilir.
- `/ws/control` WebSocket endpoint'i kontrol state mesajlarını alır.
- Gelen axis ve button verileri Pydantic ile doğrulanır.
- Geçerli veriler şimdilik konsola loglanır.
- Frontend bağlantı koparsa otomatik yeniden bağlanır.

## Mesaj Formatı

```json
{
  "type": "control_state",
  "clientId": "tablet-1",
  "timestamp": 1710000000000,
  "axes": {
    "joystickX": 0.0,
    "joystickY": 0.0,
    "throttle": 0.0
  },
  "buttons": {
    "fire": false,
    "gear": false
  }
}
```

## Sonraki Adımlar

- vJoy'u Windows'ta aktif edip `AXISDECK_INPUT_ADAPTER=vjoy` ile gerçek analog axis emülasyonunu test etmek.
- Oyun preset yapısını tasarlamak.

## vJoy Test Modu

vJoy Device 1 aktifse backend'i vJoy adapter ile başlat:

```powershell
$env:AXISDECK_INPUT_ADAPTER="vjoy"
.\.venv\Scripts\uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Windows test panelini aç:

```powershell
joy.cpl
```

Beklenen mapping:

- Steering/joystick X -> vJoy X Axis
- Joystick Y -> vJoy Y Axis
- Clutch -> vJoy Slider 0
- Throttle -> vJoy Z Axis
- Brake -> vJoy Rz Axis
- Gear 1-5 + Reverse -> vJoy Button 1-6
- Handbrake/Start/Lights/Horn -> vJoy Button 7-10
- Left/Right signal -> vJoy Button 11-12
- Hazards -> vJoy Button 13

vJoy Config içinde Device 1 için `X`, `Y`, `Z`, `Rz`, `Slider 0` ve en az `13` button aktif olmalı.
