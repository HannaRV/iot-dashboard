# Running the Wokwi Simulator

## Prerequisites

- Wokwi VS Code extension installed and licensed
- `firmware.bin` (MicroPython for ESP32) downloaded from
  https://micropython.org/download/ESP32_GENERIC/ and placed in this folder
- `mpremote` installed: `pip install mpremote`

## Run the simulation

1. Open `diagram.json` in VS Code.
2. Press `F1` and select **Wokwi: Start Simulator**.
3. Wait until the simulated ESP32 boots and the REPL shows `>>>`.
4. **In a PowerShell terminal** (not in the REPL), run:

```powershell
   mpremote connect port:rfc2217://localhost:4000 sleep 3 mount wokwi run wokwi/main.py
```

That's it. The script runs immediately, mounting this folder as the device's
filesystem. No file transfer, no soft-reset, no manual REPL interaction needed.

## Stop the simulation

Press `Ctrl+C` in the PowerShell terminal where mpremote is running, then stop
the Wokwi simulator from VS Code.

## Why `mount` instead of `fs cp`?

The school's documentation suggests using `mpremote fs cp` to transfer files
to the simulated ESP32. On Windows, this triggers an automatic soft-reset that
crashes the simulator into download mode (the `OSError: ENOENT` issue
discussed during the workshop).

`mpremote mount` avoids the soft-reset entirely by exposing the local folder
as the device's filesystem at runtime. Confirmed working on Windows 11 + VS
Code Wokwi extension + Python 3.13.