#!/bin/bash

AVD_NAME=$(emulator -list-avds | head -n 1)

if [ -z "$AVD_NAME" ]; then
  echo "No AVDs found. Please create one with 'avdmanager'."
  exit 1
fi

echo "Starting emulator: $AVD_NAME"
emulator -avd "$AVD_NAME" >/dev/null 2>/dev/null &

EMULATOR_PID=$!
adb wait-for-device
echo "Setting up port forwarding..."
adb forward tcp:8000 tcp:8000
echo "Emulator is ready."

wait $EMULATOR_PID