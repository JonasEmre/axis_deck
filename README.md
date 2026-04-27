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
.\start.ps1
```

PowerShell script policy hata verirse aynı komutu CMD wrapper ile çalıştır:

```powershell
.\start.cmd
```

PC üzerinde:

```text
http://127.0.0.1:<port>
```

Aynı Wi-Fi ağındaki tablet üzerinde:

```text
http://<pc-ip>:<port>
```

`start.ps1` varsayılan olarak vJoy adapter ile başlar. `8000` doluysa otomatik olarak `8001`, `8002` gibi ilk boş portu seçer ve konsola doğru PC/tablet adreslerini yazar.

Varsayılan çalıştırma tek server süreci açar. Kod değişikliklerini otomatik yeniden yükleyen geliştirme modu istersen:

```powershell
.\start.ps1 -Reload
```

Sadece log/test modunda çalıştırmak için:

```powershell
.\start.ps1 -Adapter log
```

Settings içindeki `Game` seçimi oyun bazlı gelecek ayarlar için kullanılır; `Motor Town` ve `BeamNG.drive` ayrımı şimdiden korunur.

`Gearbox Output` vites button davranışını belirler:

- `Hold`: Vites button'u seçili viteste basılı kalır; sürüş için varsayılan moddur.
- `Pulse`: Vites button'u kısa pulse edilir ve sonra bırakılır; BeamNG bind ayarı yaparken kullanılabilir.

`Hold` modda direkt vites-vites geçişlerinde eski vites bırakılır, kısa bir boş aralık gönderilir ve sonra yeni vites basılır. Bu, BeamNG gibi geçiş sırasına hassas oyunlarda sürüş sırasında vites değişimini daha güvenilir yapar.

`Steering Feel` direksiyonun parmak hareketine tepkisini belirler:

- `Direct`: Parmak hareketi direksiyon açısına doğrudan uygulanır.
- `Smooth`: Hedef açıya yumuşak yaklaşır, hızlı savrulmayı azaltır.
- `Heavy`: Daha yavaş ve dirençli his verir; yüksek hız hissi için daha kontrollüdür.

Gaz, fren ve debriyaj pedalları hedef değeri parmak altında hemen gösterir; oyuna gönderilen axis değeri ise kısa bir smoothing ile hedefe yaklaşır.

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
.\start.ps1
```

Farklı vJoy device ID kullanmak için:

```powershell
.\start.ps1 -VJoyDeviceId 2
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
- Neutral -> vJoy Button 1 (oyunda/monitorlerde Button 0 olarak gorunebilir)
- Gear 1-6 -> vJoy Button 2-7
- Truck 5L/5H/6L/6H/7L/7H/8L/8H -> vJoy Button 8-15
- Reverse -> vJoy Button 16
- Truck R1/R2/L -> vJoy Button 17-19
- Handbrake/Start/Lights/Horn -> vJoy Button 20-23
- Left/Right signal -> vJoy Button 24-25
- Hazards -> vJoy Button 26

vJoy Config içinde Device 1 için `X`, `Y`, `Z`, `Rz`, `Slider 0` ve en az `26` button aktif olmalı.

Gearbox Type ayarları:

- `5 Speed`: Varsayılan 1-5 + R H vites düzeni.
- `6 Speed`: 1-6 H vites düzeni; reverse ayrı büyük `R` toggle ile seçilir.
- `Truck H Range/Splitter`: H slotları + tek `Range` ve tek `Splitter` toggle ile final vitesi gönderir.
- `Truck Direct`: R2, R1, L, 1, 2, 3, 4, 5L-8H sonucunu direkt seçtirir; vJoy'a final vites button'u gönderilir.
