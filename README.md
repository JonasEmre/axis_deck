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

- Keyboard/pynput adapter eklemek.
- vJoy/pyvjoy adapter ile gerçek analog axis emülasyonu yapmak.
- Oyun preset yapısını tasarlamak.
