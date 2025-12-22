#!/bin/bash

AVD_NAME=$(emulator -list-avds | head -n 1)

if [ -z "$AVD_NAME" ]; then
  echo "No AVDs found. Please create one with 'avdmanager'."
  exit 1
fi

# if -c is passed, do cold boot
if [ "$1" == "-c" ]; then
  BOOT_OPTION="-no-snapshot-load"
else
  BOOT_OPTION=""
fi

echo "Starting emulator: $AVD_NAME"
emulator -avd "$AVD_NAME" $BOOT_OPTION >/dev/null 2>/dev/null &

EMULATOR_PID=$!
adb wait-for-device
echo "Setting up port forwarding..."
adb reverse tcp:8000 tcp:8000
echo "Emulator is ready."

wait $EMULATOR_PID